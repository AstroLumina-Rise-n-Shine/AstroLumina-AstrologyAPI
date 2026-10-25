import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  used_elements,
  used_element_symbols,
  used_planets,
  used_astral_points,
  used_asteroids,
  used_stars,
  sign_order,
  sign_emojis,
  used_aspects,
  natal_elements,
  karmic_elements,
} from "../src/constants.js";

describe("constants integrity", () => {
  it("exports a symbol glyph for every used element", () => {
    for (const element of used_elements) {
      assert.ok(
        typeof used_element_symbols[element] === "string",
        `missing symbol for ${element}`,
      );
    }
  });

  it("composes used_elements from planets, points, asteroids, stars", () => {
    const expected = [
      ...used_planets,
      ...used_astral_points,
      ...used_asteroids,
      ...used_stars,
    ];
    assert.deepEqual(used_elements, expected);
  });

  it("has twelve unique signs in the correct base order", () => {
    assert.equal(sign_order.length, 12);
    assert.equal(new Set(sign_order).size, 12);
    assert.equal(sign_order[0], "Aries");
    assert.equal(sign_order[11], "Pisces");
  });

  it("maps an emoji to every sign", () => {
    for (const sign of sign_order) {
      assert.ok(typeof sign_emojis[sign] === "string");
    }
  });

  it("uses an orb of 8 for every used aspect", () => {
    for (const aspect of used_aspects) {
      assert.equal(aspect.orb, 8);
    }
  });

  it("exposes non-empty natal and karmic element lists for ro and en", () => {
    assert.ok(natal_elements.ro.length > 0);
    assert.ok(natal_elements.en.length > 0);
    assert.ok(karmic_elements.ro.length > 0);
    assert.ok(karmic_elements.en.length > 0);
  });
});
