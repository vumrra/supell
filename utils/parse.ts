import type { Correction, CorrectionType } from './types';

/** SpellerProxy 응답 HTML의 em 클래스 → 오류 유형 매핑 */
const TYPE_BY_CLASS: Record<string, CorrectionType> = {
  red_text: 'spelling',
  green_text: 'spacing',
  violet_text: 'ambiguous',
  blue_text: 'statistical',
};

/** 태그 제거 + HTML 엔티티 복원 (서비스 워커에는 DOMParser가 없어 정규식으로 처리) */
export function toPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/**
 * origin_html의 밑줄 구간과 html의 교정 구간을 순서대로 짝지어
 * (원본 → 교정) 목록을 만든다. 두 목록은 같은 순서로 대응된다.
 */
export function parseCorrections(originHtml: string, resultHtml: string): Correction[] {
  const originals = [...originHtml.matchAll(/<span class='result_underline'>([\s\S]*?)<\/span>/g)]
    .map((m) => toPlainText(m[1]));

  return [...resultHtml.matchAll(/<em class='(\w+)'>([\s\S]*?)<\/em>/g)].map((m, i) => ({
    original: originals[i] ?? '',
    corrected: toPlainText(m[2]),
    type: TYPE_BY_CLASS[m[1]] ?? 'spelling',
  }));
}
