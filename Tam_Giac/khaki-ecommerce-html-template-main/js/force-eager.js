/* Promote only near-viewport images so visible UI loads sooner without flooding the page. */
(function () {
  var seen = new WeakSet();
  var sweepRaf = 0;
  var observer = null;

  function normalizeSource(img) {
    if (!img) {
      return;
    }

    var dataSrc = img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.getAttribute("data-original");
    if (dataSrc && (!img.getAttribute("src") || img.getAttribute("src") === "")) {
      img.setAttribute("src", dataSrc);
    }
  }

  function getViewportHeight() {
    return window.innerHeight || document.documentElement.clientHeight || 900;
  }

  function isNearViewport(img, multiplier) {
    if (!img || typeof img.getBoundingClientRect !== "function") {
      return false;
    }

    var rect = img.getBoundingClientRect();
    var margin = getViewportHeight() * multiplier;
    return rect.top <= getViewportHeight() + margin && rect.bottom >= -margin;
  }

  function promoteImage(img, level) {
    if (!img) {
      return;
    }

    normalizeSource(img);

    if (level === "high") {
      img.setAttribute("loading", "eager");
      img.setAttribute("fetchpriority", "high");
    } else {
      if (!img.getAttribute("loading") || img.getAttribute("loading") === "lazy") {
        img.setAttribute("loading", "eager");
      }
      if (!img.getAttribute("fetchpriority")) {
        img.setAttribute("fetchpriority", "auto");
      }
    }

    img.setAttribute("decoding", "async");

    if (typeof img.decode === "function" && !img.complete) {
      img.decode().catch(function () {});
    }
  }

  function evaluateImage(img) {
    if (!img) {
      return;
    }

    normalizeSource(img);

    var explicitHigh =
      img.hasAttribute("data-force-eager") ||
      img.getAttribute("loading") === "eager" ||
      img.getAttribute("fetchpriority") === "high";

    if (explicitHigh || isNearViewport(img, 1.1)) {
      promoteImage(img, "high");
      return;
    }

    if (isNearViewport(img, 2.2)) {
      promoteImage(img, "near");
    }
  }

  function bindImage(img) {
    if (!img || seen.has(img)) {
      return;
    }

    seen.add(img);
    evaluateImage(img);

    if (observer && !img.complete) {
      observer.observe(img);
    }
  }

  function bindImagesIn(node) {
    if (!node || node.nodeType !== 1) {
      return;
    }

    if (node.tagName === "IMG") {
      bindImage(node);
      return;
    }

    if (typeof node.querySelectorAll !== "function") {
      return;
    }

    node.querySelectorAll("img").forEach(bindImage);
  }

  function sweepVisibleImages() {
    sweepRaf = 0;
    document.querySelectorAll("img").forEach(evaluateImage);
  }

  function scheduleSweep() {
    if (sweepRaf) {
      return;
    }

    sweepRaf = window.requestAnimationFrame(sweepVisibleImages);
  }

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }

        promoteImage(entry.target, "near");
        observer.unobserve(entry.target);
      });
    }, {
      rootMargin: "1400px 0px"
    });
  }

  function init() {
    bindImagesIn(document);
    scheduleSweep();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.addEventListener("load", scheduleSweep, { passive: true });
  window.addEventListener("resize", scheduleSweep, { passive: true });
  window.addEventListener("scroll", scheduleSweep, { passive: true });

  try {
    var mutationObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(bindImagesIn);
      });
      scheduleSweep();
    });

    mutationObserver.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  } catch (error) {
    // Ignore observer failures in older browsers.
  }
})();
