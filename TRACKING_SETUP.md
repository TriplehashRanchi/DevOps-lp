# Tracking setup

The landing page and thank-you page load Meta Pixel and Microsoft Clarity from `tracking-config.js`. A signed Razorpay `payment.captured` webhook sends confirmed ₹499 workshop purchases to Meta Conversions API (CAPI). The thank-you page itself does **not** fire `Purchase`, so a direct visit or page refresh cannot create a sale.

## Public IDs

Edit `tracking-config.js` and enter the **Meta Pixel ID** and **Microsoft Clarity project ID**. These IDs are public. The Pixel sends `PageView` on both pages and `InitiateCheckout` when a visitor clicks any workshop Razorpay button. Clarity records both pages. The tracking scripts remain off while their IDs are blank.

## Server secrets

In the Vercel project, add these Environment Variables for Production:

| Name | Value |
| --- | --- |
| `META_PIXEL_ID` | The same numeric Pixel ID used in `tracking-config.js` |
| `META_CAPI_ACCESS_TOKEN` | Access token generated for that Pixel in Meta Events Manager |
| `RAZORPAY_WEBHOOK_SECRET` | Secret chosen when creating the Razorpay webhook |
| `PUBLIC_SITE_URL` | Public landing page URL, ending in `/` |

If the Razorpay account accepts **other ₹499 INR payments**, also set `RAZORPAY_WORKSHOP_MARKER` to a phrase that appears in this workshop's payment description or notes and nowhere else. Check a real webhook payload first. Without a marker, any captured ₹499 INR payment on that account is treated as a workshop purchase.

Optional for a test deployment: `META_CAPI_TEST_EVENT_CODE` from Meta Events Manager. Remove it from Production after testing.

Deploy again after adding or changing Vercel environment variables. Never put the CAPI token or webhook secret in GitHub, `tracking-config.js`, or the browser.

## Razorpay dashboard

1. In the existing `DevOps-7D` Payment Page settings, choose **Action after successful payment → Redirect to your website** and enter `https://YOUR-SITE/thank-you.html`.
2. In **Accounts & Settings → Webhooks**, add `https://YOUR-SITE/api/razorpay-webhook` with the same webhook secret as `RAZORPAY_WEBHOOK_SECRET`. Subscribe to **`payment.captured`** only for this integration. Use the live dashboard for real payments; test mode has separate webhooks.
3. Complete one test payment and confirm: the browser reaches the thank-you page, Meta Events Manager receives one `Purchase` from the server, and the value is ₹499 INR. Then verify the live webhook delivery with a real purchase.

The webhook validates Razorpay's HMAC-SHA256 signature against the untouched request body. It only sends a `Purchase` for a captured INR 499 payment, hashes the buyer's email and phone before sending them to Meta, and uses the Razorpay payment ID as a stable Meta event ID for retry deduplication. If Meta rejects the event, the endpoint returns an error so Razorpay can retry delivery.

Razorpay Payment Pages redirect settings: https://github.com/razorpay/markdown-docs/blob/master/payments/payment-pages/create.md

Razorpay webhook validation: https://github.com/razorpay/markdown-docs/blob/master/webhooks/validate-test.md 
