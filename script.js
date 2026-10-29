// The Wistia hero player loads through its embed scripts in index.html.

// Render every batch date from the shared schedule configuration.
(function () {
  if (!window.WORKSHOP_BATCH || !window.WorkshopSchedule) return;
  let schedule;
  try {
    schedule = window.WorkshopSchedule.getSchedule(window.WORKSHOP_BATCH);
  } catch (error) {
    console.error("Invalid workshop batch configuration:", error);
    return;
  }

  function updateText(selector, value) {
    document.querySelectorAll(selector).forEach(function (element) {
      element.textContent = value;
    });
  }

  updateText("[data-batch-number]", schedule.config.batchNumber);
  updateText("[data-batch-start-date]", schedule.days[0].full);
  updateText("[data-batch-start-datetime]", schedule.startDisplay);
  updateText("[data-sticky-start-date]", schedule.days[0].compact + " " + schedule.days[0].iso.slice(0, 4));
  updateText("[data-live-time]", schedule.liveTimeDisplay);
  updateText("[data-recorded-time]", window.WorkshopSchedule.formatTime(schedule.config.recordedTime));

  document.querySelectorAll("[data-batch-start-date], [data-sticky-start-date]").forEach(function (element) {
    element.dateTime = schedule.days[0].iso;
  });
  document.querySelectorAll("[data-batch-start-datetime]").forEach(function (element) {
    element.dateTime = schedule.startInstant;
  });
  document.querySelectorAll("[data-workshop-countdown]").forEach(function (element) {
    element.dataset.workshopStart = schedule.startInstant;
  });
  document.querySelectorAll("[data-day-date]").forEach(function (element) {
    const day = schedule.days[Number(element.dataset.dayDate) - 1];
    if (!day) return;
    element.textContent = day.weekday;
    element.dateTime = day.iso;
  });
  document.querySelectorAll("[data-day-date-label]").forEach(function (element) {
    const day = schedule.days[Number(element.dataset.dayDateLabel) - 1];
    if (day) element.textContent = day.short;
  });
  document.querySelectorAll("[data-day8-date]").forEach(function (element) {
    element.textContent = schedule.days[7].weekday + ", " + schedule.days[7].compact;
    element.dateTime = schedule.days[7].iso;
  });
})();

// Curriculum Tabs — Robust switcher
document.addEventListener('DOMContentLoaded', function () {
  const tabs = document.querySelectorAll('.curriculum-tab');
  const panels = document.querySelectorAll('.curriculum-panel');

  function activateTab(targetDay) {
    // Deactivate all tabs
    tabs.forEach(function (t) {
      t.classList.remove('curriculum-tab--active');
      t.setAttribute('aria-selected', 'false');
    });

    // Hide all panels
    panels.forEach(function (p) {
      p.setAttribute('hidden', '');
      p.classList.remove('curriculum-panel--active');
    });

    // Activate the clicked tab
    const activeTab = document.querySelector('.curriculum-tab[data-day="' + targetDay + '"]');
    if (activeTab) {
      activeTab.classList.add('curriculum-tab--active');
      activeTab.setAttribute('aria-selected', 'true');
    }

    // Show the matching panel
    const activePanel = document.getElementById('day-panel-' + targetDay);
    if (activePanel) {
      activePanel.removeAttribute('hidden');
      activePanel.classList.add('curriculum-panel--active');
    }
  }

  // Attach click listeners
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      activateTab(tab.getAttribute('data-day'));
    });
  });

  // Initialise Day 1
  activateTab('1');
});
// Keep the last page content above the fixed registration bar.
(function () {
  const registrationBar = document.querySelector('.sticky-enrolment');
  if (!registrationBar) return;

  function reserveFooterSpace() {
    const height = Math.ceil(registrationBar.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--sticky-enrolment-height', height + 'px');
  }

  reserveFooterSpace();
  if ('ResizeObserver' in window) {
    const footerObserver = new ResizeObserver(reserveFooterSpace);
    footerObserver.observe(registrationBar);
  } else {
    window.addEventListener('resize', reserveFooterSpace, { passive: true });
  }
  if (document.fonts) document.fonts.ready.then(reserveFooterSpace);
})();

// Testimonial videos start from a custom play button, then switch to native controls.
(function () {
  const tiles = Array.from(document.querySelectorAll('.testimonial-tile--video'));

  tiles.forEach(function (tile) {
    const video = tile.querySelector('video');
    const button = tile.querySelector('.testimonial-tile__play');
    if (!video || !button) return;

    // Autoplaying tiles hide the overlay as soon as playback starts.
    video.addEventListener('play', function () {
      tile.classList.add('is-playing');
    });

    button.addEventListener('click', function () {
      // Only one testimonial plays at a time.
      tiles.forEach(function (other) {
        const otherVideo = other.querySelector('video');
        if (otherVideo && otherVideo !== video) otherVideo.pause();
      });
      tile.classList.add('is-playing');
      video.controls = true;
      video.play();
      video.focus();
    });
  });
})();

// All countdowns share the configured batch start, including its IST offset.
(function () {
  const countdowns = Array.from(document.querySelectorAll('[data-workshop-countdown]'));
  if (!countdowns.length) return;
  const startTime = Date.parse(countdowns[0].dataset.workshopStart);
  if (!Number.isFinite(startTime)) return;

  const displays = countdowns.map(function (root) {
    return {
      root: root,
      label: root.querySelector('[data-countdown-label]'),
      values: Array.from(root.querySelectorAll('[data-countdown-value]'))
    };
  });
  let intervalId;

  function updateCountdown() {
    const total = Math.max(0, Math.ceil((startTime - Date.now()) / 1000));
    const remaining = {
      days: Math.floor(total / 86400),
      hours: Math.floor(total % 86400 / 3600),
      minutes: Math.floor(total % 3600 / 60),
      seconds: total % 60
    };

    displays.forEach(function (display) {
      display.root.dataset.countdownState = total > 0 ? 'active' : 'started';
      display.label.textContent = total > 0 ? 'Workshop starts in' : 'Workshop has started';
      display.root.setAttribute('aria-label', total > 0
        ? remaining.days + ' days, ' + remaining.hours + ' hours, ' + remaining.minutes + ' minutes, ' + remaining.seconds + ' seconds until the workshop starts'
        : 'Workshop has started');
      display.values.forEach(function (value) {
        const next = String(remaining[value.dataset.countdownValue]).padStart(2, '0');
        if (value.textContent !== next) value.textContent = next;
      });
    });

    if (total === 0 && intervalId !== undefined) window.clearInterval(intervalId);
  }

  updateCountdown();
  if (Date.now() < startTime) intervalId = window.setInterval(updateCountdown, 1000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) updateCountdown();
  });
  window.addEventListener('pageshow', updateCountdown);
})();
