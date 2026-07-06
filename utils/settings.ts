import { browser } from 'wxt/browser';

/** 팝업에서 켜고 끄는 사용자 설정. storage.local에 저장된다. */
export interface Settings {
  /** 확장 전체 사용 여부 (마스터 스위치) */
  enabled: boolean;
  /** 입력 중 자동으로 검사 ("쓰면서 검사") */
  autoCheck: boolean;
  /** 드래그로 선택한 문장 검사 */
  dragCheck: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  autoCheck: true,
  dragCheck: true,
};

const STORAGE_KEY = 'settings';

function normalize(value: unknown): Settings {
  return { ...DEFAULT_SETTINGS, ...(value as Partial<Settings> | undefined) };
}

export async function loadSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  return normalize(stored[STORAGE_KEY]);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: settings });
}

/** 설정이 바뀔 때마다 콜백을 호출한다. 구독 해제 함수를 반환한다. */
export function watchSettings(onChange: (settings: Settings) => void): () => void {
  const listener = (
    changes: Record<string, { newValue?: unknown }>,
    area: string,
  ) => {
    if (area !== 'local' || !(STORAGE_KEY in changes)) return;
    onChange(normalize(changes[STORAGE_KEY].newValue));
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

/**
 * 실제 동작에 반영되는 값. 마스터(enabled)가 꺼져 있으면 하위 기능은
 * 저장값과 상관없이 모두 꺼진 것으로 취급한다. (저장값 자체는 보존되어,
 * 마스터를 다시 켜면 이전 선택이 그대로 복원된다.)
 */
export function effectiveSettings(settings: Settings): {
  autoCheck: boolean;
  dragCheck: boolean;
} {
  return {
    autoCheck: settings.enabled && settings.autoCheck,
    dragCheck: settings.enabled && settings.dragCheck,
  };
}
