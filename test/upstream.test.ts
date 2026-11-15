import { describe, it } from "node:test";
import assert from "node:assert/strict";
import "./setup-env-process.js";
import type { Request } from "express";
import {
  validateData,
  validateMoonPhaseData,
  getValidationError,
  getPointType,
} from "../src/routes/astrology.js";

function makeRequest(body: unknown): Request {
  return { body } as unknown as Request;
}

describe("getPointType", () => {
  it("classifies planets", () => {
    for (const name of ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]) {
      assert.equal(getPointType(name), "planet");
    }
  });

  it("classifies astral points", () => {
    for (const name of ["Ascendant", "Descendant", "True_North_Lunar_Node", "True_South_Lunar_Node", "Mean_Lilith", "Medium_Coeli", "Imum_Coeli"]) {
      assert.equal(getPointType(name), "astral_point");
    }
  });

  it("classifies asteroids", () => {
    for (const name of ["Chiron", "Juno", "Pholus", "Ceres", "Pallas", "Vesta", "Eris", "Sedna", "Haumea", "Makemake", "Ixion", "Orcus", "Quaoar"]) {
      assert.equal(getPointType(name), "asteroid");
    }
  });

  it("classifies stars", () => {
    assert.equal(getPointType("Regulus"), "star");
    assert.equal(getPointType("Spica"), "star");
  });

  it("classifies unknown as astrological_point", () => {
    assert.equal(getPointType("Unknown_Object"), "astrological_point");
    assert.equal(getPointType(""), "astrological_point");
    assert.equal(getPointType("Earth"), "astrological_point");
  });
});

describe("validateData (birth data)", () => {
  const validBody = {
    longitude: 25.123,
    latitude: 45.456,
    year: 1990,
    month: 6,
    day: 15,
    hour: 14,
    minute: 30,
    city: "București",
    nation: "România",
    name: "Ion Popescu",
  };

  it("returns 0 for valid body", () => {
    assert.equal(validateData(makeRequest(validBody)), 0);
  });

  it("returns 21 when any required field missing", () => {
    const fields = Object.keys(validBody);
    for (const field of fields) {
      const body = { ...validBody };
      delete body[field];
      assert.equal(validateData(makeRequest(body)), 21, `missing ${field}`);
    }
  });

  it("returns 21 when any required field is null", () => {
    const body = { ...validBody, city: null };
    assert.equal(validateData(makeRequest(body)), 21);
  });

  it("returns 22 for out of range longitude", () => {
    assert.equal(validateData(makeRequest({ ...validBody, longitude: -181 })), 22);
    assert.equal(validateData(makeRequest({ ...validBody, longitude: 181 })), 22);
  });

  it("returns 22 for out of range latitude", () => {
    assert.equal(validateData(makeRequest({ ...validBody, latitude: -91 })), 22);
    assert.equal(validateData(makeRequest({ ...validBody, latitude: 91 })), 22);
  });

  it("returns 22 for out of range year", () => {
    assert.equal(validateData(makeRequest({ ...validBody, year: 0 })), 22);
    assert.equal(validateData(makeRequest({ ...validBody, year: 3001 })), 22);
  });

  it("returns 22 for out of range month", () => {
    assert.equal(validateData(makeRequest({ ...validBody, month: 0 })), 22);
    assert.equal(validateData(makeRequest({ ...validBody, month: 13 })), 22);
  });

  it("returns 22 for out of range day", () => {
    assert.equal(validateData(makeRequest({ ...validBody, day: 0 })), 22);
    assert.equal(validateData(makeRequest({ ...validBody, day: 32 })), 22);
  });

  it("returns 22 for out of range hour", () => {
    assert.equal(validateData(makeRequest({ ...validBody, hour: -1 })), 22);
    assert.equal(validateData(makeRequest({ ...validBody, hour: 24 })), 22);
  });

  it("returns 22 for out of range minute", () => {
    assert.equal(validateData(makeRequest({ ...validBody, minute: -1 })), 22);
    assert.equal(validateData(makeRequest({ ...validBody, minute: 60 })), 22);
  });

  it("returns 22 for CR/LF in city", () => {
    assert.equal(validateData(makeRequest({ ...validBody, city: "București\n" })), 22);
    assert.equal(validateData(makeRequest({ ...validBody, city: "București\r" })), 22);
    assert.equal(validateData(makeRequest({ ...validBody, city: "București\r\n" })), 22);
  });

  it("accepts boundary longitude -180/180 and latitude -90/90", () => {
    for (const lon of [-180, 180]) {
      for (const lat of [-90, 90]) {
        assert.equal(validateData(makeRequest({ ...validBody, longitude: lon, latitude: lat })), 0);
      }
    }
  });
});

describe("validateMoonPhaseData", () => {
  const validBody = {
    longitude: 25.123,
    latitude: 45.456,
    year: 1990,
    month: 6,
    day: 15,
    hour: 14,
    minute: 30,
  };

  it("returns 0 for valid body", () => {
    assert.equal(validateMoonPhaseData(makeRequest(validBody)), 0);
  });

  it("returns 31 when required numeric field missing", () => {
    for (const field of ["longitude", "latitude", "year", "month", "day", "hour", "minute"]) {
      const body = { ...validBody };
      delete body[field];
      assert.equal(validateMoonPhaseData(makeRequest(body)), 31, `missing ${field}`);
    }
  });

  it("returns 32 for out of range longitude", () => {
    assert.equal(validateMoonPhaseData(makeRequest({ ...validBody, longitude: 200 })), 32);
    assert.equal(validateMoonPhaseData(makeRequest({ ...validBody, longitude: -200 })), 32);
  });

  it("returns 32 for out of range latitude", () => {
    assert.equal(validateMoonPhaseData(makeRequest({ ...validBody, latitude: 100 })), 32);
  });

  it("returns 32 for out of range year", () => {
    assert.equal(validateMoonPhaseData(makeRequest({ ...validBody, year: 0 })), 32);
    assert.equal(validateMoonPhaseData(makeRequest({ ...validBody, year: 3001 })), 32);
  });

  it("accepts optional city and nation", () => {
    const body = { ...validBody, city: "București", nation: "România" };
    assert.equal(validateMoonPhaseData(makeRequest(body)), 0);
  });
});

describe("getValidationError", () => {
  it("maps code 21 to missing params message", () => {
    assert.equal(getValidationError(21), "Missing required parameters. Please provide: longitude, latitude, year, month, day, hour, minute, city, nation, name");
  });

  it("maps code 22 to invalid values message", () => {
    assert.equal(getValidationError(22), "Invalid parameter values. Check ranges: longitude [-180,180], latitude [-90,90], year [1,3000], month [1,12], day [1,31], hour [0,23], minute [0,59].");
  });

  it("maps code 31 to moon phase missing params", () => {
    assert.equal(getValidationError(31), "Missing required parameters. Please provide: longitude, latitude, year, month, day, hour, minute.");
  });

  it("maps code 32 to moon phase invalid values", () => {
    assert.equal(getValidationError(32), "Invalid parameter values. Check ranges: longitude [-180,180], latitude [-90,90], year [1,3000], month [1,12], day [1,31], hour [0,23], minute [0,59].");
  });

  it("returns generic message for unknown codes", () => {
    assert.equal(getValidationError(99), "Validation error");
    assert.equal(getValidationError(-1), "Validation error");
  });
});
