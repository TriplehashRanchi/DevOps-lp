(function () {
  const passwordKey = "cloudTrainAdminPassword";
  const form = document.getElementById("batch-form");
  const status = document.getElementById("form-status");
  const summary = document.getElementById("preview-summary");
  const preview = document.getElementById("schedule-preview");
  const publishButton = document.getElementById("publish-button");
  const passwordInput = document.getElementById("admin-password");
  const forgetButton = document.getElementById("forget-password");
  let loadedConfig;

  function rememberPassword(value) {
    try {
      if (value) localStorage.setItem(passwordKey, value);
      else localStorage.removeItem(passwordKey);
    } catch (error) {
      // Storage may be blocked; the password then has to be typed each visit.
    }
    forgetButton.hidden = !value;
  }

  function savedPassword() {
    try {
      return localStorage.getItem(passwordKey) || "";
    } catch (error) {
      return "";
    }
  }

  function setStatus(message, isError) {
    status.textContent = message;
    status.dataset.state = isError ? "error" : "ok";
  }

  function readForm() {
    return {
      batchNumber: form.elements.batchNumber.value,
      startDate: form.elements.startDate.value,
      recordedTime: form.elements.recordedTime.value,
      liveTime: form.elements.liveTime.value,
      whatsappLink: form.elements.whatsappLink.value
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
      publishButton.disabled = !passwordInput.value;
      return schedule;
    } catch (error) {
      summary.textContent = error.message;
      publishButton.disabled = true;
      return null;
    }
  }

  async function publish(schedule, password) {
    const response = await fetch("/api/update-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, config: schedule.config, previous: loadedConfig })
    });
    let body = {};
    try {
      body = await response.json();
    } catch (error) {
      // Fall through to the generic status message below.
    }
    if (response.status === 401) {
      rememberPassword("");
      passwordInput.value = "";
      throw new Error("Wrong admin password.");
    }
    if (!response.ok) throw new Error(body.error || "Server returned status " + response.status + ".");

    rememberPassword(password);
    loadedConfig = schedule.config;
    window.WORKSHOP_BATCH = schedule.config;
    renderPreview();
    setStatus("Batch " + schedule.config.batchNumber + " published. The public page updates in about a minute.", false);
  }

  try {
    loadedConfig = window.WorkshopSchedule.validate(window.WORKSHOP_BATCH);
    form.elements.batchNumber.value = loadedConfig.batchNumber;
    form.elements.startDate.value = loadedConfig.startDate;
    form.elements.recordedTime.value = loadedConfig.recordedTime;
    form.elements.liveTime.value = loadedConfig.liveTime;
    form.elements.whatsappLink.value = loadedConfig.whatsappLink;
    passwordInput.value = savedPassword();
    forgetButton.hidden = !passwordInput.value;
    renderPreview();
  } catch (error) {
    setStatus("Cannot load batch settings: " + error.message, true);
    publishButton.disabled = true;
    return;
  }

  forgetButton.addEventListener("click", function () {
    rememberPassword("");
    passwordInput.value = "";
    renderPreview();
    setStatus("Password removed from this device.", false);
  });
  form.addEventListener("input", renderPreview);
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const schedule = renderPreview();
    const password = passwordInput.value;
    if (!schedule || !password) {
      setStatus("Enter valid batch settings and the admin password.", true);
      return;
    }
    if (!window.confirm("Publish Batch " + schedule.config.batchNumber + " starting " + schedule.days[0].full + "?")) return;
    publishButton.disabled = true;
    setStatus("Publishing batch settings…", false);
    try {
      await publish(schedule, password);
    } catch (error) {
      setStatus(error.message || "Could not publish batch settings.", true);
      renderPreview();
    }
  });
})();
