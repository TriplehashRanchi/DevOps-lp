# Updating a workshop batch

This static site uses `batch-config.js` for its batch number, first Monday, recorded lesson release time, and live session time. The public page calculates all seven curriculum dates, the Day 8 closing session, live dates, countdowns, and start labels from those settings.

## First-time setup

1. Deploy this version of the repository to Vercel. Its production branch should be `main` and its connected GitHub repository should be `TriplehashRanchi/DevOps-lp`.
2. Create a GitHub fine-grained personal access token restricted to that repository with **Contents: Read and write** permission. Keep the token private.

## For each new batch

1. Open `https://YOUR-SITE/admin.html`.
2. Enter the batch number, first Monday, and the recorded and live times in IST.
3. Review the generated schedule. Saturday and Sunday are skipped; Day 6 is the following Monday live session, Day 7 is Tuesday recorded, and Day 8 is Wednesday closing live.
4. Enter the GitHub token and select **Publish batch settings**. Confirm the details shown.
5. Check the Vercel production deployment. Refresh the public page after it succeeds.

The token is used for the GitHub API requests and is not saved in the browser. The update page commits only `batch-config.js`; GitHub and Vercel must remain connected for the new settings to reach visitors.
