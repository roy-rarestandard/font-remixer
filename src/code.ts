type ScriptType = "latin" | "japanese";
type JapaneseSubtype = "hiragana" | "katakana" | "kanji";
type ShapeCategory = "round" | "flat" | "diagonal" | "open" | "narrow";

type FontDescriptor = FontName;

type SavedSettings = {
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

type CharacterRange = {
  start: number;
  end: number;
  script: ScriptType;
};

type CharacterToken = {
  start: number;
  end: number;
  codePoint: number;
  char: string;
  script: ScriptType;
  japaneseSubtype: JapaneseSubtype | null;
  fontSize: number;
  spacingBase: number;
};

type Preset = {
  id: string;
  name: string;
  settings: SavedSettings;
};

type FontFamilyEntry = {
  family: string;
  styles: string[];
};

type PluginMessage =
  | { type: "init" }
  | { type: "extract" }
  | {
      type: "apply";
      settings?: Partial<SavedSettings>;
    }
  | {
      type: "save-preset";
      name?: string;
      settings?: Partial<SavedSettings>;
    }
  | {
      type: "update-preset";
      id?: string;
      name?: string;
      settings?: Partial<SavedSettings>;
    }
  | {
      type: "delete-preset";
      id?: string;
    }
  | {
      type: "close";
    };

const STORAGE_SETTINGS_KEY = "font-remixer.settings";
const STORAGE_PRESETS_KEY = "font-remixer.presets";
const sessionStorageFallback = new Map<string, unknown>();

const DEFAULT_SETTINGS: SavedSettings = {
  fontA: { family: "Helvetica Neue", style: "Medium" },
  fontB: { family: "Hiragino Sans", style: "W6" },
  fontSize: 40,
  sizeRatio: -10,
  letterSpacingLatin: 0,
  letterSpacingKanji: 0,
  letterSpacingHiragana: -2,
  letterSpacingKatakana: -4,
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

const PERCENT_PER_PIXEL_AT_16 = 100 / 16;

figma.showUI(__html__, { width: 320, height: 720 });

function classifyCharacter(code: number): ScriptType {
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

function classifyJapaneseSubtype(code: number): JapaneseSubtype {
  if (code >= 0x3040 && code <= 0x309f) {
    return "hiragana";
  }
  if ((code >= 0x30a0 && code <= 0x30ff) || (code >= 0xff65 && code <= 0xff9f)) {
    return "katakana";
  }
  return "kanji";
}

function isWhitespace(codePoint: number): boolean {
  return /\s/u.test(String.fromCodePoint(codePoint));
}

function buildCharacterRanges(text: string): CharacterRange[] {
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

function getLetterSpacingForChar(script: ScriptType, codePoint: number, settings: SavedSettings): number {
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
  const scale = intensity / 100;
  let adjustment = getKatakanaEdgeBias(current) + getKatakanaEdgeBias(next);

  if (SMALL_KATAKANA.has(current.char) || SMALL_KATAKANA.has(next.char)) {
    adjustment -= 0.14;
  }

  if (isVoicedKana(current.char) || isVoicedKana(next.char)) {
    adjustment += 0.12;
  }

  return adjustment * PERCENT_PER_PIXEL_AT_16 * scale;
}

function getPairAdjustment(current: CharacterToken, next: CharacterToken, intensity: number): number {
  if (intensity <= 0) {
    return 0;
  }

  if (isWhitespace(current.codePoint) || isWhitespace(next.codePoint)) {
    return 0;
  }

  const scale = intensity / 100;

  if (current.script === "japanese" && next.script === "japanese") {
    if (current.japaneseSubtype === "katakana" && next.japaneseSubtype === "katakana") {
      return getKatakanaPairAdjustment(current, next, intensity);
    }
    return 0;
  }

  if (current.script !== next.script) {
    return 10 * scale;
  }

  if (current.script === "latin" && next.script === "latin") {
    const pairKey = `${current.char}${next.char}`;
    const base = SPECIAL_PAIR_OVERRIDES[pairKey];
    if (base != null) {
      return base * PERCENT_PER_PIXEL_AT_16 * scale;
    }

    const from = getShapeCategory(current.char);
    const to = getShapeCategory(next.char);
    return OPTICAL_MATRIX[from][to] * PERCENT_PER_PIXEL_AT_16 * scale;
  }

  return 0;
}

function buildCharacterTokens(text: string, settings: SavedSettings, japaneseSize: number): CharacterToken[] {
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

async function loadAllFontsOnNode(node: TextNode): Promise<void> {
  const segments = node.getStyledTextSegments(["fontName"]);
  const loaded = new Set<string>();

  for (const segment of segments) {
    const key = `${segment.fontName.family}:::${segment.fontName.style}`;
    if (loaded.has(key)) {
      continue;
    }
    loaded.add(key);

    try {
      await figma.loadFontAsync(segment.fontName);
    } catch (error) {
      throw new Error(`Failed to load existing font "${segment.fontName.family} ${segment.fontName.style}".`);
    }
  }
}

function roughlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.0001;
}

function roundSpacing(value: number): number {
  return Number(value.toFixed(3));
}

function roundSettingNumber(value: number): number {
  return Number(value.toFixed(1));
}

function applyBatchedLetterSpacing(node: TextNode, tokens: CharacterToken[], spacingValues: number[]): void {
  if (tokens.length === 0) {
    return;
  }

  let batchStart = tokens[0].start;
  let batchEnd = tokens[0].end;
  let currentValue = spacingValues[0];

  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    const value = spacingValues[i];
    const contiguous = token.start === batchEnd;

    if (contiguous && roughlyEqual(value, currentValue)) {
      batchEnd = token.end;
      continue;
    }

    node.setRangeLetterSpacing(batchStart, batchEnd, { unit: "PERCENT", value: roundSpacing(currentValue) });
    batchStart = token.start;
    batchEnd = token.end;
    currentValue = value;
  }

  node.setRangeLetterSpacing(batchStart, batchEnd, { unit: "PERCENT", value: roundSpacing(currentValue) });
}

function normalizeFontDescriptor(
  raw: Partial<FontDescriptor> | undefined,
  fallback: FontDescriptor
): FontDescriptor {
  if (!raw) {
    return fallback;
  }

  const family = typeof raw.family === "string" && raw.family.trim() ? raw.family.trim() : fallback.family;
  const style = typeof raw.style === "string" && raw.style.trim() ? raw.style.trim() : fallback.style;
  return { family, style };
}

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeSettings(raw: Partial<SavedSettings> | undefined): SavedSettings {
  const source = raw ?? {};
  return {
    fontA: normalizeFontDescriptor(source.fontA, DEFAULT_SETTINGS.fontA),
    fontB: normalizeFontDescriptor(source.fontB, DEFAULT_SETTINGS.fontB),
    fontSize: toFiniteNumber(source.fontSize, DEFAULT_SETTINGS.fontSize),
    sizeRatio: toFiniteNumber(source.sizeRatio, DEFAULT_SETTINGS.sizeRatio),
    letterSpacingLatin: toFiniteNumber(source.letterSpacingLatin, DEFAULT_SETTINGS.letterSpacingLatin),
    letterSpacingKanji: toFiniteNumber(source.letterSpacingKanji, DEFAULT_SETTINGS.letterSpacingKanji),
    letterSpacingHiragana: toFiniteNumber(source.letterSpacingHiragana, DEFAULT_SETTINGS.letterSpacingHiragana),
    letterSpacingKatakana: toFiniteNumber(source.letterSpacingKatakana, DEFAULT_SETTINGS.letterSpacingKatakana),
    opticalSpacing:
      typeof source.opticalSpacing === "boolean" ? source.opticalSpacing : DEFAULT_SETTINGS.opticalSpacing,
    opticalIntensity: toFiniteNumber(source.opticalIntensity, DEFAULT_SETTINGS.opticalIntensity)
  };
}

function isClientStoragePluginIdError(error: unknown): boolean {
  const message = formatError(error);
  return (
    message.includes("Cannot access client storage without a plugin ID") ||
    message.includes("Cannot set private plugin data in a plugin without an ID") ||
    message.includes("Cannot access private plugin data in a plugin without an ID")
  );
}

async function getStoredValue<T>(key: string): Promise<T | null> {
  try {
    const stored = await figma.clientStorage.getAsync(key);
    return stored == null ? null : (stored as T);
  } catch (error) {
    if (!isClientStoragePluginIdError(error)) {
      throw error;
    }
    return sessionStorageFallback.has(key) ? (sessionStorageFallback.get(key) as T) : null;
  }
}

async function setStoredValue(key: string, value: unknown): Promise<void> {
  try {
    await figma.clientStorage.setAsync(key, value);
  } catch (error) {
    if (!isClientStoragePluginIdError(error)) {
      throw error;
    }
    sessionStorageFallback.set(key, value);
  }
}

async function applyFontMix(node: TextNode, settings: SavedSettings, newText?: string): Promise<void> {
  await loadAllFontsOnNode(node);

  try {
    await Promise.all([figma.loadFontAsync(settings.fontA), figma.loadFontAsync(settings.fontB)]);
  } catch (error) {
    const details =
      error instanceof Error && error.message
        ? error.message
        : `${settings.fontA.family} ${settings.fontA.style} / ${settings.fontB.family} ${settings.fontB.style}`;
    throw new Error(`Failed to load target fonts: ${details}`);
  }

  if (newText != null) {
    node.characters = newText;
  }

  const text = node.characters;
  if (text.length === 0) {
    throw new Error("Text is empty.");
  }

  const ranges = buildCharacterRanges(text);
  const japaneseSize = settings.fontSize * (1 + settings.sizeRatio / 100);

  for (const range of ranges) {
    node.setRangeFontName(range.start, range.end, range.script === "latin" ? settings.fontA : settings.fontB);
    node.setRangeFontSize(range.start, range.end, range.script === "latin" ? settings.fontSize : japaneseSize);
  }

  const tokens = buildCharacterTokens(text, settings, japaneseSize);
  const spacing = tokens.map((token) => token.spacingBase);

  if (settings.opticalSpacing) {
    for (let i = 0; i < tokens.length - 1; i += 1) {
      spacing[i] += getPairAdjustment(tokens[i], tokens[i + 1], settings.opticalIntensity);
    }
  }

  applyBatchedLetterSpacing(node, tokens, spacing);
}

async function getSavedSettings(): Promise<SavedSettings | null> {
  const stored = await getStoredValue<Partial<SavedSettings>>(STORAGE_SETTINGS_KEY);
  if (!stored || typeof stored !== "object") {
    return null;
  }
  return normalizeSettings(stored as Partial<SavedSettings>);
}

async function setSavedSettings(settings: SavedSettings): Promise<void> {
  await setStoredValue(STORAGE_SETTINGS_KEY, settings);
}

function normalizePreset(input: unknown): Preset | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Partial<Preset>;
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name,
    settings: normalizeSettings(candidate.settings)
  };
}

async function getPresets(): Promise<Preset[]> {
  const stored = await getStoredValue<unknown[]>(STORAGE_PRESETS_KEY);
  if (!Array.isArray(stored)) {
    return [];
  }
  return stored.map(normalizePreset).filter((item): item is Preset => item != null);
}

async function setPresets(presets: Preset[]): Promise<void> {
  await setStoredValue(STORAGE_PRESETS_KEY, presets);
}

function generatePresetId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function getTextNodeCharacters(node: TextNode): string | null {
  try {
    return node.characters;
  } catch (error) {
    return null;
  }
}

function getLetterSpacingPercent(letterSpacing: LetterSpacing, fontSize: number): number {
  if (letterSpacing.unit === "PERCENT") {
    return letterSpacing.value;
  }
  if (letterSpacing.unit === "PIXELS") {
    return fontSize > 0 ? (letterSpacing.value / fontSize) * 100 : 0;
  }
  return 0;
}

function getMostCommonFont(tokens: Array<{ fontName: FontName }>, fallback: FontName): FontName {
  if (!tokens.length) {
    return fallback;
  }

  const counts = new Map<string, { fontName: FontName; count: number }>();
  for (const token of tokens) {
    const key = `${token.fontName.family}:::${token.fontName.style}`;
    const entry = counts.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      counts.set(key, { fontName: token.fontName, count: 1 });
    }
  }

  let winner = fallback;
  let maxCount = -1;
  for (const entry of counts.values()) {
    if (entry.count > maxCount) {
      maxCount = entry.count;
      winner = entry.fontName;
    }
  }
  return winner;
}

function getAverageValue(tokens: Array<{ value: number }>, fallback: number): number {
  if (!tokens.length) {
    return fallback;
  }
  const total = tokens.reduce((sum, token) => sum + token.value, 0);
  return total / tokens.length;
}

function extractSettingsFromNode(node: TextNode): SavedSettings {
  const text = getTextNodeCharacters(node);
  if (text == null) {
    throw new Error("Could not read the selected text node.");
  }
  if (!text.trim()) {
    throw new Error("Selected text node is empty.");
  }

  const segments = node.getStyledTextSegments(["fontName", "fontSize", "letterSpacing"]);
  if (!segments.length) {
    throw new Error("Could not read text styles from the selected node.");
  }

  const segmentForIndex = (index: number) =>
    segments.find((segment) => index >= segment.start && index < segment.end) ?? segments[segments.length - 1];

  const latinTokens: Array<{ fontName: FontName; value: number }> = [];
  const japaneseTokens: Array<{ fontName: FontName; value: number }> = [];
  const hiraganaSpacing: Array<{ value: number }> = [];
  const katakanaSpacing: Array<{ value: number }> = [];
  const kanjiSpacing: Array<{ value: number }> = [];
  const latinSpacing: Array<{ value: number }> = [];

  let index = 0;
  let previousScript: ScriptType = "latin";

  while (index < text.length) {
    const codePoint = text.codePointAt(index);
    if (codePoint == null) {
      break;
    }

    const script: ScriptType = isWhitespace(codePoint) && index > 0 ? previousScript : classifyCharacter(codePoint);
    const segment = segmentForIndex(index);
    const fontSize = segment.fontSize;
    const spacingValue = getLetterSpacingPercent(segment.letterSpacing, fontSize);

    if (script === "latin") {
      latinTokens.push({ fontName: segment.fontName, value: fontSize });
      latinSpacing.push({ value: spacingValue });
    } else {
      japaneseTokens.push({ fontName: segment.fontName, value: fontSize });
      const subtype = classifyJapaneseSubtype(codePoint);
      if (subtype === "hiragana") {
        hiraganaSpacing.push({ value: spacingValue });
      } else if (subtype === "katakana") {
        katakanaSpacing.push({ value: spacingValue });
      } else {
        kanjiSpacing.push({ value: spacingValue });
      }
    }

    previousScript = script;
    index += codePoint > 0xffff ? 2 : 1;
  }

  const fontA = getMostCommonFont(latinTokens, DEFAULT_SETTINGS.fontA);
  const fontB = getMostCommonFont(japaneseTokens, DEFAULT_SETTINGS.fontB);
  const latinSize = getAverageValue(latinTokens, DEFAULT_SETTINGS.fontSize);
  const japaneseSize = getAverageValue(japaneseTokens, latinSize * (1 + DEFAULT_SETTINGS.sizeRatio / 100));
  const sizeRatio = latinSize > 0 ? ((japaneseSize / latinSize) - 1) * 100 : DEFAULT_SETTINGS.sizeRatio;

  return normalizeSettings({
    fontA,
    fontB,
    fontSize: roundSettingNumber(latinSize),
    sizeRatio: roundSettingNumber(sizeRatio),
    letterSpacingLatin: roundSettingNumber(getAverageValue(latinSpacing, DEFAULT_SETTINGS.letterSpacingLatin)),
    letterSpacingKanji: roundSettingNumber(getAverageValue(kanjiSpacing, DEFAULT_SETTINGS.letterSpacingKanji)),
    letterSpacingHiragana: roundSettingNumber(
      getAverageValue(hiraganaSpacing, DEFAULT_SETTINGS.letterSpacingHiragana)
    ),
    letterSpacingKatakana: roundSettingNumber(
      getAverageValue(katakanaSpacing, DEFAULT_SETTINGS.letterSpacingKatakana)
    ),
    opticalSpacing: false,
    opticalIntensity: DEFAULT_SETTINGS.opticalIntensity
  });
}

function getSelectionInfo(): { message: string } {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    return { message: "No layer selected. Choose one text node." };
  }
  if (selection.length > 1) {
    return { message: "Multiple layers selected. Select exactly one text node." };
  }

  const node = selection[0];
  if (node.type !== "TEXT") {
    return { message: `Selected layer "${node.name}" is not a text node.` };
  }

  const characters = getTextNodeCharacters(node);
  if (characters == null) {
    return { message: `Selected text node: "${node.name}"` };
  }

  return { message: `Selected text node: "${node.name}" (${characters.length} chars)` };
}

function postMessage(message: object): void {
  figma.ui.postMessage(message);
}

function postStatus(kind: "success" | "error" | "warning" | "info", message: string): void {
  postMessage({ type: "status", kind, message });
}

function getSingleSelectedTextNode(): TextNode | null | "multiple" | "non-text" {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    return null;
  }
  if (selection.length > 1) {
    return "multiple";
  }
  const node = selection[0];
  if (node.type !== "TEXT") {
    return "non-text";
  }
  return node;
}

function mapAvailableFonts(fonts: Font[]): FontFamilyEntry[] {
  const grouped = new Map<string, Set<string>>();

  for (const font of fonts) {
    if (!grouped.has(font.fontName.family)) {
      grouped.set(font.fontName.family, new Set<string>());
    }
    grouped.get(font.fontName.family)?.add(font.fontName.style);
  }

  return Array.from(grouped.entries())
    .map(([family, styles]) => ({
      family,
      styles: Array.from(styles).sort((a, b) => a.localeCompare(b))
    }))
    .sort((a, b) => a.family.localeCompare(b.family));
}

async function sendInitPayload(): Promise<void> {
  const [fontsResult, savedSettingsResult, presetsResult] = await Promise.all([
    figma
      .listAvailableFontsAsync()
      .then((value) => ({ ok: true as const, value }))
      .catch((error) => ({ ok: false as const, error })),
    getSavedSettings()
      .then((value) => ({ ok: true as const, value }))
      .catch((error) => ({ ok: false as const, error })),
    getPresets()
      .then((value) => ({ ok: true as const, value }))
      .catch((error) => ({ ok: false as const, error }))
  ]);

  const fonts = fontsResult.ok ? fontsResult.value : [];
  const savedSettings = savedSettingsResult.ok ? savedSettingsResult.value : null;
  const effectiveSettings = savedSettings ?? DEFAULT_SETTINGS;
  const presets = presetsResult.ok ? presetsResult.value : [];

  postMessage({
    type: "init",
    fonts: mapAvailableFonts(fonts),
    savedSettings: effectiveSettings,
    presets,
    selectionInfo: getSelectionInfo()
  });

  if (!fontsResult.ok) {
    postStatus("warning", "Could not load the available font list. Try reopening the plugin.");
    return;
  }

  if (!savedSettingsResult.ok || !presetsResult.ok) {
    postStatus("warning", "Loaded the plugin, but some saved data could not be restored.");
  }
}

async function handleApply(message: Extract<PluginMessage, { type: "apply" }>): Promise<void> {
  const settings = normalizeSettings(message.settings);
  const selected = getSingleSelectedTextNode();
  if (selected == null) {
    postStatus("error", "No selection. Select a single text node.");
    return;
  }
  if (selected === "multiple") {
    postStatus("error", "Multiple layers selected. Select exactly one text node.");
    return;
  }
  if (selected === "non-text") {
    postStatus("error", "Selected layer is not a text node.");
    return;
  }

  const selectedCharacters = getTextNodeCharacters(selected);
  if (selectedCharacters == null) {
    postStatus("error", "Could not read the selected text node. Try selecting a different text layer.");
    return;
  }

  if (!selectedCharacters.trim()) {
    postStatus("warning", "Selected text node is empty.");
    return;
  }

  await applyFontMix(selected, settings);
  await setSavedSettings(settings);
  postStatus("success", "Font mix applied to the selected text node.");
  postMessage({ type: "selection-info", ...getSelectionInfo() });
}

async function handleExtract(): Promise<void> {
  const selected = getSingleSelectedTextNode();
  if (selected == null) {
    postStatus("error", "No selection. Select a single text node to extract settings.");
    return;
  }
  if (selected === "multiple") {
    postStatus("error", "Multiple layers selected. Select exactly one text node to extract settings.");
    return;
  }
  if (selected === "non-text") {
    postStatus("error", "Selected layer is not a text node.");
    return;
  }

  const settings = extractSettingsFromNode(selected);
  await setSavedSettings(settings);
  postMessage({ type: "extracted-settings", settings });
  postStatus("success", `Extracted settings from "${selected.name}".`);
}

async function handleSavePreset(message: Extract<PluginMessage, { type: "save-preset" }>): Promise<void> {
  const name = typeof message.name === "string" ? message.name.trim() : "";
  if (!name) {
    postStatus("warning", "Preset name is required.");
    return;
  }

  const settings = normalizeSettings(message.settings);
  const presets = await getPresets();
  presets.push({
    id: generatePresetId(),
    name,
    settings
  });

  await setPresets(presets);
  postMessage({ type: "presets", presets });
  postStatus("success", `Preset "${name}" saved.`);
}

async function handleUpdatePreset(message: Extract<PluginMessage, { type: "update-preset" }>): Promise<void> {
  if (!message.id) {
    postStatus("error", "Preset id is missing.");
    return;
  }

  const presets = await getPresets();
  const target = presets.find((preset) => preset.id === message.id);
  if (!target) {
    postStatus("error", "Preset not found.");
    return;
  }

  if (typeof message.name === "string") {
    const trimmed = message.name.trim();
    if (!trimmed) {
      postStatus("warning", "Preset name cannot be empty.");
      return;
    }
    target.name = trimmed;
  }

  if (message.settings) {
    target.settings = normalizeSettings(message.settings);
  }

  await setPresets(presets);
  postMessage({ type: "presets", presets });
  postStatus("success", `Preset "${target.name}" updated.`);
}

async function handleDeletePreset(message: Extract<PluginMessage, { type: "delete-preset" }>): Promise<void> {
  if (!message.id) {
    postStatus("error", "Preset id is missing.");
    return;
  }

  const presets = await getPresets();
  const next = presets.filter((preset) => preset.id !== message.id);
  if (next.length === presets.length) {
    postStatus("error", "Preset not found.");
    return;
  }

  await setPresets(next);
  postMessage({ type: "presets", presets: next });
  postStatus("success", "Preset deleted.");
}

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }
  return "An unexpected error occurred.";
}

figma.ui.onmessage = async (rawMessage: PluginMessage) => {
  try {
    switch (rawMessage.type) {
      case "init":
        await sendInitPayload();
        break;
      case "extract":
        await handleExtract();
        break;
      case "apply":
        await handleApply(rawMessage);
        break;
      case "save-preset":
        await handleSavePreset(rawMessage);
        break;
      case "update-preset":
        await handleUpdatePreset(rawMessage);
        break;
      case "delete-preset":
        await handleDeletePreset(rawMessage);
        break;
      case "close":
        figma.closePlugin();
        break;
      default:
        postStatus("error", "Unknown message received.");
    }
  } catch (error) {
    postStatus("error", formatError(error));
  }
};

figma.on("selectionchange", () => {
  postMessage({ type: "selection-info", ...getSelectionInfo() });
});
