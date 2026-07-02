import { splitTextForCheck } from './chunk';
import { parseCorrections, toPlainText } from './parse';
import {
  CHUNK_LENGTH,
  MAX_TEXT_LENGTH,
  type Correction,
  type SpellCheckResponse,
} from './types';

const SEARCH_PAGE_URL =
  'https://search.naver.com/search.naver?query=' + encodeURIComponent('맞춤법 검사기');
const SPELLER_URL = 'https://m.search.naver.com/p/csearch/ocontent/util/SpellerProxy';
const KEY_STORAGE = 'passportKey';

interface SpellerData {
  message?: {
    error?: string;
    result?: { errata_count: number; origin_html: string; html: string; notag_html: string };
  };
}

class InvalidKeyError extends Error {}

let memoryKey: string | null = null;

/** 네이버 "맞춤법 검사기" 검색 페이지에 심어진 passportKey를 추출한다. */
async function fetchPassportKey(): Promise<string> {
  const res = await fetch(SEARCH_PAGE_URL);
  const html = await res.text();
  const match = html.match(/passportKey=([0-9a-f]+)/);
  if (!match) throw new InvalidKeyError('passportKey not found in search page');
  return match[1];
}

async function renewKey(): Promise<string> {
  memoryKey = await fetchPassportKey();
  await browser.storage.local.set({ [KEY_STORAGE]: memoryKey });
  return memoryKey;
}

async function getKey(): Promise<string> {
  if (memoryKey) return memoryKey;
  const stored = await browser.storage.local.get(KEY_STORAGE);
  if (typeof stored[KEY_STORAGE] === 'string') {
    memoryKey = stored[KEY_STORAGE];
    return memoryKey;
  }
  return renewKey();
}

async function callSpeller(text: string, key: string): Promise<SpellerData> {
  const params = new URLSearchParams({
    passportKey: key,
    color_blindness: '0', // 누락 시 서버가 HTTP 500을 반환하므로 필수
    q: text,
  });
  const res = await fetch(`${SPELLER_URL}?${params}`);
  if (!res.ok) throw new Error(`SpellerProxy HTTP ${res.status}`);
  return res.json();
}

async function checkChunk(text: string) {
  let data = await callSpeller(text, await getKey());
  if (data.message?.error) {
    // 키 만료 → 새 키로 1회 재시도
    data = await callSpeller(text, await renewKey());
  }
  const result = data.message?.result;
  if (!result) throw new InvalidKeyError('speller returned no result');
  return {
    corrected: toPlainText(result.notag_html),
    corrections: parseCorrections(result.origin_html, result.html),
  };
}

/**
 * API 호출당 글자 수 제한이 있어서, 긴 글은 공백 경계에서
 * CHUNK_LENGTH자 이하로 나눠 차례로 검사한 뒤 결과를 이어붙인다.
 */
export async function checkSpelling(text: string): Promise<SpellCheckResponse> {
  if (text.length > MAX_TEXT_LENGTH) return { ok: false, error: 'too-long' };

  try {
    let corrected = '';
    const corrections: Correction[] = [];
    for (const piece of splitTextForCheck(text, CHUNK_LENGTH)) {
      if (!piece.text.trim()) {
        corrected += piece.text + piece.sep;
        continue;
      }
      const result = await checkChunk(piece.text);
      corrected += result.corrected + piece.sep;
      corrections.push(...result.corrections);
    }
    return { ok: true, corrected, corrections };
  } catch (e) {
    return { ok: false, error: e instanceof InvalidKeyError ? 'key' : 'network' };
  }
}
