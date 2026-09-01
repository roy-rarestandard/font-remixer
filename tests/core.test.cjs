const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_SETTINGS,
  buildCharacterRanges,
  buildCharacterTokens,
  classifyCharacter,
  classifyJapaneseSubtype,
  emToFigmaPercent,
  figmaPercentToEm
} = require("../dist/core.js");

test("classifyCharacter separates latin and japanese ranges", () => {
  assert.equal(classifyCharacter("A".codePointAt(0)), "latin");
  assert.equal(classifyCharacter("あ".codePointAt(0)), "japanese");
  assert.equal(classifyCharacter("ア".codePointAt(0)), "japanese");
  assert.equal(classifyCharacter("東".codePointAt(0)), "japanese");
});

test("classifyJapaneseSubtype handles hiragana, katakana, and kanji", () => {
  assert.equal(classifyJapaneseSubtype("あ".codePointAt(0)), "hiragana");
  assert.equal(classifyJapaneseSubtype("ア".codePointAt(0)), "katakana");
  assert.equal(classifyJapaneseSubtype("ｨ".codePointAt(0)), "katakana");
  assert.equal(classifyJapaneseSubtype("東".codePointAt(0)), "kanji");
});

test("buildCharacterRanges keeps spaces with the preceding script and handles surrogate pairs", () => {
  assert.deepEqual(buildCharacterRanges("A あ"), [
    { start: 0, end: 2, script: "latin" },
    { start: 2, end: 3, script: "japanese" }
  ]);

  assert.deepEqual(buildCharacterRanges("A😀あ"), [
    { start: 0, end: 3, script: "latin" },
    { start: 3, end: 4, script: "japanese" }
  ]);
});

test("buildCharacterTokens assigns subtype and per-script spacing", () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    letterSpacingLatin: -0.01,
    letterSpacingHiragana: -0.02,
    letterSpacingKatakana: -0.03,
    letterSpacingKanji: 0.04
  };

  const tokens = buildCharacterTokens("Aあア東", settings);
  assert.equal(tokens.length, 4);
  assert.equal(tokens[0].spacingBase, -0.01);
  assert.equal(tokens[1].japaneseSubtype, "hiragana");
  assert.equal(tokens[1].spacingBase, -0.02);
  assert.equal(tokens[2].japaneseSubtype, "katakana");
  assert.equal(tokens[2].spacingBase, -0.03);
  assert.equal(tokens[3].japaneseSubtype, "kanji");
  assert.equal(tokens[3].spacingBase, 0.04);
});

test("em spacing converts losslessly to and from Figma percent values", () => {
  assert.equal(DEFAULT_SETTINGS.letterSpacingUnit, "em");
  assert.equal(emToFigmaPercent(-0.05), -5);
  assert.equal(figmaPercentToEm(2.8), 0.028);
  assert.equal(figmaPercentToEm(emToFigmaPercent(-0.0125)), -0.0125);
});
