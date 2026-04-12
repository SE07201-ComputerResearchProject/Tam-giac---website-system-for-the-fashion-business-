(function () {
  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }

    callback();
  }

  onReady(function () {
    var gsap = window.gsap;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    initScrollProgress();
    initGlobalGlow();

    if (reduceMotion || !supportsHover) {
      initObservedSections();
      return;
    }

    initSpotlights();
    initMagneticElements(gsap);
    initObservedSections();
  });

  function initScrollProgress() {
    if (document.querySelector(".tm-scroll-progress")) {
      return;
    }

    var progress = document.createElement("div");
    progress.className = "tm-scroll-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.appendChild(progress);

    function update() {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
      var maxScroll = Math.max(
        1,
        (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight
      );
      var ratio = Math.max(0, Math.min(1, scrollTop / maxScroll));
      document.documentElement.style.setProperty("--tm-scroll-progress", ratio.toFixed(4));
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  function initGlobalGlow() {
    [document.querySelector(".home-main"), document.querySelector(".auth-card")].forEach(function (surface) {
      if (!surface) {
        return;
      }

      surface.addEventListener("pointermove", function (event) {
        var bounds = surface.getBoundingClientRect();
        surface.style.setProperty("--tm-global-x", event.clientX - bounds.left + "px");
        surface.style.setProperty("--tm-global-y", event.clientY - bounds.top + "px");
        surface.classList.add("tm-global-active");
      });

      surface.addEventListener("pointerleave", function () {
        surface.classList.remove("tm-global-active");
      });
    });
  }

  function initSpotlights() {
    var selectors = [
      "header .brand",
      "header .menu-bar",
      ".slider .slider-text",
      ".product",
      ".collection > div",
      "footer .footer-widget .widget",
      ".auth-card",
      ".auth-switch",
      ".auth-view"
    ];

    document.querySelectorAll(selectors.join(",")).forEach(function (element) {
      element.classList.add("tm-spotlight-surface");

      element.addEventListener("pointermove", function (event) {
        var bounds = element.getBoundingClientRect();
        element.style.setProperty("--spot-x", event.clientX - bounds.left + "px");
        element.style.setProperty("--spot-y", event.clientY - bounds.top + "px");
        element.classList.add("tm-spotlight-active");
      });

      element.addEventListener("pointerleave", function () {
        element.classList.remove("tm-spotlight-active");
      });
    });
  }

  function initMagneticElements(gsap) {
    var selectors = [
      "header .menu a",
      ".slider .slider-text a",
      ".product-detail a",
      ".auth-switch-btn",
      ".auth-text-link",
      ".back-link",
      ".auth-inline a",
      ".secondary-link",
      "footer a"
    ];

    document.querySelectorAll(selectors.join(",")).forEach(function (element) {
      element.classList.add("tm-magnetic");
      if (element.tagName === "A") {
        element.classList.add("tm-magnetic-inline");
      }

      var setX = gsap
        ? gsap.quickTo(element, "x", { duration: 0.28, ease: "power2.out" })
        : null;
      var setY = gsap
        ? gsap.quickTo(element, "y", { duration: 0.28, ease: "power2.out" })
        : null;
      var setScale = gsap
        ? gsap.quickTo(element, "scale", { duration: 0.26, ease: "power2.out" })
        : null;

      element.addEventListener("pointermove", function (event) {
        var bounds = element.getBoundingClientRect();
        var offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
        var offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;

        if (setX && setY) {
          setX(offsetX * 9);
          setY(offsetY * 7);
        } else {
          element.style.transform = "translate(" + (offsetX * 9) + "px," + (offsetY * 7) + "px)";
        }

        if (setScale) {
          setScale(1.02);
        }
      });

      element.addEventListener("pointerleave", function () {
        if (setX && setY) {
          setX(0);
          setY(0);
        } else {
          element.style.transform = "";
        }

        if (setScale) {
          setScale(1);
        }
      });

      element.addEventListener("pointerdown", function () {
        if (setScale) {
          setScale(0.98);
        }
      });

      element.addEventListener("pointerup", function () {
        if (setScale) {
          setScale(1.02);
        }
      });
    });
  }

  function initObservedSections() {
    var sections = document.querySelectorAll(
      ".new-product-section, .collection, footer .footer-widget .widget, .auth-heading, .auth-stage, .auth-switch"
    );

    if (!("IntersectionObserver" in window)) {
      sections.forEach(function (section) {
        section.classList.add("tm-observed-active");
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle("tm-observed-active", entry.isIntersecting);
      });
    }, {
      threshold: 0.2
    });

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }
})();
