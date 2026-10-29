(function (root) {
  const dayOffsets = [0, 1, 2, 3, 4, 7, 8, 9];
  const dayTypes = ["Recorded", "Recorded", "Recorded", "Recorded", "Recorded", "Live", "Recorded", "Closing live"];
  const fullDate = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  const shortMonth = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "short" });
  const longWeekday = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long" });

  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Enter a valid date in YYYY-MM-DD format.");
    const date = new Date(value + "T00:00:00Z");
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new Error("Enter a valid calendar date.");
    }
    return date;
  }

  function parseTime(value, label) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("Enter a valid " + label + " in 24-hour HH:MM format.");
    return value;
  }

  function parseWhatsappLink(value) {
    const link = typeof value === "string" ? value.trim() : "";
    if (!/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}$/.test(link)) {
      throw new Error("Enter a WhatsApp group invite link like https://chat.whatsapp.com/AbCd1234…");
    }
    return link;
  }

  function validate(config) {
    // Older configs stored the batch as a number; it is now free-form text like "376" or "DO-376".
    const batchNumber = String(config.batchNumber ?? "").trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9 -]{0,19}$/.test(batchNumber)) {
      throw new Error("Batch number must be 1–20 letters, numbers, spaces or hyphens.");
    }
    const start = parseDate(config.startDate);
    if (start.getUTCDay() !== 1) throw new Error("The first learning day must be a Monday.");
    parseTime(config.recordedTime, "recorded lesson time");
    parseTime(config.liveTime, "live session time");
    const whatsappLink = parseWhatsappLink(config.whatsappLink);
    return { batchNumber, startDate: config.startDate, recordedTime: config.recordedTime, liveTime: config.liveTime, whatsappLink };
  }

  function formatTime(value) {
    const [hours, minutes] = value.split(":").map(Number);
    const hour = hours % 12 || 12;
    return hour + (minutes ? ":" + String(minutes).padStart(2, "0") : "") + " " + (hours < 12 ? "AM" : "PM");
  }

  function getSchedule(input) {
    const config = validate(input);
    const first = parseDate(config.startDate);
    const days = dayOffsets.map(function (offset, index) {
      const date = new Date(first.getTime() + offset * 86400000);
      return {
        number: index + 1,
        type: dayTypes[index],
        iso: date.toISOString().slice(0, 10),
        weekday: longWeekday.format(date),
        short: longWeekday.format(date) + " · " + date.getUTCDate() + " " + shortMonth.format(date),
        compact: date.getUTCDate() + " " + shortMonth.format(date),
        full: fullDate.format(date)
      };
    });
    // Joining instructions go out at 5 PM IST the day before the batch starts.
    const eve = new Date(first.getTime() - 86400000);
    return {
      config,
      days,
      instructionsDisplay: longWeekday.format(eve) + ", " + eve.getUTCDate() + " " + shortMonth.format(eve) + " · 5 PM IST",
      startInstant: days[0].iso + "T" + config.recordedTime + ":00+05:30",
      startDisplay: days[0].full + " · " + formatTime(config.recordedTime) + " IST",
      liveTimeDisplay: formatTime(config.liveTime),
      closingDisplay: days[7].short + " · " + formatTime(config.liveTime) + " IST"
    };
  }

  const api = { validate, getSchedule, formatTime };
  root.WorkshopSchedule = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
