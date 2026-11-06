import { describe, it } from "node:test";
import assert from "node:assert/strict";
import "./setup-env-process.js";
import type { Request, Response, NextFunction } from "express";

import {
  createError,
  globalErrorHandler,
  payloadTooLargeHandler,
  notFoundHandler,
} from "../src/middleware/error-handler.js";
import { corsOriginGuard } from "../src/middleware/security.js";

function makeRequest(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function makeResponse(): Response {
  const res: any = {
    statusCode: 200,
    _json: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(data: unknown) { this._json = data; return this; },
    type() { return this; },
    send() { return this; },
    setHeader() { return this; },
  };
  return res;
}

function nextFn(): NextFunction {
  return (() => {}) as unknown as NextFunction;
}

describe("createError", () => {
  it("creates 4xx error with expose=true", () => {
    const err = createError(400, "Bad request");
    assert.equal(err.statusCode, 400);
    assert.equal(err.message, "Bad request");
    assert.equal(err.expose, true);
    assert.equal(err instanceof Error, true);
  });

  it("creates 5xx error with expose=false", () => {
    const err = createError(500, "Internal error");
    assert.equal(err.statusCode, 500);
    assert.equal(err.expose, false);
  });
});

describe("payloadTooLargeHandler", () => {
  it("returns 413 for entity.too.large message", () => {
    const err: any = new Error("entity.too.large");
    err.type = "entity.too.large";
    const res = makeResponse();
    const next = nextFn();
    payloadTooLargeHandler(err, makeRequest(), res, next);
    assert.equal(res.statusCode, 413);
    assert.equal(res._json?.error, "Request payload too large. Maximum size is 256kB.");
  });

  it("passes through unrelated errors", () => {
    const err = new Error("something else");
    const res = makeResponse();
    let nextCalled = false;
    function next(_err: unknown) {
      nextCalled = true;
    }
    payloadTooLargeHandler(err, makeRequest(), res, next as unknown as NextFunction);
    assert.equal(nextCalled, true);
  });
});

describe("notFoundHandler", () => {
  it("returns 404", () => {
    const res = makeResponse();
    notFoundHandler(makeRequest(), res);
    assert.equal(res.statusCode, 404);
    assert.equal(res._json?.error, "Route not found");
  });
});

describe("globalErrorHandler", () => {
  it("hides message for 5xx in non-production", () => {
    const err = createError(500, "Database exploded");
    const res = makeResponse();
    globalErrorHandler(err, makeRequest(), res, nextFn());
    assert.equal(res.statusCode, 500);
    assert.equal(res._json?.error, "Internal server error");
  });

  it("surfaces message for 4xx in non-production", () => {
    const err = createError(400, "Invalid input");
    const res = makeResponse();
    globalErrorHandler(err, makeRequest(), res, nextFn());
    assert.equal(res.statusCode, 400);
    assert.equal(res._json?.error, "Invalid input");
  });
});

describe("corsOriginGuard", () => {
  const validOrigin = "https://astrolumina.pages.dev";

  it("passes requests without Origin header", () => {
    const res = makeResponse();
    const next = nextFn();
    corsOriginGuard(makeRequest({}), res, next);
    assert.equal(res.statusCode, 200);
  });

  it("passes allowlisted origin", () => {
    const res = makeResponse();
    const next = nextFn();
    corsOriginGuard(makeRequest({ origin: validOrigin }), res, next);
    assert.equal(res.statusCode, 200);
  });

  it("rejects foreign origin with 403", () => {
    const res = makeResponse();
    const next = nextFn();
    corsOriginGuard(makeRequest({ origin: "https://evil.com" }), res, next);
    assert.equal(res.statusCode, 403);
    assert.equal(res._json?.error, "Origin not allowed");
  });
});
