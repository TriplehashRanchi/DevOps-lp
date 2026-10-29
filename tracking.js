(function () {
  const config = window.CLOUD_TRAIN_TRACKING || {};
  const pixelId = String(config.metaPixelId || "").trim();
  const clarityId = String(config.clarityProjectId || "").trim();

  if (/^\d+$/.test(pixelId)) {
    // Meta's queue accepts events before fbevents.js finishes loading.
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    window.fbq("init", pixelId);
    window.fbq("track", "PageView");

    document.addEventListener("click", function (event) {
      const link = event.target.closest('a[href^="https://rzp.io/rzp/DOWS-7D"], a[href^="https://pages.razorpay.com/DevOps-7D"]');
      if (!link) return;
      window.fbq("track", "InitiateCheckout", { currency: "INR", value: 499 });
    });
  }

  if (/^[a-zA-Z0-9]+$/.test(clarityId)) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r);
      t.async = 1;
      t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", clarityId);
  }
})();
