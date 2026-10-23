import { afterEach, describe, expect, it, vi } from "vitest";
import { isTransientMetaFailure, MetaApiError, verifyPhoneNumber } from "./meta-api";

// The connection health check must only report "not connected" when Meta
// actually rejects the credentials. Anything else (no network, a timeout,
// rate limiting, a Meta outage) is "couldn't check" — reporting it as
// disconnected is what made a working connection look broken on a phone.

const ARGS = { phoneNumberId: "123", accessToken: "token" };

function metaReply(status: number, message = "boom") {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error("expected the call to fail");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isTransientMetaFailure", () => {
  it("treats Meta outages and rate limits as transient", () => {
    expect(isTransientMetaFailure(new MetaApiError("down", 500))).toBe(true);
    expect(isTransientMetaFailure(new MetaApiError("unavailable", 503))).toBe(true);
    expect(isTransientMetaFailure(new MetaApiError("slow down", 429))).toBe(true);
  });

  it("treats credential rejections as real failures", () => {
    expect(isTransientMetaFailure(new MetaApiError("Invalid OAuth access token", 401))).toBe(false);
    expect(isTransientMetaFailure(new MetaApiError("Unsupported get request", 400))).toBe(false);
    expect(isTransientMetaFailure(new MetaApiError("forbidden", 403))).toBe(false);
  });

  it("treats network errors and timeouts as transient", () => {
    expect(isTransientMetaFailure(new TypeError("fetch failed"))).toBe(true);
    expect(isTransientMetaFailure(new DOMException("timed out", "TimeoutError"))).toBe(true);
    expect(isTransientMetaFailure(new DOMException("aborted", "AbortError"))).toBe(true);
  });

  it("does not guess about unrelated errors", () => {
    expect(isTransientMetaFailure(new Error("something else"))).toBe(false);
    expect(isTransientMetaFailure("not an error")).toBe(false);
  });
});

describe("verifyPhoneNumber failures", () => {
  it("keeps Meta's HTTP status on the error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(metaReply(401, "Invalid OAuth access token")));
    const err = await failureOf(verifyPhoneNumber(ARGS));
    expect(err).toBeInstanceOf(MetaApiError);
    expect((err as MetaApiError).status).toBe(401);
    expect((err as MetaApiError).message).toBe("Invalid OAuth access token");
    expect(isTransientMetaFailure(err)).toBe(false);
  });

  it("reports a Meta outage as transient", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(metaReply(503)));
    expect(isTransientMetaFailure(await failureOf(verifyPhoneNumber(ARGS)))).toBe(true);
  });

  it("reports a network failure as transient", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    expect(isTransientMetaFailure(await failureOf(verifyPhoneNumber(ARGS)))).toBe(true);
  });

  it("bounds the request with a timeout signal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "123", display_phone_number: "+91 1" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await verifyPhoneNumber(ARGS);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});
