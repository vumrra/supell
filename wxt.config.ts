import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'supell 한글 맞춤법 검사',
    description:
      '입력 중인 글과 마우스로 선택한 문장을 네이버 맞춤법 검사기로 검사합니다.',
    permissions: ['storage'],
    host_permissions: [
      'https://search.naver.com/*',
      'https://m.search.naver.com/*',
    ],
  },
});
