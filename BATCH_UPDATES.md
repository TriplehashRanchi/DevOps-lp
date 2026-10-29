# Updating a workshop batch

This static site uses `batch-config.js` for its batch number, first Monday, recorded lesson release time, and live session time. The public page calculates all seven curriculum dates, the Day 8 closing session, live dates, countdowns, and start labels from those settings.

## First-time setup (once)

1. Deploy this repository to Vercel with `main` as the production branch, connected to `CloudTrain-code/landingpage`.
2. Create a GitHub fine-grained personal access token restricted to that repository with **Contents: Read and write** permission.
3. In Vercel → Project → Settings → Environment Variables (Production), add:

   | Name | Value |
   | --- | --- |
   | `GITHUB_TOKEN` | The token from step 2 |
   | `ADMIN_PASSWORD` | A password of at least 12 characters, for the admin page |

4. Redeploy so the variables take effect.

## For each new batch

1. Open `https://YOUR-SITE/admin.html`.
2. Enter the batch number, first Monday, the recorded and live times in IST, and the batch's WhatsApp group invite link (`https://chat.whatsapp.com/…`). The thank-you page shows this link as its **Join Your WhatsApp Group** button and says joining instructions go out at 5 PM IST the day before the start date.
3. Review the generated schedule. Saturday and Sunday are skipped; Day 6 is the following Monday live session, Day 7 is Tuesday recorded, and Day 8 is Wednesday closing live.
4. Select **Publish batch settings** and confirm. The first time on a device, enter the admin password; the browser remembers it after a successful publish.
5. The public page updates after the Vercel deployment finishes, usually within a minute.

The GitHub token stays on the server and never reaches the browser. `/api/update-batch` checks the admin password, validates the settings, and commits only `batch-config.js`. Use **Forget password on this device** on a shared computer. To revoke access everywhere, change `ADMIN_PASSWORD` in Vercel and redeploy.
