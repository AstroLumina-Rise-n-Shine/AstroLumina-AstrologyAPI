import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createError,
  payloadTooLargeHandler,
  notFoundHandler,
  globalErrorHandler,
} from "../src/middleware/error-handler.js";

describe("createError", () => {
  it("sets statusCode/expose for 4xx errors", () => {
    const err = createError(400, "bad input");
    assert.equal(err.statusCode, 400);
    assert.equal(err.expose, true);
    assert.equal(err.message, "bad input");
  });

  it("hides messages for 5xx errors", () => {
    const err = createError(500, "boom");
    assert.equal(err.statusCode, 500);
    assert.equal(err.expose, false);
  });
});

describe("error handlers", () => {
  function mockRes() {
    const res: any = {};
    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };
    res.json = (body: any) => {
      res.body = body;
      return res;
    };
    return res;
  }

  function makeReq() {
    return {} as any;
  }

  it("payloadTooLargeHandler replies 413 for entity.too.large", () => {
    const res = mockRes();
    const next = (e?: any) => {
      (res as any).nexted = e;
    };
    payloadTooLargeHandler(
      { message: "request entity.too.large", type: "entity.too.large" } as any,
      makeReq(),
      res as any,
      next,
    );
    assert.equal(res.statusCode, 413);
    assert.deepEqual(res.body, {
      error: "Request payload too large. Maximum size is 256kB.",
    });
    assert.equal((res as any).nexted, undefined);
  });

  it("payloadTooLargeHandler forwards unrelated errors", () => {
    const res = mockRes();
    let forwarded: any;
    payloadTooLargeHandler(
      { message: "something else", type: "boom" } as any,
      makeReq(),
      res as any,
      (e?: any) => {
        forwarded = e;
      },
    );
    assert.equal(forwarded?.message, "something else");
  });

  it("notFoundHandler responds 404", () => {
    const res = mockRes();
    notFoundHandler(makeReq(), res as any);
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { error: "Route not found" });
  });

  it("globalErrorHandler hides internal details for 5xx", () => {
    const res = mockRes();
    globalErrorHandler(
      { statusCode: 500, message: "database exploded" } as any,
      makeReq(),
      res as any,
      () => {},
    );
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: "Internal server error" });
  });

  it("globalErrorHandler surfaces message for 4xx", () => {
    const res = mockRes();
    globalErrorHandler(
      { statusCode: 400, message: "bad input" } as any,
      makeReq(),
      res as any,
      () => {},
    );
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "bad input" });
  });
});
