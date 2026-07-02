export type CorrectionType = 'spelling' | 'spacing' | 'ambiguous' | 'statistical';

export interface Correction {
  original: string;
  corrected: string;
  type: CorrectionType;
}

export interface SpellCheckSuccess {
  ok: true;
  /** 전체 교정문 */
  corrected: string;
  /** 원본 → 교정 쌍 목록 (비어 있으면 오류 없음) */
  corrections: Correction[];
}

export interface SpellCheckFailure {
  ok: false;
  error: 'too-long' | 'network' | 'key' | 'stale';
}

export type SpellCheckResponse = SpellCheckSuccess | SpellCheckFailure;

export interface SpellCheckRequest {
  type: 'spellcheck';
  text: string;
}

/** 한 번에 검사할 수 있는 전체 글자 수 상한 */
export const MAX_TEXT_LENGTH = 10_000;

/** 네이버 API 호출 1회당 글자 수 제한 */
export const CHUNK_LENGTH = 300;
