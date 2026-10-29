import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../api/update-batch.mjs";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

const whatsappLink = "https://chat.whatsapp.com/FWEjvXMdjeACDg3RqVegIT";
const current = { batchNumber: 576, startDate: "2026-11-02", recordedTime: "09:00", liveTime: "20:00", whatsappLink };
const next = { batchNumber: 577, startDate: "2026-11-16", recordedTime: "09:00", liveTime: "20:00", whatsappLink };

function requestFor(body) {
  return new Request("https://example.com/api/update-batch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function remoteFile(config) {
  const contents = "// header\nwindow.WORKSHOP_BATCH = " + JSON.stringify(config, null, 2) + ";\n";
  return { sha: "abc123", content: Buffer.from(contents).toString("base64") };
}

test.beforeEach(() => {
  process.env.ADMIN_PASSWORD = "correct-horse-battery";
  process.env.GITHUB_TOKEN = "ghp_test";
});

test.after(() => {
  globalThis.fetch = originalFetch;
  process.env = originalEnv;
});

test("commits the new batch config with the server token", async () => {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, ...options });
    if (!options.method) return Response.json(remoteFile(current));
    return Response.json({ commit: { sha: "def456" } });
  };

  const response = await POST(requestFor({ password: "correct-horse-battery", config: next, previous: current }));
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].headers.Authorization, "Bearer ghp_test");
  const put = JSON.parse(calls[1].body);
  assert.equal(put.sha, "abc123");
  assert.equal(put.branch, "main");
  const saved = Buffer.from(put.content, "base64").toString();
  assert.match(saved, /"batchNumber": "577"/);
  assert.match(saved, /"whatsappLink": "https:\/\/chat\.whatsapp\.com\/FWEjvXMdjeACDg3RqVegIT"/);
});

test("accepts alphanumeric batch names and rejects unsafe ones", async () => {
  let put;
  globalThis.fetch = async (url, options = {}) => {
    if (!options.method) return Response.json(remoteFile(current));
    put = JSON.parse(options.body);
    return Response.json({});
  };
  const ok = await POST(requestFor({ password: "correct-horse-battery", config: { ...next, batchNumber: "DO-377" }, previous: current }));
  assert.equal(ok.status, 200);
  assert.match(Buffer.from(put.content, "base64").toString(), /"batchNumber": "DO-377"/);

  const bad = await POST(requestFor({ password: "correct-horse-battery", config: { ...next, batchNumber: "<b>377</b>" } }));
  assert.equal(bad.status, 400);
});

test("rejects a link that is not a WhatsApp group invite", async () => {
  globalThis.fetch = () => { throw new Error("should not fetch"); };
  const response = await POST(requestFor({ password: "correct-horse-battery", config: { ...next, whatsappLink: "https://evil.example/chat.whatsapp.com/abc" } }));
  assert.equal(response.status, 400);
});

test("rejects a wrong password without contacting GitHub", async () => {
  globalThis.fetch = () => { throw new Error("should not fetch"); };
  const response = await POST(requestFor({ password: "nope", config: next, previous: current }));
  assert.equal(response.status, 401);
});

test("rejects an invalid config", async () => {
  globalThis.fetch = () => { throw new Error("should not fetch"); };
  const response = await POST(requestFor({ password: "correct-horse-battery", config: { ...next, startDate: "2026-11-17" } }));
  assert.equal(response.status, 400);
});

test("refuses to overwrite a newer remote update", async () => {
  globalThis.fetch = async (url, options = {}) => {
    if (options.method) throw new Error("should not write");
    return Response.json(remoteFile({ ...current, batchNumber: 999 }));
  };
  const response = await POST(requestFor({ password: "correct-horse-battery", config: next, previous: current }));
  assert.equal(response.status, 409);
});

test("stays disabled until a long enough password is configured", async () => {
  process.env.ADMIN_PASSWORD = "short";
  const response = await POST(requestFor({ password: "short", config: next }));
  assert.equal(response.status, 503);
});
