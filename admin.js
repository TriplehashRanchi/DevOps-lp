(function () {
  const repository = "TriplehashRanchi/DevOps-lp";
  const branch = "main";
  const filePath = "batch-config.js";
  const endpoint = "https://api.github.com/repos/" + repository + "/contents/" + filePath;
  const form = document.getElementById("batch-form");
  const status = document.getElementById("form-status");
  const summary = document.getElementById("preview-summary");
  const preview = document.getElementById("schedule-preview");
  const publishButton = document.getElementById("publish-button");
  const tokenInput = document.getElementById("github-token");
  let loadedConfig;

  function setStatus(message, isError) {
    status.textContent = message;
    status.dataset.state = isError ? "error" : "ok";
  }

  function readForm() {
    return {
      batchNumber: Number(form.elements.batchNumber.value),
      startDate: form.elements.startDate.value,
      recordedTime: form.elements.recordedTime.value,
      liveTime: form.elements.liveTime.value
    };
  }

  function addRow(day, date, type, time, className) {
    const row = document.createElement("tr");
    if (className) row.className = className;
    [day, date, type, time].forEach(function (value) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    preview.appendChild(row);
  }

  function renderPreview() {
    preview.replaceChildren();
    try {
      const schedule = window.WorkshopSchedule.getSchedule(readForm());
      summary.textContent = "Batch " + schedule.config.batchNumber + " begins " + schedule.startDisplay + ".";
      schedule.days.forEach(function (day) {
        if (day.number === 6) {
          const weekendStart = new Date(schedule.config.startDate + "T00:00:00Z");
          weekendStart.setUTCDate(weekendStart.getUTCDate() + 5);
          const weekendEnd = new Date(weekendStart);
          weekendEnd.setUTCDate(weekendEnd.getUTCDate() + 1);
          const month = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "short" });
          const weekend = weekendStart.getUTCDate() + " " + month.format(weekendStart) + " – " + weekendEnd.getUTCDate() + " " + month.format(weekendEnd);
          addRow("—", weekend, "Weekend break", "—", "break-row");
        }
        const time = day.type === "Recorded" ? schedule.config.recordedTime : schedule.config.liveTime;
        addRow("Day " + day.number, day.short, day.type, window.WorkshopSchedule.formatTime(time) + " IST");
      });
      publishButton.disabled = !tokenInput.value.trim();
      return schedule;
    } catch (error) {
      summary.textContent = error.message;
      publishButton.disabled = true;
      return null;
    }
  }

  function parseRemoteConfig(contents) {
    const match = contents.match(/window\.WORKSHOP_BATCH\s*=\s*(\{[\s\S]*?\})\s*;/);
    if (!match) throw new Error("The repository settings file has an unexpected format.");
    return window.WorkshopSchedule.validate(JSON.parse(match[1]));
  }

  function apiError(response, body) {
    if (response.status === 401 || response.status === 403) return "GitHub rejected the token. Check its repository Contents permission.";
    if (response.status === 404) return "Settings file not found. Deploy this admin page and batch-config.js to the repository first.";
    if (response.status === 409) return "The settings changed while publishing. Reload this page and try again.";
    return body && body.message ? "GitHub: " + body.message : "GitHub returned status " + response.status + ".";
  }

  async function publish(schedule, token) {
    const headers = {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + token,
      "X-GitHub-Api-Version": "2026-03-10"
    };
    const currentResponse = await fetch(endpoint + "?ref=" + branch, { headers, cache: "no-store" });
    const currentBody = await currentResponse.json();
    if (!currentResponse.ok) throw new Error(apiError(currentResponse, currentBody));

    const remoteContents = atob(currentBody.content.replace(/\s/g, ""));
    const remoteConfig = parseRemoteConfig(remoteContents);
    if (JSON.stringify(remoteConfig) !== JSON.stringify(loadedConfig)) {
      throw new Error("Another batch update was published since this page loaded. Reload to review it before publishing.");
    }

    const contents = "// Update this file through admin.html to publish a new workshop batch.\n" +
      "window.WORKSHOP_BATCH = " + JSON.stringify(schedule.config, null, 2) + ";\n";
    const saveResponse = await fetch(endpoint, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Update workshop batch " + schedule.config.batchNumber,
        content: btoa(contents),
        sha: currentBody.sha,
        branch
      })
    });
    const saveBody = await saveResponse.json();
    if (!saveResponse.ok) throw new Error(apiError(saveResponse, saveBody));
    loadedConfig = schedule.config;
    window.WORKSHOP_BATCH = schedule.config;
    tokenInput.value = "";
    renderPreview();
    setStatus("Batch " + schedule.config.batchNumber + " was committed. Check the Vercel deployment, then refresh the public page.", false);
  }

  try {
    loadedConfig = window.WorkshopSchedule.validate(window.WORKSHOP_BATCH);
    form.elements.batchNumber.value = loadedConfig.batchNumber;
    form.elements.startDate.value = loadedConfig.startDate;
    form.elements.recordedTime.value = loadedConfig.recordedTime;
    form.elements.liveTime.value = loadedConfig.liveTime;
    renderPreview();
  } catch (error) {
    setStatus("Cannot load batch settings: " + error.message, true);
    publishButton.disabled = true;
    return;
  }

  form.addEventListener("input", renderPreview);
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const schedule = renderPreview();
    const token = tokenInput.value.trim();
    if (!schedule || !token) {
      setStatus("Enter valid batch settings and a GitHub token.", true);
      return;
    }
    if (!window.confirm("Publish Batch " + schedule.config.batchNumber + " starting " + schedule.days[0].full + "? This commits batch-config.js to main.")) return;
    publishButton.disabled = true;
    setStatus("Publishing batch settings…", false);
    try {
      await publish(schedule, token);
    } catch (error) {
      setStatus(error.message || "Could not publish batch settings.", true);
      renderPreview();
    }
  });
})();
