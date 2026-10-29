import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const EXPECTED_AMOUNT_PAISE = 49900;

function matchesSignature(body, signature, secret) {
  if (!/^[a-f0-9]{64}$/i.test(signature || "")) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function matchesWorkshop(payment) {
  if (payment?.status !== "captured" || payment.captured !== true) return false;
  if (payment.currency !== "INR" || payment.amount !== EXPECTED_AMOUNT_PAISE) return false;

  // Set this if the Razorpay account also sells other ₹499 products.
  const marker = process.env.RAZORPAY_WORKSHOP_MARKER?.trim().toLowerCase();
  if (!marker) return true;
  const searchable = [payment.description, ...Object.values(payment.notes || {})]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
  return searchable.includes(marker);
}

function conversionEvent(payment, webhook) {
  const email = typeof payment.email === "string" ? payment.email.trim().toLowerCase() : "";
  const phone = typeof payment.contact === "string" ? payment.contact.replace(/\D/g, "") : "";
  const userData = {};
  if (email) userData.em = [hash(email)];
  if (phone) userData.ph = [hash(phone)];

  return {
    event_name: "Purchase",
    event_time: Number.isInteger(webhook.created_at) ? webhook.created_at : Math.floor(Date.now() / 1000),
    event_id: `razorpay:${payment.id}`,
    action_source: "website",
    event_source_url: process.env.PUBLIC_SITE_URL || "https://devops-sepia-tau.vercel.app/",
    user_data: userData,
    custom_data: { currency: "INR", value: payment.amount / 100 }
  };
}

export async function POST(request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!secret || !pixelId || !token || !/^\d+$/.test(pixelId)) {
    return Response.json({ error: "Tracking is not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!matchesSignature(rawBody, request.headers.get("x-razorpay-signature"), secret)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let webhook;
  try {
    webhook = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (webhook.event !== "payment.captured") {
    return Response.json({ ignored: true });
  }

  const payment = webhook.payload?.payment?.entity;
  if (!payment?.id || !matchesWorkshop(payment)) {
    return Response.json({ ignored: true });
  }

  const payload = { data: [conversionEvent(payment, webhook)], access_token: token };
  if (process.env.META_CAPI_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_CAPI_TEST_EVENT_CODE;
  }

  try {
    const result = await fetch(`https://graph.facebook.com/v24.0/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3500)
    });
    if (!result.ok) {
      console.error("Meta CAPI rejected purchase event", result.status, await result.text());
      return Response.json({ error: "Conversion delivery failed" }, { status: 502 });
    }
  } catch (error) {
    console.error("Meta CAPI purchase event failed", error);
    return Response.json({ error: "Conversion delivery failed" }, { status: 502 });
  }

  return Response.json({ received: true });
}
