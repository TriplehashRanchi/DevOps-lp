(function () {
  if (!window.WORKSHOP_BATCH || !window.WorkshopSchedule) return;

  function updateText(selector, value) {
    document.querySelectorAll(selector).forEach(function (element) {
      element.textContent = value;
    });
  }

  try {
    const schedule = window.WorkshopSchedule.getSchedule(window.WORKSHOP_BATCH);
    updateText("[data-batch-number]", schedule.config.batchNumber);
    updateText("[data-batch-start]", schedule.startDisplay);
    updateText("[data-start-short]", schedule.days[0].short);
    updateText("[data-recorded-time]", window.WorkshopSchedule.formatTime(schedule.config.recordedTime));
    updateText("[data-live-time]", schedule.liveTimeDisplay);
    updateText("[data-instructions-date]", schedule.instructionsDisplay);
    document.querySelectorAll("[data-whatsapp-link]").forEach(function (link) {
      link.href = schedule.config.whatsappLink;
    });
  } catch (error) {
    console.error("Invalid workshop batch configuration:", error);
  }
})();
