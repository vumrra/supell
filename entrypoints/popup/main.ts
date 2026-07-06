import { loadSettings, saveSettings, type Settings } from '@/utils/settings';

const enabledToggle = requireInput('toggle-enabled');
const autoToggle = requireInput('toggle-auto');
const dragToggle = requireInput('toggle-drag');

let settings: Settings;

init();

async function init() {
  settings = await loadSettings();
  render();

  enabledToggle.addEventListener('change', () => update({ enabled: enabledToggle.checked }));
  autoToggle.addEventListener('change', () => update({ autoCheck: autoToggle.checked }));
  dragToggle.addEventListener('change', () => update({ dragCheck: dragToggle.checked }));
}

function update(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  render();
  void saveSettings(settings);
}

/**
 * 저장값을 화면에 반영한다. 마스터가 꺼져 있으면 하위 토글은 저장값과
 * 상관없이 꺼진 채 비활성화된다. (저장값은 유지되어 다시 켜면 복원된다.)
 */
function render() {
  const master = settings.enabled;
  enabledToggle.checked = master;
  autoToggle.checked = master && settings.autoCheck;
  dragToggle.checked = master && settings.dragCheck;
  autoToggle.disabled = !master;
  dragToggle.disabled = !master;
  document.body.classList.toggle('master-off', !master);
}

function requireInput(id: string): HTMLInputElement {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLInputElement)) {
    throw new Error(`토글 요소를 찾을 수 없습니다: #${id}`);
  }
  return el;
}
