// No custom scripts needed for YouTube embed

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
