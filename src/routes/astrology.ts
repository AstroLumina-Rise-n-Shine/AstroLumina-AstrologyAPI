import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod";
import axios from "axios";
import { find as timezone } from "geo-tz";
import { Sentry } from "../instrument.js";
import { env } from "../config/env.js";
import { strictRateLimiter } from "../middleware/security.js";
import {
  used_elements,
  used_element_symbols,
  used_houses,
  used_aspects,
  used_planets,
  used_astral_points,
  used_asteroids,
  used_stars,
  natal_elements,
  karmic_elements,
} from "../constants.js";
import {
  validateLanguage,
  loadTranslations,
  getLanguage,
} from "../translations/index.js";
import type {
  BirthDataResponse,
  MoonPhaseResponse,
} from "../types/astrology.js";

const router = Router();

// ─── Validation ───────────────────────────────────────────────
// Zod schemas enforce the same numeric ranges as before and add maximum
// string lengths plus CR/LF rejection. The schemas are intentionally NOT
// `.strict()`: existing clients may send extra optional fields (e.g. the
// frontend's LunarDataPayload carries city/nation), and unknown keys are
// ignored when building the upstream request anyway.

function safeString(maxLength: number) {
  return z
    .string()
    .min(1)
    .max(maxLength)
    .refine((value) => !/[\r\n]/.test(value), {
      message: "must not contain CR/LF characters",
    });
}

const birthDataSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  year: z.number().int().min(1).max(3000),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  city: safeString(100),
  nation: safeString(100),
  name: safeString(100),
});

const REQUIRED_BIRTH_FIELDS = [
  "longitude",
  "latitude",
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "city",
  "nation",
  "name",
] as const;

export function validateData(req: Request): number {
  const body = req.body as Record<string, unknown>;

  if (
    REQUIRED_BIRTH_FIELDS.some(
      (field) => body[field] === undefined || body[field] === null,
    )
  ) {
    return 21;
  }

  return birthDataSchema.safeParse(body).success ? 0 : 22;
}

export function getValidationError(code: number): string {
  switch (code) {
    case 21:
      return "Missing required parameters. Please provide: longitude, latitude, year, month, day, hour, minute, city, nation, name";
    case 22:
      return "Invalid parameter values. Check ranges: longitude [-180,180], latitude [-90,90], year [1,3000], month [1,12], day [1,31], hour [0,23], minute [0,59].";
    case 31:
      return "Missing required parameters. Please provide: longitude, latitude, year, month, day, hour, minute.";
    case 32:
      return "Invalid parameter values. Check ranges: longitude [-180,180], latitude [-90,90], year [1,3000], month [1,12], day [1,31], hour [0,23], minute [0,59].";
    default:
      return "Validation error";
  }
}

export function validateMoonPhaseData(req: Request): number {
  const body = req.body as Record<string, unknown>;
  const { longitude, latitude, year, month, day, hour, minute } = body;

  if (
    longitude === undefined ||
    longitude === null ||
    latitude === undefined ||
    latitude === null ||
    year === undefined ||
    year === null ||
    month === undefined ||
    month === null ||
    day === undefined ||
    day === null ||
    hour === undefined ||
    hour === null ||
    minute === undefined ||
    minute === null
  ) {
    return 31;
  }

  const moonPhaseSchema = z.object({
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
    year: z.number().int().min(1).max(3000),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    // Optional passthrough fields the frontend may still send; they are not
    // used for the upstream moon-phase call but get the same limits.
    city: safeString(100).optional(),
    nation: safeString(100).optional(),
  });

  if (!moonPhaseSchema.safeParse(body).success) {
    return 32;
  }

  return 0;
}

// ─── Helpers ──────────────────────────────────────────────────

export function getPointType(name: string): string {
  if (used_planets.includes(name)) return "planet";
  if (used_astral_points.includes(name)) return "astral_point";
  if (used_asteroids.includes(name)) return "asteroid";
  if (used_stars.includes(name)) return "star";
  return "astrological_point";
}

function buildOptions(body: Record<string, unknown>) {
  const {
    longitude,
    latitude,
    year,
    month,
    day,
    hour,
    minute,
    city,
    nation,
    name,
  } = body;
  const tz = timezone(latitude as number, longitude as number)[0];

  return {
    method: "POST" as const,
    url: `${env.ASTROLOGER_API_URL}/api/v5/chart/birth-chart`,
    headers: {
      "x-rapidapi-key": env.ASTROLOGER_API_KEY,
      "x-rapidapi-host": env.ASTROLOGER_API_HOST,
      "Content-Type": "application/json",
    },
    data: {
      subject: {
        name,
        year,
        month,
        day,
        hour,
        minute,
        longitude,
        latitude,
        city,
        nation,
        timezone: tz,
        zodiac_type: "Tropical",
        perspective_type: "Apparent Geocentric",
        houses_system_identifier: "P",
      },
      active_points: used_elements,
      active_aspects: used_aspects,
      theme: "light",
      style: "modern",
    },
  };
}

async function fetchBirthData(
  body: Record<string, unknown>,
): Promise<BirthDataResponse> {
  const { city, nation, year } = body;

  return Sentry.startSpan(
    { op: "http.client", name: "POST Astrologer API /birth-chart" },
    async (span) => {
      span?.setAttribute("astro.city", city as string);
      span?.setAttribute("astro.nation", nation as string);
      span?.setAttribute("astro.year", year as number);

      const options = buildOptions(body);
      const response = await axios.request<BirthDataResponse>(options);
      return response.data;
    },
  );
}

function buildMoonPhaseOptions(body: Record<string, unknown>) {
  const { longitude, latitude, year, month, day, hour, minute } = body;
  const tz = timezone(latitude as number, longitude as number)[0];

  return {
    method: "POST" as const,
    url: `${env.ASTROLOGER_API_URL}/api/v5/moon-phase`,
    headers: {
      "x-rapidapi-key": env.ASTROLOGER_API_KEY,
      "x-rapidapi-host": env.ASTROLOGER_API_HOST,
      "Content-Type": "application/json",
    },
    data: {
      year,
      month,
      day,
      hour,
      minute,
      latitude,
      longitude,
      timezone: tz,
    },
  };
}

async function fetchMoonPhase(
  body: Record<string, unknown>,
): Promise<MoonPhaseResponse> {
  const { year, latitude } = body;

  return Sentry.startSpan(
    { op: "http.client", name: "POST Astrologer API /moon-phase" },
    async (span) => {
      span?.setAttribute("astro.year", year as number);
      span?.setAttribute("astro.latitude", latitude as number);

      const options = buildMoonPhaseOptions(body);
      const response = await axios.request<MoonPhaseResponse>(options);
      return response.data;
    },
  );
}

function requireLanguage(req: Request, res: Response): string | null {
  const lang = getLanguage(req);
  if (!validateLanguage(lang)) {
    res
      .status(400)
      .json({ error: "Invalid language specified. Use ro or en." });
    return null;
  }
  return lang;
}

function requireValidBody(req: Request, res: Response): boolean {
  const validation = validateData(req);
  if (validation !== 0) {
    res.status(400).json({ error: getValidationError(validation) });
    return false;
  }
  return true;
}

// ─── Routes ───────────────────────────────────────────────────

router.post(
  "/api/v2/:lang/birth-data",
  // Raw birth chart is the most abuse-prone endpoint (paid upstream call per
  // request, not used by the SPA flow) — stricter per-IP limit on top of the
  // global limiter.
  strictRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    const lang = requireLanguage(req, res);
    if (!lang) return;

    Sentry.setContext("request", { endpoint: "birth-data", language: lang });

    if (!requireValidBody(req, res)) return;

    try {
      const allData = await fetchBirthData(req.body);
      res.json(allData);
    } catch (error) {
      console.error("Error fetching birth data:", (error as Error).message);
      Sentry.captureException(error, {
        tags: { endpoint: "birth-data", language: lang },
      });
      next(error);
    }
  },
);

async function handleAstralData(
  type: string,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const lang = requireLanguage(req, res);
  if (!lang) return;

  Sentry.setContext("request", {
    endpoint: "astral-data",
    language: lang,
    type: type || "full",
  });

  if (!requireValidBody(req, res)) return;

  const t = loadTranslations(lang);

  try {
    const birthData = await Sentry.startSpan(
      { op: "astro.filter", name: `astral-data/${type || "full"}` },
      async () => fetchBirthData(req.body),
    );

    const cosmicElements = birthData.chart_data.subject;

    const cosmicElementsFilteredData = Object.keys(cosmicElements)
      .filter((key) => {
        const el = cosmicElements[key];
        return (
          el !== null &&
          typeof el === "object" &&
          used_elements.includes(el.name)
        );
      })
      .map((key) => cosmicElements[key]!)
      .sort(
        (a, b) =>
          used_elements.indexOf(a!.name) - used_elements.indexOf(b!.name),
      )
      .map((planet) => {
        const pointType = getPointType(planet!.name);
        return {
          ...planet,
          point_type: t.types[pointType] ?? pointType,
          name: t.planets[planet!.name] ?? planet!.name,
          house: t.houses[planet!.house ?? ""] ?? planet!.house,
          sign: t.signs[planet!.sign] ?? planet!.sign,
          symbol: used_element_symbols[planet!.name] ?? "",
          element: t.elements[planet!.element ?? ""] ?? planet!.element,
        };
      });

    const cosmicHousesFilteredData = Object.keys(cosmicElements)
      .filter((key) => {
        const el = cosmicElements[key];
        return (
          el !== null && typeof el === "object" && used_houses.includes(el.name)
        );
      })
      .map((key) => cosmicElements[key]!)
      .sort(
        (a, b) => used_houses.indexOf(a!.name) - used_houses.indexOf(b!.name),
      )
      .map((house) => ({
        ...house,
        name: t.houses[house!.name] ?? house!.name,
        sign: t.signs[house!.sign] ?? house!.sign,
        element: t.elements[house!.element ?? ""] ?? house!.element,
      }));

    const cosmicAspectsFilteredData = birthData.chart_data.aspects.map((a) => ({
      ...a,
      p1_name: t.planets[a.p1_name] ?? a.p1_name,
      p2_name: t.planets[a.p2_name] ?? a.p2_name,
      aspect: t.aspects[a.aspect] ?? a.aspect,
    }));

    let allData: {
      cosmic_elements: typeof cosmicElementsFilteredData;
      cosmic_houses: typeof cosmicHousesFilteredData;
      cosmic_aspects: typeof cosmicAspectsFilteredData;
    } = {
      cosmic_elements: cosmicElementsFilteredData,
      cosmic_houses: cosmicHousesFilteredData,
      cosmic_aspects: cosmicAspectsFilteredData,
    };

    switch (type) {
      case "natal":
        allData = {
          cosmic_elements: cosmicElementsFilteredData.filter((p) =>
            natal_elements[lang]!.includes(p.name),
          ),
          cosmic_houses: cosmicHousesFilteredData,
          cosmic_aspects: cosmicAspectsFilteredData.filter(
            (a) =>
              natal_elements[lang]!.includes(a.p1_name) &&
              natal_elements[lang]!.includes(a.p2_name),
          ),
        };
        break;
      case "karmic":
        allData = {
          cosmic_elements: cosmicElementsFilteredData.filter((p) =>
            karmic_elements[lang]!.includes(p.name),
          ),
          cosmic_houses: cosmicHousesFilteredData,
          cosmic_aspects: cosmicAspectsFilteredData.filter(
            (a) =>
              (karmic_elements[lang]!.includes(a.p1_name) &&
                (karmic_elements[lang]!.includes(a.p2_name) ||
                  natal_elements[lang]!.includes(a.p2_name))) ||
              (karmic_elements[lang]!.includes(a.p2_name) &&
                (karmic_elements[lang]!.includes(a.p1_name) ||
                  natal_elements[lang]!.includes(a.p1_name))),
          ),
        };
        break;
      default:
        break;
    }

    res.json(allData);
  } catch (error) {
    console.error("Error fetching astral data:", (error as Error).message);
    Sentry.captureException(error, {
      tags: { endpoint: "astral-data", language: lang, type: type || "full" },
    });
    next(error);
  }
}

router.post(
  "/api/v2/:lang/astral-data",
  (req: Request, res: Response, next: NextFunction) => {
    handleAstralData("", req, res, next);
  },
);

router.post(
  "/api/v2/:lang/astral-data/:type",
  (req: Request, res: Response, next: NextFunction) => {
    const type = String(req.params["type"] ?? "").toLowerCase();
    handleAstralData(type, req, res, next);
  },
);

router.post(
  "/api/v2/:lang/astral-chart",
  async (req: Request, res: Response, next: NextFunction) => {
    const lang = requireLanguage(req, res);
    if (!lang) return;

    Sentry.setContext("request", { endpoint: "astral-chart", language: lang });

    if (!requireValidBody(req, res)) return;

    try {
      const birthData = await fetchBirthData(req.body);
      res.json(birthData.chart);
    } catch (error) {
      console.error("Error fetching astral chart:", (error as Error).message);
      Sentry.captureException(error, {
        tags: { endpoint: "astral-chart", language: lang },
      });
      next(error);
    }
  },
);

router.post(
  "/api/v2/:lang/lunar-data",
  async (req: Request, res: Response, next: NextFunction) => {
    const lang = requireLanguage(req, res);
    if (!lang) return;

    Sentry.setContext("request", { endpoint: "lunar-data", language: lang });

    const validation = validateMoonPhaseData(req);
    if (validation !== 0) {
      res.status(400).json({ error: getValidationError(validation) });
      return;
    }

    try {
      const moonPhaseData = await fetchMoonPhase(req.body);
      const t = loadTranslations(lang);

      const translatedData = {
        ...moonPhaseData,
        moon_phase_overview: {
          ...moonPhaseData.moon_phase_overview,
          moon: {
            ...moonPhaseData.moon_phase_overview.moon,
            phase_name:
              t.lunar_phases?.[
                moonPhaseData.moon_phase_overview.moon.phase_name as string
              ] ?? moonPhaseData.moon_phase_overview.moon.phase_name,
            major_phase:
              t.lunar_phases?.[
                moonPhaseData.moon_phase_overview.moon.major_phase as string
              ] ?? moonPhaseData.moon_phase_overview.moon.major_phase,
            zodiac: {
              ...moonPhaseData.moon_phase_overview.moon.zodiac,
              moon_sign:
                t.signs?.[
                  moonPhaseData.moon_phase_overview.moon.zodiac
                    .moon_sign as string
                ] ?? moonPhaseData.moon_phase_overview.moon.zodiac.moon_sign,
              sun_sign:
                t.signs?.[
                  moonPhaseData.moon_phase_overview.moon.zodiac
                    .sun_sign as string
                ] ?? moonPhaseData.moon_phase_overview.moon.zodiac.sun_sign,
            },
          },
        },
      };

      res.json(translatedData.moon_phase_overview);
    } catch (error) {
      console.error("Error fetching lunar data:", (error as Error).message);
      Sentry.captureException(error, {
        tags: { endpoint: "lunar-data", language: lang },
      });
      next(error);
    }
  },
);

export default router;
