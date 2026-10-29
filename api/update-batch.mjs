import { createHash, timingSafeEqual } from "node:crypto";
import schedule from "../schedule.js";

const REPOSITORY = process.env.GITHUB_REPOSITORY || "CloudTrain-code/landingpage";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const FILE_PATH = "batch-config.js";
const MIN_PASSWORD_LENGTH = 12;

function matchesPassword(given, expected) {
  if (typeof given !== "string") return false;
  // Hash both sides so the comparison is constant-time regardless of length.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function parseConfigFile(contents) {
  const match = contents.match(/window\.WORKSHOP_BATCH\s*=\s*(\{[\s\S]*?\})\s*;/);
  if (!match) throw new Error("The repository settings file has an unexpected format.");
  return schedule.validate(JSON.parse(match[1]));
}

function githubError(status, body) {
  if (status === 401 || status === 403) return "The server's GitHub token was rejected. Check GITHUB_TOKEN in Vercel.";
  if (status === 404) return "batch-config.js was not found in the repository.";
  if (status === 409) return "The settings changed while publishing. Reload and try again.";
  return body?.message ? "GitHub: " + body.message : "GitHub returned status " + status + ".";
}

export async function POST(request) {
  const password = process.env.ADMIN_PASSWORD;
  const token = process.env.GITHUB_TOKEN;
  if (!password || password.length < MIN_PASSWORD_LENGTH || !token) {
    return Response.json({ error: "Batch publishing is not configured on the server." }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!matchesPassword(body?.password, password)) {
    return Response.json({ error: "Wrong admin password." }, { status: 401 });
  }

  let config;
  let previous;
  try {
    config = schedule.validate(body.config || {});
    previous = body.previous ? schedule.validate(body.previous) : null;
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  const endpoint = "https://api.github.com/repos/" + REPOSITORY + "/contents/" + FILE_PATH;
  const headers = {
    "Accept": "application/vnd.github+json",
    "Authorization": "Bearer " + token,
    "X-GitHub-Api-Version": "2026-03-10",
    "User-Agent": "cloud-train-batch-admin"
  };

  try {
    const currentResponse = await fetch(endpoint + "?ref=" + BRANCH, { headers, signal: AbortSignal.timeout(5000) });
    const current = await currentResponse.json();
    if (!currentResponse.ok) {
      return Response.json({ error: githubError(currentResponse.status, current) }, { status: 502 });
    }

    const remoteConfig = parseConfigFile(Buffer.from(current.content, "base64").toString("utf8"));
    if (previous && JSON.stringify(remoteConfig) !== JSON.stringify(previous)) {
      return Response.json({
        error: "Another batch update was published since this page loaded. Reload to review it before publishing.",
        current: remoteConfig
      }, { status: 409 });
    }

    const contents = "// Update this file through admin.html to publish a new workshop batch.\n" +
      "window.WORKSHOP_BATCH = " + JSON.stringify(config, null, 2) + ";\n";
    const saveResponse = await fetch(endpoint, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Update workshop batch " + config.batchNumber,
        content: Buffer.from(contents, "utf8").toString("base64"),
        sha: current.sha,
        branch: BRANCH
      }),
      signal: AbortSignal.timeout(5000)
    });
    const saved = await saveResponse.json();
    if (!saveResponse.ok) {
      return Response.json({ error: githubError(saveResponse.status, saved) }, { status: 502 });
    }
  } catch (error) {
    console.error("Batch publish failed", error);
    return Response.json({ error: "Could not reach GitHub. Try again." }, { status: 502 });
  }

  return Response.json({ published: true, config });
}
