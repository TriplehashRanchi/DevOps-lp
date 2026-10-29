import test from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { POST } from "../api/razorpay-webhook.mjs";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

function requestFor(payload, secret = "test-webhook-secret", signatureOverride) {
  const body = JSON.stringify(payload);
  const signature = signatureOverride ?? createHmac("sha256", secret).update(body).digest("hex");
  return new Request("https://example.com/api/razorpay-webhook", {
    method: "POST",
    headers: { "x-razorpay-signature": signature, "content-type": "application/json" },
    body
  });
}

function capturedPayment(overrides = {}) {
  return {
    event: "payment.captured",
    created_at: 1793512800,
    payload: { payment: { entity: {
      id: "pay_test123", status: "captured", captured: true,
      amount: 49900, currency: "INR", email: "Buyer@Example.com",
      contact: "+91 99999 99999", description: "Cloud Train DevOps",
      ...overrides
    } } }
  };
}

test.beforeEach(() => {
  process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
  process.env.META_PIXEL_ID = "123456789";
  process.env.META_CAPI_ACCESS_TOKEN = "test-token";
  delete process.env.RAZORPAY_WORKSHOP_MARKER;
  delete process.env.META_CAPI_TEST_EVENT_CODE;
});

test.after(() => {
  globalThis.fetch = originalFetch;
  process.env = originalEnv;
});

test("sends one signed captured workshop purchase with hashed customer data", async () => {
  let sent;
  globalThis.fetch = async (url, options) => {
    sent = { url, ...options, payload: JSON.parse(options.body) };
    return new Response(JSON.stringify({ events_received: 1 }), { status: 200 });
  };

  const response = await POST(requestFor(capturedPayment()));
  assert.equal(response.status, 200);
  assert.equal(sent.url, "https://graph.facebook.com/v24.0/123456789/events");
  const event = sent.payload.data[0];
  assert.equal(event.event_name, "Purchase");
  assert.equal(event.event_id, "razorpay:pay_test123");
  assert.deepEqual(event.custom_data, { currency: "INR", value: 499 });
  assert.deepEqual(event.user_data.em, [createHash("sha256").update("buyer@example.com").digest("hex")]);
  assert.deepEqual(event.user_data.ph, [createHash("sha256").update("919999999999").digest("hex")]);
  assert.equal(sent.payload.access_token, "test-token");
});

test("rejects an invalid signature without contacting Meta", async () => {
  globalThis.fetch = () => { throw new Error("should not fetch"); };
  const response = await POST(requestFor(capturedPayment(), "test-webhook-secret", "0".repeat(64)));
  assert.equal(response.status, 401);
});

test("ignores non-captured and wrong-value payments", async () => {
  globalThis.fetch = () => { throw new Error("should not fetch"); };
  assert.equal((await POST(requestFor(capturedPayment({ status: "authorized", captured: false })))).status, 200);
  assert.equal((await POST(requestFor(capturedPayment({ amount: 99900 })))).status, 200);
});

test("requires a matching workshop marker when configured", async () => {
  process.env.RAZORPAY_WORKSHOP_MARKER = "devops workshop";
  globalThis.fetch = () => { throw new Error("should not fetch"); };
  const response = await POST(requestFor(capturedPayment({ description: "Other product" })));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ignored: true });
});

test("returns an error so Razorpay can retry if Meta rejects the event", async () => {
  globalThis.fetch = async () => new Response("error", { status: 400 });
  const response = await POST(requestFor(capturedPayment()));
  assert.equal(response.status, 502);
});
