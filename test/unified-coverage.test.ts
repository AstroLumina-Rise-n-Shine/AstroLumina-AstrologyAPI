import "./setup-env.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VALID_LANGUAGES, validateLanguage } from "../src/translations/index.js";
import { getPointType } from "../src/routes/astrology.js";

describe("unified language coverage", () => {
  it("exactly two languages are supported", () => {
    assert.equal(VALID_LANGUAGES.length, 2);
  });
  it("validateLanguage distinguishes the two supported languages", () => {
    for (const language of [...VALID_LANGUAGES]) {
      assert.equal(validateLanguage(language), true);
    }
    assert.equal(validateLanguage("fr"), false);
  });
});

describe("unified point-type coverage", () => {
  it("maps every astronomical class", () => {
    assert.equal(getPointType("Sun"), "planet");
    assert.equal(getPointType("Chiron"), "asteroid");
    assert.equal(getPointType("Regulus"), "star");
    assert.equal(getPointType("Ascendant"), "astral_point");
  });
});
