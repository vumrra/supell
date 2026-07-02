export interface TextPiece {
  /** 검사 API에 보낼 조각 (limit자 이하) */
  text: string;
  /** 조각 뒤에 붙어 있던 공백 (교정문을 이어붙일 때 그대로 복원) */
  sep: string;
}

/**
 * 긴 글을 공백 경계에서 limit자 이하 조각으로 나눈다.
 * 조각 사이의 공백은 sep으로 따로 보관해서, API가 조각 앞뒤 공백을
 * 다듬어 버려도 원래 간격 그대로 이어붙일 수 있게 한다.
 * limit자 안에 공백이 하나도 없으면 어쩔 수 없이 그 자리에서 자른다.
 */
export function splitTextForCheck(text: string, limit: number): TextPiece[] {
  const pieces: TextPiece[] = [];
  let rest = text;

  while (rest.length > limit) {
    let cut = -1;
    for (let i = limit; i > 0; i--) {
      if (/\s/.test(rest[i])) {
        cut = i;
        break;
      }
    }
    if (cut <= 0) {
      pieces.push({ text: rest.slice(0, limit), sep: '' });
      rest = rest.slice(limit);
      continue;
    }
    const sep = rest.slice(cut).match(/^\s+/)![0];
    pieces.push({ text: rest.slice(0, cut), sep });
    rest = rest.slice(cut + sep.length);
  }
  pieces.push({ text: rest, sep: '' });
  return pieces;
}
