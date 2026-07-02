import { checkSpelling } from '@/utils/naver';
import type { SpellCheckRequest } from '@/utils/types';

export default defineBackground(() => {
  // 콘텐츠 스크립트는 CORS 때문에 네이버 API를 직접 호출할 수 없어
  // host_permissions를 가진 백그라운드가 대신 호출한다.
  browser.runtime.onMessage.addListener(
    (message: SpellCheckRequest, _sender, sendResponse) => {
      if (message?.type !== 'spellcheck') return;
      checkSpelling(message.text).then(sendResponse);
      return true;
    },
  );
});
