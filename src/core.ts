export type ScriptType = "latin" | "japanese";
export type JapaneseSubtype = "hiragana" | "katakana" | "kanji";

export type FontDescriptor = {
  family: string;
  style: string;
};

export type SavedSettings = {
  fontA: FontDescriptor;
  fontB: FontDescriptor;
  fontSize: number;
  sizeRatio: number;
  letterSpacingUnit: "em";
  letterSpacingLatin: number;
  letterSpacingKanji: number;
  letterSpacingHiragana: number;
  letterSpacingKatakana: number;
};

export type CharacterRange = {
  start: number;
  end: number;
  script: ScriptType;
};

export type CharacterToken = {
  start: number;
  end: number;
  codePoint: number;
  script: ScriptType;
  japaneseSubtype: JapaneseSubtype | null;
  spacingBase: number;
};

export const DEFAULT_SETTINGS: SavedSettings = {
  fontA: { family: "Helvetica Neue", style: "Medium" },
  fontB: { family: "Hiragino Sans", style: "W6" },
  fontSize: 40,
  sizeRatio: -10,
  letterSpacingUnit: "em",
  letterSpacingLatin: 0,
  letterSpacingKanji: 0,
  letterSpacingHiragana: -0.02,
  letterSpacingKatakana: -0.04
};

export function emToFigmaPercent(value: number): number {
  return value * 100;
}

export function figmaPercentToEm(value: number): number {
  return Number((value / 100).toFixed(6));
}

export function classifyCharacter(code: number): ScriptType {
  if (code >= 0x0020 && code <= 0x024f) {
    return "latin";
  }

  const isJapanese =
    (code >= 0x3040 && code <= 0x309f) ||
    (code >= 0x30a0 && code <= 0x30ff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xff00 && code <= 0xffef) ||
    (code >= 0x3000 && code <= 0x303f);

  return isJapanese ? "japanese" : "latin";
}

export function classifyJapaneseSubtype(code: number): JapaneseSubtype {
  if (code >= 0x3040 && code <= 0x309f) {
    return "hiragana";
  }
  if ((code >= 0x30a0 && code <= 0x30ff) || (code >= 0xff65 && code <= 0xff9f)) {
    return "katakana";
  }
  return "kanji";
}

export function isWhitespace(codePoint: number): boolean {
  return /\s/u.test(String.fromCodePoint(codePoint));
}

export function buildCharacterRanges(text: string): CharacterRange[] {
  const ranges: CharacterRange[] = [];
  if (text.length === 0) {
    return ranges;
  }

  let index = 0;
  let rangeStart = 0;
  let currentScript: ScriptType | null = null;
  let previousScript: ScriptType = "latin";

  while (index < text.length) {
    const codePoint = text.codePointAt(index);
    if (codePoint == null) {
      break;
    }

    const resolvedScript: ScriptType =
      isWhitespace(codePoint) && index > 0 ? previousScript : classifyCharacter(codePoint);

    if (currentScript == null) {
      currentScript = resolvedScript;
      rangeStart = index;
    } else if (resolvedScript !== currentScript) {
      ranges.push({ start: rangeStart, end: index, script: currentScript });
      currentScript = resolvedScript;
      rangeStart = index;
    }

    previousScript = resolvedScript;
    index += codePoint > 0xffff ? 2 : 1;
  }

  if (currentScript != null) {
    ranges.push({ start: rangeStart, end: text.length, script: currentScript });
  }

  return ranges;
}

export function getLetterSpacingForChar(script: ScriptType, codePoint: number, settings: SavedSettings): number {
  if (script === "latin") {
    return settings.letterSpacingLatin;
  }

  const subtype = classifyJapaneseSubtype(codePoint);
  if (subtype === "hiragana") {
    return settings.letterSpacingHiragana;
  }
  if (subtype === "katakana") {
    return settings.letterSpacingKatakana;
  }
  return settings.letterSpacingKanji;
}

export function buildCharacterTokens(text: string, settings: SavedSettings): CharacterToken[] {
  const tokens: CharacterToken[] = [];
  let index = 0;
  let previousScript: ScriptType = "latin";

  while (index < text.length) {
    const codePoint = text.codePointAt(index);
    if (codePoint == null) {
      break;
    }

    const resolvedScript: ScriptType =
      isWhitespace(codePoint) && index > 0 ? previousScript : classifyCharacter(codePoint);
    const japaneseSubtype = resolvedScript === "japanese" ? classifyJapaneseSubtype(codePoint) : null;
    const spacingBase = getLetterSpacingForChar(resolvedScript, codePoint, settings);
    const end = index + (codePoint > 0xffff ? 2 : 1);

    tokens.push({
      start: index,
      end,
      codePoint,
      script: resolvedScript,
      japaneseSubtype,
      spacingBase
    });

    previousScript = resolvedScript;
    index = end;
  }

  return tokens;
}
