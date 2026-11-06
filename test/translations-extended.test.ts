import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateLanguage,
  loadTranslations,
} from "../src/translations/index.js";

describe("validateLanguage", () => {
  it("accepts 'en'", () => {
    assert.equal(validateLanguage("en"), true);
  });

  it("accepts 'ro'", () => {
    assert.equal(validateLanguage("ro"), true);
  });

  it("rejects empty string", () => {
    assert.equal(validateLanguage(""), false);
  });

  it("rejects unsupported language codes", () => {
    for (const lang of ["fr", "de", "es", "it", "pt", "en-US", "RO", "EN"]) {
      assert.equal(validateLanguage(lang), false, `${lang} should be invalid`);
    }
  });
});

describe("loadTranslations", () => {
  it("returns an object with expected keys for 'en'", () => {
    const t = loadTranslations("en");
    assert.ok(typeof t === "object" && t !== null);
    assert.ok(typeof t.types === "object");
    assert.ok(typeof t.planets === "object");
    assert.ok(typeof t.signs === "object");
    assert.ok(typeof t.elements === "object");
    assert.ok(typeof t.houses === "object");
    assert.ok(typeof t.aspects === "object");
    assert.ok(typeof t.lunar_phases === "object");
  });

  it("returns an object with expected keys for 'ro'", () => {
    const t = loadTranslations("ro");
    assert.ok(typeof t === "object" && t !== null);
    assert.ok(typeof t.types === "object");
    assert.ok(typeof t.planets === "object");
    assert.ok(typeof t.signs === "object");
    assert.ok(typeof t.elements === "object");
    assert.ok(typeof t.houses === "object");
    assert.ok(typeof t.aspects === "object");
    assert.ok(typeof t.lunar_phases === "object");
  });

  it("returns different values for 'en' vs 'ro' for planet names", () => {
    const en = loadTranslations("en");
    const ro = loadTranslations("ro");
    assert.notEqual(en.planets.Sun, ro.planets.Sun);
    assert.notEqual(en.planets.Moon, ro.planets.Moon);
  });

  it("returns different values for 'en' vs 'ro' for sign names", () => {
    const en = loadTranslations("en");
    const ro = loadTranslations("ro");
    assert.notEqual(en.signs.Ari, ro.signs.Ari);
    assert.notEqual(en.signs.Pis, ro.signs.Pis);
  });

  it("translates 'planet' type differently per language", () => {
    const en = loadTranslations("en");
    const ro = loadTranslations("ro");
    assert.equal(en.types.planet, "Planet");
    assert.equal(ro.types.planet, "Planetă");
  });

  it("translates 'star' type differently per language", () => {
    const en = loadTranslations("en");
    const ro = loadTranslations("ro");
    assert.equal(en.types.star, "Fixed star");
    assert.equal(ro.types.star, "Stea fixă");
  });
});
