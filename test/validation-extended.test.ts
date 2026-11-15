import { describe, it } from "node:test";
import assert from "node:assert/strict";
import "./setup-env.js";
import type { Request } from "express";
import {
  validateData,
  validateMoonPhaseData,
  getValidationError,
  getPointType,
} from "../src/routes/astrology.js";

function makeValidBody(): Record<string, unknown> {
  return {
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
}

describe("validateData", () => {
  it("returns 0 for fully valid birth data", () => {
    assert.equal(validateData({ body: makeValidBody() } as unknown as Request), 0);
  });

  it("returns 21 when any required field is missing", () => {
    const required = [
      "longitude", "latitude", "year", "month", "day", "hour", "minute",
      "city", "nation", "name",
    ];
    for (const field of required) {
      const body = makeValidBody();
      delete body[field];
      assert.equal(
        validateData({ body } as unknown as Request),
        21,
        `missing ${field} should return 21`,
      );
    }
  });

  it("returns 21 when any required field is null", () => {
    const body = makeValidBody();
    body.city = null;
    assert.equal(validateData({ body } as unknown as Request), 21);
  });

  it("returns 22 when longitude is out of range", () => {
    for (const bad of [-181, 181]) {
      const body = makeValidBody();
      body.longitude = bad;
      assert.equal(validateData({ body } as unknown as Request), 22);
    }
  });

  it("returns 22 when latitude is out of range", () => {
    for (const bad of [-91, 91]) {
      const body = makeValidBody();
      body.latitude = bad;
      assert.equal(validateData({ body } as unknown as Request), 22);
    }
  });

  it("returns 22 when year is out of range", () => {
    for (const bad of [0, 3001]) {
      const body = makeValidBody();
      body.year = bad;
      assert.equal(validateData({ body } as unknown as Request), 22);
    }
  });

  it("returns 22 when month is out of range", () => {
    for (const bad of [0, 13]) {
      const body = makeValidBody();
      body.month = bad;
      assert.equal(validateData({ body } as unknown as Request), 22);
    }
  });

  it("returns 22 when day is out of range", () => {
    for (const bad of [0, 32]) {
      const body = makeValidBody();
      body.day = bad;
      assert.equal(validateData({ body } as unknown as Request), 22);
    }
  });

  it("returns 22 when hour is out of range", () => {
    for (const bad of [-1, 24]) {
      const body = makeValidBody();
      body.hour = bad;
      assert.equal(validateData({ body } as unknown as Request), 22);
    }
  });

  it("returns 22 when minute is out of range", () => {
    for (const bad of [-1, 60]) {
      const body = makeValidBody();
      body.minute = bad;
      assert.equal(validateData({ body } as unknown as Request), 22);
    }
  });

  it("returns 22 when city contains CR/LF", () => {
    for (const bad of ["Bucuresti\n", "Bucuresti\r", "Bucuresti\r\n"]) {
      const body = makeValidBody();
      body.city = bad;
      assert.equal(validateData({ body } as unknown as Request), 22);
    }
  });

  it("returns 22 when nation contains CR/LF", () => {
    const body = makeValidBody();
    body.nation = "Romania\n";
    assert.equal(validateData({ body } as unknown as Request), 22);
  });

  it("returns 22 when name contains CR/LF", () => {
    const body = makeValidBody();
    body.name = "Ion\rPopescu";
    assert.equal(validateData({ body } as unknown as Request), 22);
  });

  it("accepts boundary values: longitude -180/180, latitude -90/90", () => {
    for (const lon of [-180, 180]) {
      for (const lat of [-90, 90]) {
        const body = makeValidBody();
        body.longitude = lon;
        body.latitude = lat;
        assert.equal(validateData({ body } as unknown as Request), 0);
      }
    }
  });
});

describe("validateMoonPhaseData", () => {
  it("returns 0 for valid moon phase data", () => {
    const body = {
      longitude: 25.123,
      latitude: 45.456,
      year: 1990,
      month: 6,
      day: 15,
      hour: 14,
      minute: 30,
    };
    assert.equal(
      validateMoonPhaseData({ body } as unknown as Request),
      0,
    );
  });

  it("returns 31 when longitude is missing", () => {
    const body = { latitude: 45.456, year: 1990, month: 6, day: 15, hour: 14, minute: 30 };
    assert.equal(
      validateMoonPhaseData({ body } as unknown as Request),
      31,
    );
  });

  it("returns 31 when latitude is missing", () => {
    const body = { longitude: 25.123, year: 1990, month: 6, day: 15, hour: 14, minute: 30 };
    assert.equal(
      validateMoonPhaseData({ body } as unknown as Request),
      31,
    );
  });

  it("returns 31 when year is missing", () => {
    const body = { longitude: 25.123, latitude: 45.456, month: 6, day: 15, hour: 14, minute: 30 };
    assert.equal(
      validateMoonPhaseData({ body } as unknown as Request),
      31,
    );
  });

  it("returns 32 when longitude is out of range", () => {
    const body = { longitude: 200, latitude: 45.456, year: 1990, month: 6, day: 15, hour: 14, minute: 30 };
    assert.equal(
      validateMoonPhaseData({ body } as unknown as Request),
      32,
    );
  });

  it("returns 32 when latitude is out of range", () => {
    const body = { longitude: 25.123, latitude: 100, year: 1990, month: 6, day: 15, hour: 14, minute: 30 };
    assert.equal(
      validateMoonPhaseData({ body } as unknown as Request),
      32,
    );
  });

  it("returns 32 when year is out of range", () => {
    const body = { longitude: 25.123, latitude: 45.456, year: 0, month: 6, day: 15, hour: 14, minute: 30 };
    assert.equal(
      validateMoonPhaseData({ body } as unknown as Request),
      32,
    );
  });

  it("accepts optional city and nation", () => {
    const body = {
      longitude: 25.123,
      latitude: 45.456,
      year: 1990,
      month: 6,
      day: 15,
      hour: 14,
      minute: 30,
      city: "București",
      nation: "România",
    };
    assert.equal(
      validateMoonPhaseData({ body } as unknown as Request),
      0,
    );
  });
});

describe("getValidationError", () => {
  it("returns the missing-parameters message for code 21", () => {
    assert.equal(getValidationError(21), "Missing required parameters. Please provide: longitude, latitude, year, month, day, hour, minute, city, nation, name");
  });

  it("returns the invalid-values message for code 22", () => {
    assert.equal(getValidationError(22), "Invalid parameter values. Check ranges: longitude [-180,180], latitude [-90,90], year [1,3000], month [1,12], day [1,31], hour [0,23], minute [0,59].");
  });

  it("returns the moon-phase missing message for code 31", () => {
    assert.equal(getValidationError(31), "Missing required parameters. Please provide: longitude, latitude, year, month, day, hour, minute.");
  });

  it("returns the moon-phase invalid message for code 32", () => {
    assert.equal(getValidationError(32), "Invalid parameter values. Check ranges: longitude [-180,180], latitude [-90,90], year [1,3000], month [1,12], day [1,31], hour [0,23], minute [0,59].");
  });

  it("returns a generic message for unknown codes", () => {
    assert.equal(getValidationError(99), "Validation error");
    assert.equal(getValidationError(-1), "Validation error");
  });
});

describe("getPointType", () => {
  it("returns planet for planet names", () => {
    for (const name of ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]) {
      assert.equal(getPointType(name), "planet");
    }
  });

  it("returns astral_point for astral point names", () => {
    for (const name of ["Ascendant", "Descendant", "True_North_Lunar_Node", "Mean_Lilith", "Medium_Coeli", "Imum_Coeli"]) {
      assert.equal(getPointType(name), "astral_point");
    }
  });

  it("returns asteroid for asteroid names", () => {
    for (const name of ["Chiron", "Juno", "Pholus", "Ceres", "Pallas", "Vesta", "Eris"]) {
      assert.equal(getPointType(name), "asteroid");
    }
  });

  it("returns star for star names", () => {
    for (const name of ["Regulus", "Spica"]) {
      assert.equal(getPointType(name), "star");
    }
  });

  it("returns astrological_point for unknown names", () => {
    assert.equal(getPointType("Unknown_Object"), "astrological_point");
    assert.equal(getPointType(""), "astrological_point");
  });
});
