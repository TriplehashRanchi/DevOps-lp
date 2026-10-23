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