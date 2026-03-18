const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_SETTINGS,
  buildCharacterRanges,
  buildCharacterTokens,
  classifyCharacter,
  classifyJapaneseSubtype,
  getPairAdjustment
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
    letterSpacingLatin: 1,
    letterSpacingHiragana: 2,
    letterSpacingKatakana: 3,
    letterSpacingKanji: 4
  };

  const tokens = buildCharacterTokens("Aあア東", settings, 18);
  assert.equal(tokens.length, 4);
  assert.equal(tokens[0].spacingBase, 1);
  assert.equal(tokens[1].japaneseSubtype, "hiragana");
  assert.equal(tokens[1].spacingBase, 2);
  assert.equal(tokens[2].japaneseSubtype, "katakana");
  assert.equal(tokens[2].spacingBase, 3);
  assert.equal(tokens[3].japaneseSubtype, "kanji");
  assert.equal(tokens[3].spacingBase, 4);
});

test("optical spacing tightens latin AV pairs and cross-script transitions expand", () => {
  const latinTokens = buildCharacterTokens("AV", DEFAULT_SETTINGS, 16);
  assert.ok(getPairAdjustment(latinTokens[0], latinTokens[1], 100) < 0);

  const mixedTokens = buildCharacterTokens("Aア", DEFAULT_SETTINGS, 16);
  assert.ok(getPairAdjustment(mixedTokens[0], mixedTokens[1], 100) > 0);
});

test("katakana optical spacing tightens small kana pairs and loosens voiced kana pairs", () => {
  const smallKanaTokens = buildCharacterTokens("フィ", DEFAULT_SETTINGS, 16);
  assert.ok(getPairAdjustment(smallKanaTokens[0], smallKanaTokens[1], 100) < 0);

  const voicedKanaTokens = buildCharacterTokens("グラ", DEFAULT_SETTINGS, 16);
  assert.ok(getPairAdjustment(voicedKanaTokens[0], voicedKanaTokens[1], 100) > 0);
});
