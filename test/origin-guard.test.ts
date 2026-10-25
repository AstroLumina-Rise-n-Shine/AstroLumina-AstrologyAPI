import "./setup-env.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { corsOriginGuard, corsOrigins } from "../src/middleware/security.js";

describe("corsOriginGuard", () => {
  function makeReq(origin?: string): any {
    return { headers: origin ? { origin } : {} };
  }

  function makeRes() {
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

  it("passes through requests without an Origin header", () => {
    let called = false;
    const req = makeReq();
    const res = makeRes();
    corsOriginGuard(req, res, () => {
      called = true;
    });
    assert.equal(called, true);
    assert.equal(res.statusCode, undefined);
  });

  it("accepts an allowlisted origin", () => {
    let called = false;
    const origin = corsOrigins[0];
    const req = makeReq(origin);
    const res = makeRes();
    corsOriginGuard(req, res, () => {
      called = true;
    });
    assert.equal(called, true);
    assert.equal(res.statusCode, undefined);
  });

  it("rejects a foreign origin with 403", () => {
    let called = false;
    const req = makeReq("https://evil.example.com");
    const res = makeRes();
    corsOriginGuard(req, res, () => {
      called = true;
    });
    assert.equal(called, false);
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { error: "Origin not allowed" });
  });
});
