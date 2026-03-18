export type ScriptType = "latin" | "japanese";
export type JapaneseSubtype = "hiragana" | "katakana" | "kanji";
export type ShapeCategory = "round" | "flat" | "diagonal" | "open" | "narrow";

export type FontDescriptor = {
  family: string;
  style: string;
};

export type SavedSettings = {
  fontA: FontDescriptor;
  fontB: FontDescriptor;
  fontSize: number;
  sizeRatio: number;
  letterSpacingLatin: number;
  letterSpacingKanji: number;
  letterSpacingHiragana: number;
  letterSpacingKatakana: number;
  opticalSpacing: boolean;
  opticalIntensity: number;
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
  char: string;
  script: ScriptType;
  japaneseSubtype: JapaneseSubtype | null;
  fontSize: number;
  spacingBase: number;
};

export const DEFAULT_SETTINGS: SavedSettings = {
  fontA: { family: "Inter", style: "Regular" },
  fontB: { family: "Noto Sans JP", style: "Regular" },
  fontSize: 16,
  sizeRatio: 0,
  letterSpacingLatin: 0,
  letterSpacingKanji: 0,
  letterSpacingHiragana: 0,
  letterSpacingKatakana: 0,
  opticalSpacing: false,
  opticalIntensity: 100
};

const LATIN_SHAPE_CATEGORY: Record<string, ShapeCategory> = {
  A: "diagonal",
  B: "flat",
  C: "round",
  D: "flat",
  E: "flat",
  F: "flat",
  G: "round",
  H: "flat",
  I: "narrow",
  J: "open",
  K: "diagonal",
  L: "flat",
  M: "flat",
  N: "flat",
  O: "round",
  P: "flat",
  Q: "round",
  R: "flat",
  S: "round",
  T: "open",
  U: "round",
  V: "diagonal",
  W: "diagonal",
  X: "diagonal",
  Y: "diagonal",
  Z: "diagonal",
  a: "round",
  b: "flat",
  c: "round",
  d: "flat",
  e: "round",
  f: "open",
  g: "round",
  h: "flat",
  i: "narrow",
  j: "narrow",
  k: "diagonal",
  l: "narrow",
  m: "flat",
  n: "flat",
  o: "round",
  p: "flat",
  q: "flat",
  r: "open",
  s: "round",
  t: "open",
  u: "round",
  v: "diagonal",
  w: "diagonal",
  x: "diagonal",
  y: "diagonal",
  z: "diagonal",
  "0": "round",
  "1": "narrow",
  "2": "diagonal",
  "3": "round",
  "4": "open",
  "5": "open",
  "6": "round",
  "7": "diagonal",
  "8": "round",
  "9": "round",
  "!": "narrow",
  "?": "open",
  ".": "narrow",
  ",": "narrow",
  ":": "narrow",
  ";": "narrow",
  "-": "flat",
  "_": "flat",
  "(": "round",
  ")": "round",
  "[": "flat",
  "]": "flat",
  "{": "round",
  "}": "round",
  "/": "diagonal",
  "\\": "diagonal",
  "'": "narrow",
  '"': "narrow",
  "|": "narrow",
  "+": "flat",
  "*": "diagonal",
  "&": "round",
  "%": "diagonal",
  "#": "flat",
  "@": "round",
  "$": "open",
  "<": "diagonal",
  ">": "diagonal"
};

const OPTICAL_MATRIX: Record<ShapeCategory, Record<ShapeCategory, number>> = {
  round: { round: -0.8, flat: -0.45, diagonal: -0.6, open: -0.35, narrow: -0.3 },
  flat: { round: -0.35, flat: -0.2, diagonal: -0.4, open: -0.25, narrow: -0.2 },
  diagonal: { round: -0.65, flat: -0.45, diagonal: -0.4, open: -0.3, narrow: -0.35 },
  open: { round: -0.25, flat: -0.2, diagonal: -0.25, open: -0.1, narrow: -0.15 },
  narrow: { round: -0.25, flat: -0.15, diagonal: -0.3, open: -0.12, narrow: -0.05 }
};

const SPECIAL_PAIR_OVERRIDES: Record<string, number> = {
  AV: -1.2,
  VA: -1.0,
  AW: -1.0,
  WA: -0.9,
  AY: -0.8,
  YA: -0.7,
  To: -0.8,
  Ta: -0.6,
  LT: -0.6,
  LY: -0.7,
  FA: -0.7,
  Fo: -0.5,
  Te: -0.5,
  Yo: -0.6,
  Tr: -0.4
};

const SMALL_KATAKANA = new Set([
  "ァ",
  "ィ",
  "ゥ",
  "ェ",
  "ォ",
  "ッ",
  "ャ",
  "ュ",
  "ョ",
  "ヮ",
  "ヵ",
  "ヶ",
  "ｧ",
  "ｨ",
  "ｩ",
  "ｪ",
  "ｫ",
  "ｯ",
  "ｬ",
  "ｭ",
  "ｮ",
  "ﾜ"
]);

const LIGHT_KATAKANA = new Set([
  "イ",
  "ロ",
  "ト",
  "リ",
  "ル",
  "レ",
  "ハ",
  "ヒ",
  "ヘ",
  "ホ",
  "ニ",
  "ン",
  "ー",
  "・"
]);

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

function getShapeCategory(char: string): ShapeCategory {
  return LATIN_SHAPE_CATEGORY[char] ?? "flat";
}

function isVoicedKana(char: string): boolean {
  const normalized = char.normalize("NFD");
  return normalized.includes("\u3099") || normalized.includes("\u309A");
}

function getKatakanaEdgeBias(token: CharacterToken): number {
  if (token.japaneseSubtype !== "katakana") {
    return 0;
  }

  if (SMALL_KATAKANA.has(token.char)) {
    return -0.34;
  }

  if (token.char === "ー") {
    return -0.12;
  }

  if (token.char === "・") {
    return -0.08;
  }

  if (isVoicedKana(token.char)) {
    return 0.2;
  }

  if (LIGHT_KATAKANA.has(token.char)) {
    return -0.08;
  }

  return 0;
}

function getKatakanaPairAdjustment(current: CharacterToken, next: CharacterToken, intensity: number): number {
  const scale = (intensity / 100) * (Math.min(current.fontSize, next.fontSize) / 16);
  let adjustment = getKatakanaEdgeBias(current) + getKatakanaEdgeBias(next);

  if (SMALL_KATAKANA.has(current.char) || SMALL_KATAKANA.has(next.char)) {
    adjustment -= 0.14;
  }

  if (isVoicedKana(current.char) || isVoicedKana(next.char)) {
    adjustment += 0.12;
  }

  return adjustment * scale;
}

export function getPairAdjustment(current: CharacterToken, next: CharacterToken, intensity: number): number {
  if (intensity <= 0) {
    return 0;
  }

  if (isWhitespace(current.codePoint) || isWhitespace(next.codePoint)) {
    return 0;
  }

  const scale = (intensity / 100) * (current.fontSize / 16);

  if (current.script === "japanese" && next.script === "japanese") {
    if (current.japaneseSubtype === "katakana" && next.japaneseSubtype === "katakana") {
      return getKatakanaPairAdjustment(current, next, intensity);
    }
    return 0;
  }

  if (current.script !== next.script) {
    return 1.6 * scale;
  }

  if (current.script === "latin" && next.script === "latin") {
    const pairKey = `${current.char}${next.char}`;
    const base = SPECIAL_PAIR_OVERRIDES[pairKey];
    if (base != null) {
      return base * scale;
    }

    const from = getShapeCategory(current.char);
    const to = getShapeCategory(next.char);
    return OPTICAL_MATRIX[from][to] * scale;
  }

  return 0;
}

export function buildCharacterTokens(text: string, settings: SavedSettings, japaneseSize: number): CharacterToken[] {
  const tokens: CharacterToken[] = [];
  let index = 0;
  let previousScript: ScriptType = "latin";

  while (index < text.length) {
    const codePoint = text.codePointAt(index);
    if (codePoint == null) {
      break;
    }

    const char = String.fromCodePoint(codePoint);
    const resolvedScript: ScriptType =
      isWhitespace(codePoint) && index > 0 ? previousScript : classifyCharacter(codePoint);
    const japaneseSubtype = resolvedScript === "japanese" ? classifyJapaneseSubtype(codePoint) : null;
    const fontSize = resolvedScript === "japanese" ? japaneseSize : settings.fontSize;
    const spacingBase = getLetterSpacingForChar(resolvedScript, codePoint, settings);
    const end = index + (codePoint > 0xffff ? 2 : 1);

    tokens.push({
      start: index,
      end,
      codePoint,
      char,
      script: resolvedScript,
      japaneseSubtype,
      fontSize,
      spacingBase
    });

    previousScript = resolvedScript;
    index = end;
  }

  return tokens;
}
