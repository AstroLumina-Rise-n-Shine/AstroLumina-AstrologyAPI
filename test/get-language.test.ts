import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Request } from "express";
import { VALID_LANGUAGES, getLanguage } from "../src/translations/index.js";

function stubRequest(lang: unknown): Request {
  return { params: { lang } } as unknown as Request;
}

describe("getLanguage", () => {
  it("normalizes params.lang to a lower-case string", () => {
    assert.equal(getLanguage(stubRequest("ro")), "ro");
    assert.equal(getLanguage(stubRequest("EN")), "en");
  });

  it("returns empty string when the lang param is absent", () => {
    assert.equal(getLanguage({ params: {} } as unknown as Request), "");
  });
});

describe("VALID_LANGUAGES", () => {
  it("contains exactly ro and en in order", () => {
    assert.deepEqual([...VALID_LANGUAGES], ["ro", "en"]);
  });
});
