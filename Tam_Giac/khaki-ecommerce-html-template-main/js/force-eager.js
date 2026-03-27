/* Force important images to load eagerly to avoid browser lazy-load interventions (Edge). */
(function () {
  function forceEager(img) {
    try {
      if (!img) return;
      // If image uses data-src patterns, move to src
      var dataSrc = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original');
      if (dataSrc && !img.src) {
        img.src = dataSrc;
      }

      // If the image is marked lazy, make it eager and raise priority
      if (img.getAttribute('loading') === 'lazy') {
        img.setAttribute('loading', 'eager');
      }

      // Always attempt to set fetchpriority for browsers that support it
      try {
        img.setAttribute('fetchpriority', 'high');
      } catch (e) {}
    } catch (e) {
      // ignore
    }
  }

  function applyToExisting() {
    // Target lazy images and images with placeholder/data-src patterns
    var imgs = document.querySelectorAll('img[loading="lazy"], img[data-src], img[data-lazy-src], img[data-original]');
    imgs.forEach(forceEager);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyToExisting, { once: true });
  } else {
    applyToExisting();
  }

  // Observe for dynamically injected images (catalog, sliders, etc.)
  try {
    var mo = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (!node) return;
          if (node.nodeType !== 1) return;
          if (node.tagName === 'IMG') {
            forceEager(node);
            return;
          }
          var nested = node.querySelectorAll && node.querySelectorAll('img[loading="lazy"], img[data-src], img[data-lazy-src], img[data-original]');
          nested && nested.forEach && nested.forEach(forceEager);
        });
      });
    });

    mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
  } catch (e) {}
})();
