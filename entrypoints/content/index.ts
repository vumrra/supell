import {
  MAX_TEXT_LENGTH,
  type SpellCheckRequest,
  type SpellCheckResponse,
  type SpellCheckSuccess,
} from '@/utils/types';
import { SupellUi, type CorrectionActions } from './ui';

const DEBOUNCE_MS = 500;
const TOO_LONG_MESSAGE = '10,000자 이하의 글만 검사할 수 있어요.';

/** 맞춤법 검사가 의미 없는 input 타입 (비밀번호, 숫자 등) */
const EXCLUDED_INPUT_TYPES = new Set([
  'password', 'number', 'tel', 'email', 'url',
  'date', 'time', 'datetime-local', 'month', 'week',
  'range', 'color', 'file', 'checkbox', 'radio',
  'button', 'submit', 'reset', 'hidden', 'image',
]);

type Editable = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

/** 교정을 적용할 대상. 전체 입력창일 수도, 선택 영역일 수도 있다. */
interface EditTarget {
  read(): string;
  write(text: string): void;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    const ui = new SupellUi();
    watchTyping(ui);
    watchSelection(ui);
  },
});

async function requestCheck(text: string): Promise<SpellCheckResponse> {
  const message: SpellCheckRequest = { type: 'spellcheck', text };
  try {
    return await browser.runtime.sendMessage(message);
  } catch {
    // 확장이 리로드/업데이트되면 기존 탭의 콘텐츠 스크립트는
    // 백그라운드와 연결이 끊긴다 (Extension context invalidated)
    return { ok: false, error: 'stale' };
  }
}

/**
 * 교정 목록을 순서대로 현재 텍스트에서 찾아가며, 클릭한 항목만 치환하거나
 * 전체를 교정문으로 바꾼다. 개별 적용 여부를 기억해서 섞어 써도 어긋나지 않는다.
 */
function makeCorrectionActions(target: EditTarget, res: SpellCheckSuccess): CorrectionActions {
  const applied = res.corrections.map(() => false);

  return {
    applyOne(index) {
      if (applied[index]) return true;
      const current = target.read();
      let pos = 0;
      for (let i = 0; i < res.corrections.length; i++) {
        const { original, corrected } = res.corrections[i];
        const needle = applied[i] ? corrected : original;
        const at = current.indexOf(needle, pos);
        if (at === -1) return false; // 검사 후 내용이 바뀐 경우
        if (i === index) {
          target.write(current.slice(0, at) + corrected + current.slice(at + needle.length));
          applied[index] = true;
          return true;
        }
        pos = at + needle.length;
      }
      return false;
    },
    applyAll() {
      target.write(res.corrected);
      applied.fill(true);
    },
  };
}

// ---------- 기능 1: 입력 멈춤 감지 후 자동 검사 ----------

function watchTyping(ui: SupellUi) {
  const timers = new WeakMap<Editable, number>();

  document.addEventListener(
    'input',
    (e) => {
      // 우리가 교정을 적용하며 발생시킨 합성 이벤트는 무시 (모달 유지)
      if (!e.isTrusted) return;
      const el = resolveEditable(e.target);
      if (!el) return;
      ui.hideModal();
      clearTimeout(timers.get(el));
      timers.set(el, window.setTimeout(() => checkElement(ui, el), DEBOUNCE_MS));
    },
    true,
  );
}

async function checkElement(ui: SupellUi, el: Editable) {
  // 검사 대기 중 다른 곳으로 이동했으면 모달을 띄우지 않는다.
  if (document.activeElement !== el && !el.contains(document.activeElement)) return;

  const text = readText(el);
  if (!text.trim()) return;

  const rect = el.getBoundingClientRect();
  if (text.length > MAX_TEXT_LENGTH) {
    ui.showMessage(rect, TOO_LONG_MESSAGE);
    return;
  }

  const res = await requestCheck(text);
  // 응답을 기다리는 동안 내용이 바뀌었으면 결과가 무효
  if (readText(el) !== text) return;

  const actions =
    res.ok && res.corrections.length > 0
      ? makeCorrectionActions({ read: () => readText(el), write: (t) => writeText(el, t) }, res)
      : undefined;
  ui.showResult(el.getBoundingClientRect(), res, actions);
}

function resolveEditable(target: EventTarget | null): Editable | null {
  if (!(target instanceof HTMLElement)) return null;
  if (target instanceof HTMLInputElement) {
    return EXCLUDED_INPUT_TYPES.has(target.type) ? null : target;
  }
  if (target instanceof HTMLTextAreaElement) return target;
  if (target.isContentEditable) {
    let root = target;
    while (root.parentElement?.isContentEditable) root = root.parentElement;
    return root;
  }
  return null;
}

function readText(el: Editable): string {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
    ? el.value
    : el.innerText;
}

function writeText(el: Editable, text: string) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    setNativeValue(el, text);
  } else {
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
}

/** React 등 프레임워크의 controlled input도 인식하도록 네이티브 setter로 값 변경 */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter ? setter.call(el, value) : (el.value = value);
  el.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

// ---------- 기능 2: 텍스트 선택 후 로고 클릭으로 검사 ----------

interface SelectionInfo {
  text: string;
  rect: DOMRect;
  /** 인풋/편집 영역이면 선택 부분에 교정을 적용할 수 있다. 일반 텍스트면 없음 */
  target?: EditTarget;
}

function watchSelection(ui: SupellUi) {
  document.addEventListener('mouseup', (e) => {
    if (ui.containsEvent(e)) return;
    // 클릭 직후 selection 상태가 확정된 뒤 판단
    window.setTimeout(() => {
      const sel = captureSelection();
      if (!sel) {
        ui.hideTrigger();
        return;
      }
      ui.showTrigger(e.clientX, e.clientY, async () => {
        ui.hideTrigger();
        if (sel.text.length > MAX_TEXT_LENGTH) {
          ui.showMessage(sel.rect, TOO_LONG_MESSAGE);
          return;
        }
        const res = await requestCheck(sel.text);
        const actions =
          sel.target && res.ok && res.corrections.length > 0
            ? makeCorrectionActions(sel.target, res)
            : undefined;
        ui.showResult(sel.rect, res, actions);
      });
    }, 0);
  });
}

function captureSelection(): SelectionInfo | null {
  // input/textarea 내부 선택은 window.getSelection()에 잡히지 않으므로 별도 처리
  const active = document.activeElement;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    const excluded = active instanceof HTMLInputElement && EXCLUDED_INPUT_TYPES.has(active.type);
    const { selectionStart: start, selectionEnd: end } = active;
    if (!excluded && start != null && end != null && end > start) {
      const text = active.value.slice(start, end);
      if (!text.trim()) return null;
      // 교정할 때마다 선택 영역 길이가 변하므로 추적한다.
      let length = end - start;
      return {
        text,
        rect: active.getBoundingClientRect(),
        target: {
          read: () => active.value.substr(start, length),
          write: (t) => {
            const value = active.value;
            setNativeValue(active, value.slice(0, start) + t + value.slice(start + length));
            length = t.length;
          },
        },
      };
    }
    // 입력창에 포커스만 남아 있고 내부 선택이 없으면 일반 페이지 선택을 확인한다.
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const text = selection.toString();
  if (!text.trim()) return null;

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const element = container instanceof HTMLElement ? container : container.parentElement;
  if (!(element?.isContentEditable ?? false)) {
    return { text, rect: range.getBoundingClientRect() };
  }

  // 편집 영역: 첫 교정 때 선택 범위를 텍스트 노드 하나로 바꾸고, 이후엔 그 노드만 갱신
  let node: Text | null = null;
  return {
    text,
    rect: range.getBoundingClientRect(),
    target: {
      read: () => (node ? node.data : text),
      write: (t) => {
        if (node) {
          node.data = t;
        } else {
          range.deleteContents();
          node = document.createTextNode(t);
          range.insertNode(node);
        }
        element?.dispatchEvent(new InputEvent('input', { bubbles: true }));
      },
    },
  };
}
