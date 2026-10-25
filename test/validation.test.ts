import "./setup-env.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Request } from "express";
import {
  validateData,
  validateMoonPhaseData,
  getValidationError,
  getPointType,
} from "../src/routes/astrology.js";

describe("validateData (birth data)", () => {
  function req(body: any): Request {
    return { body } as unknown as Request;
  }

  const validBody = {
    longitude: 26.1,
    latitude: 44.4,
    year: 1990,
    month: 1,
    day: 15,
    hour: 12,
    minute: 30,
    city: "Bucuresti",
    nation: "RO",
    name: "Tester",
  };

  it("returns 0 for a valid body", () => {
    assert.equal(validateData(req(validBody)), 0);
  });

  it("returns 21 when required fields are missing", () => {
    assert.equal(validateData(req({})), 21);
    assert.equal(validateData(req({ ...validBody, city: null })), 21);
  });

  it("returns 22 for out-of-range values", () => {
    assert.equal(validateData(req({ ...validBody, longitude: 190 })), 22);
    assert.equal(validateData(req({ ...validBody, minute: 60 })), 22);
    assert.equal(
      validateData(req({ ...validBody, city: "a\nb" })),
      22,
    );
  });

  it("rejects overly long strings", () => {
    assert.equal(
      validateData(req({ ...validBody, name: "x".repeat(101) })),
      22,
    );
  });
});

describe("validateMoonPhaseData", () => {
  function req(body: any): Request {
    return { body } as unknown as Request;
  }

  const valid = {
    longitude: 26.1,
    latitude: 44.4,
    year: 2025,
    month: 10,
    day: 5,
    hour: 8,
    minute: 15,
  };

  it("returns 0 for a valid moon-phase body", () => {
    assert.equal(validateMoonPhaseData(req(valid)), 0);
  });

  it("returns 31 for missing required fields", () => {
    assert.equal(validateMoonPhaseData(req({})), 31);
    assert.equal(
      validateMoonPhaseData(req({ ...valid, minute: null })),
      31,
    );
  });

  it("returns 32 for out-of-range body", () => {
    assert.equal(validateMoonPhaseData(req({ ...valid, hour: 24 })), 32);
    assert.equal(
      validateMoonPhaseData(req({ ...valid, city: "bad\nnewline" })),
      32,
    );
  });

  it("accepts optional city/nation and ignores them", () => {
    assert.equal(
      validateMoonPhaseData(req({ ...valid, city: "RO", nation: "x" })),
      0,
    );
  });
});

describe("getValidationError", () => {
  it("maps known codes to human messages", () => {
    assert.match(getValidationError(21), /Missing required parameters/);
    assert.match(getValidationError(22), /Invalid parameter values/);
    assert.match(getValidationError(31), /Missing required parameters/);
    assert.match(getValidationError(32), /Invalid parameter values/);
  });

  it("falls back to the default message for unknown codes", () => {
    assert.equal(getValidationError(999), "Validation error");
  });
});

describe("getPointType", () => {
  it("classifies all kinds", () => {
    assert.equal(getPointType("Sun"), "planet");
    assert.equal(getPointType("Ascendant"), "astral_point");
    assert.equal(getPointType("Chiron"), "asteroid");
    assert.equal(getPointType("Regulus"), "star");
    assert.equal(getPointType("DoesNotExists"), "astrological_point");
  });
});
