import type { SpellCheckResponse } from '@/utils/types';

/** 교정 적용 동작. index.ts에서 대상(입력창/선택 영역)에 맞게 만들어 넘긴다. */
export interface CorrectionActions {
  /** i번째 교정만 적용. 대상에서 원본을 찾지 못하면 false */
  applyOne(index: number): boolean;
  /** 남은 교정을 전부 적용 */
  applyAll(): void;
}

const LOGO_IMG = `<img src="data:image/png;base64,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" width="22" height="22" alt="" style="display:block;border-radius:50%">`;

const STYLE = `
.modal, .trigger {
  position: fixed;
  z-index: 2147483647;
  font: 13px/1.5 -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
}
.modal {
  background: #fff;
  color: #1f2937;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  padding: 12px 14px;
  min-width: 180px;
  max-width: 340px;
  max-height: 45vh;
  overflow-y: auto;
}
.row { margin: 2px 0; word-break: break-all; }
.row del { color: #9ca3af; }
.row .arrow { margin: 0 6px; color: #9ca3af; }
.row ins { text-decoration: none; font-weight: 600; }
.row ins.spelling { color: #dc2626; }
.row ins.spacing { color: #16a34a; }
.row ins.ambiguous { color: #7c3aed; }
.row ins.statistical { color: #2563eb; }
.row.clickable { cursor: pointer; padding: 2px 6px; margin: 1px -6px; border-radius: 6px; }
.row.clickable:hover { background: #f1f5f9; }
.row.done { opacity: 0.55; }
.row.done::after { content: ' ✓'; color: #16a34a; font-weight: 700; }
.perfect { font-weight: 700; color: #16a34a; }
.notice { color: #4b5563; }
.replace-btn {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 7px 0;
  border: 0;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.replace-btn:hover { background: #1d4ed8; }
.trigger {
  width: 28px;
  height: 28px;
  padding: 3px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}
[hidden] { display: none !important; }
`;

const ERROR_MESSAGES: Record<string, string> = {
  'too-long': '10,000자 이하의 글만 검사할 수 있어요.',
  network: '맞춤법 검사에 실패했어요. 네트워크를 확인해 주세요.',
  key: '검사 키를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.',
  stale: '확장 프로그램이 업데이트됐어요. 페이지를 새로고침해 주세요.',
};

export class SupellUi {
  private host: HTMLDivElement;
  private modal: HTMLDivElement;
  private trigger: HTMLButtonElement;
  private onTrigger: (() => void) | null = null;

  constructor() {
    this.host = document.createElement('div');
    this.host.style.all = 'initial';
    const root = this.host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = STYLE;

    this.modal = document.createElement('div');
    this.modal.className = 'modal';
    this.modal.hidden = true;

    this.trigger = document.createElement('button');
    this.trigger.className = 'trigger';
    this.trigger.title = '맞춤법 검사';
    this.trigger.innerHTML = LOGO_IMG;
    this.trigger.hidden = true;
    this.trigger.addEventListener('click', () => this.onTrigger?.());

    root.append(style, this.modal, this.trigger);
    document.documentElement.append(this.host);

    // 모달 밖(우리 UI 밖)을 누르면 모달을 닫는다.
    document.addEventListener(
      'mousedown',
      (e) => {
        if (!this.containsEvent(e)) this.hideModal();
      },
      true,
    );
  }

  /** 이벤트가 우리 UI(shadow host) 안에서 발생했는지 */
  containsEvent(e: Event): boolean {
    return e.composedPath().includes(this.host);
  }

  showTrigger(x: number, y: number, onClick: () => void) {
    this.onTrigger = onClick;
    this.trigger.hidden = false;
    const margin = 8;
    this.trigger.style.left = `${Math.min(x + margin, window.innerWidth - 36)}px`;
    this.trigger.style.top = `${Math.max(y - 36, margin)}px`;
  }

  hideTrigger() {
    this.trigger.hidden = true;
    this.onTrigger = null;
  }

  showMessage(anchor: DOMRect, text: string, className = 'notice') {
    this.modal.replaceChildren(this.line(className, text));
    this.position(anchor);
  }

  showResult(anchor: DOMRect, res: SpellCheckResponse, actions?: CorrectionActions) {
    if (!res.ok) {
      this.showMessage(anchor, ERROR_MESSAGES[res.error]);
      return;
    }
    if (res.corrections.length === 0) {
      this.showMessage(anchor, '완벽해요! 🎉', 'perfect');
      return;
    }

    const rows = res.corrections.map(({ original, corrected, type }, index) => {
      const row = document.createElement('div');
      row.className = 'row';
      const del = document.createElement('del');
      del.textContent = original;
      const arrow = document.createElement('span');
      arrow.className = 'arrow';
      arrow.textContent = '→';
      const ins = document.createElement('ins');
      ins.className = type;
      ins.textContent = corrected;
      row.append(del, arrow, ins);

      if (actions) {
        row.classList.add('clickable');
        row.title = '클릭하면 이 부분만 바뀌어요';
        // 개별 적용 후에도 모달은 열어 둔다 (다른 항목도 이어서 바꿀 수 있게)
        row.addEventListener('click', () => {
          if (row.classList.contains('done')) return;
          if (actions.applyOne(index)) row.classList.add('done');
        });
      }
      return row;
    });
    this.modal.replaceChildren(...rows);

    if (actions) {
      const button = document.createElement('button');
      button.className = 'replace-btn';
      button.textContent = '모두 바꾸기';
      button.addEventListener('click', () => {
        actions.applyAll();
        this.hideModal();
      });
      this.modal.append(button);
    }
    this.position(anchor);
  }

  hideModal() {
    this.modal.hidden = true;
  }

  /** 앵커(입력창/선택 영역) 위에 띄우되, 위 공간이 부족하면 아래에 띄운다. */
  private position(anchor: DOMRect) {
    const gap = 8;
    this.modal.hidden = false;
    this.modal.style.visibility = 'hidden';
    this.modal.style.left = '0px';
    this.modal.style.top = '0px';
    const { offsetWidth: w, offsetHeight: h } = this.modal;

    const left = Math.max(gap, Math.min(anchor.left, window.innerWidth - w - gap));
    const top =
      anchor.top - h - gap >= 0 ? anchor.top - h - gap : Math.min(anchor.bottom + gap, window.innerHeight - h - gap);
    this.modal.style.left = `${left}px`;
    this.modal.style.top = `${Math.max(gap, top)}px`;
    this.modal.style.visibility = 'visible';
  }

  private line(className: string, text: string): HTMLDivElement {
    const div = document.createElement('div');
    div.className = className;
    div.textContent = text;
    return div;
  }
}
