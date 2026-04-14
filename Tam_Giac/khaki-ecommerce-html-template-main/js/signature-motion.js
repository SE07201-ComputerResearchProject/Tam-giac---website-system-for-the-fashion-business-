(function () {
  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }

    callback();
  }

  function toArray(nodeList) {
    return Array.prototype.slice.call(nodeList || []);
  }

  onReady(function () {
    if (!document.body || document.body.classList.contains("auth-page")) {
      return;
    }

    document.body.classList.add("tm-signature-motion");

    var supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var revealCount = 0;
    var mutationRaf = 0;

    var revealSelectors = [
      "main .breadcrumb",
      "main .slider .slider-text",
      "main .new-product-section .product-section-heading",
      "main .catalog-toolbar",
      "main .new-product-section.shop .sidebar .sidebar-widget",
      "main .product-content .product",
      "main .collection > div",
      "main .single-product .images-section",
      "main .single-product .product-detail",
      "main .about",
      "main .contact",
      "main .profile",
      "main .account-detail",
      "main .cart-items",
      "main .cart-summary",
      "main .billing-detail",
      "main .order-summary",
      "main .checkout-total",
      "main .order-detail",
      "footer .footer-widget .widget"
    ];

    var tiltSelectors = [
      "main .product-content .product",
      "main .collection > div",
      "main .new-product-section.shop .sidebar .sidebar-widget",
      "main .profile",
      "main .cart-summary",
      "main .order-summary",
      "main .checkout-total",
      "footer .footer-widget .widget"
    ];

    var buttonSelectors = [
      "main .product-content .product .product-detail a",
      "main .load-more a",
      "main .collection a",
      "main input[type='submit']",
      "main .single-product .product-detail .product-cart #cart-form .buy-now-trigger",
      "main .account-page .profile ul li a"
    ];

    var headingSelectors = [
      "main .new-product-section .product-section-heading h2",
      "main .contact .heading",
      "main .about .heading",
      "main .account-detail > h2",
      "main .single-product .product-detail h2"
    ];

    var ribbonSelectors = [
      "main .breadcrumb",
      "main .catalog-toolbar",
      "main .checkout-total"
    ];

    var logoLink = document.querySelector("header .logo a");
    var logoMark = document.querySelector("header .logo img");

    if (logoLink) {
      logoLink.classList.add("tm-signature-logo");
    }

    if (logoMark) {
      logoMark.classList.add("tm-signature-logo-mark");
    }

    toArray(document.querySelectorAll("header .brand, header .menu-bar")).forEach(function (element) {
      element.classList.remove("tm-signature-surface", "tm-reveal", "is-visible");
      element.removeAttribute("data-tm-reveal-bound");
      element.style.removeProperty("--tm-delay");
    });

    var revealObserver = null;
    if ("IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      }, {
        threshold: 0.16,
        rootMargin: "0px 0px -10% 0px"
      });
    }

    function markReveal(element) {
      if (!element || element.dataset.tmRevealBound === "true") {
        return;
      }

      element.dataset.tmRevealBound = "true";
      element.classList.add("tm-signature-surface", "tm-reveal");
      element.style.setProperty("--tm-delay", Math.min(revealCount, 10) * 55 + "ms");
      revealCount += 1;

      if (revealObserver) {
        revealObserver.observe(element);
      } else {
        element.classList.add("is-visible");
      }
    }

    function bindTilt(element) {
      if (!element || element.dataset.tmTiltBound === "true") {
        return;
      }

      element.dataset.tmTiltBound = "true";
      element.classList.add("tm-signature-card", "tm-tilt-card");

      if (!supportsHover || reduceMotion) {
        element.classList.add("is-visible");
        return;
      }

      element.style.setProperty("--tm-tilt-x", "0deg");
      element.style.setProperty("--tm-tilt-y", "0deg");
      element.style.setProperty("--tm-lift", "0px");
      element.style.setProperty("--tm-scale", "1");

      element.addEventListener("pointermove", function (event) {
        var bounds = element.getBoundingClientRect();
        var offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
        var offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;

        element.classList.add("is-hovered");
        element.style.setProperty("--tm-tilt-x", offsetY * -7 + "deg");
        element.style.setProperty("--tm-tilt-y", offsetX * 8 + "deg");
        element.style.setProperty("--tm-lift", "-8px");
        element.style.setProperty("--tm-scale", "1.01");
      }, { passive: true });

      element.addEventListener("pointerleave", function () {
        element.classList.remove("is-hovered");
        element.style.setProperty("--tm-tilt-x", "0deg");
        element.style.setProperty("--tm-tilt-y", "0deg");
        element.style.setProperty("--tm-lift", "0px");
        element.style.setProperty("--tm-scale", "1");
      });
    }

    function applyStaticClass(selectors, className) {
      selectors.forEach(function (selector) {
        toArray(document.querySelectorAll(selector)).forEach(function (element) {
          element.classList.add(className);
        });
      });
    }

    function refreshSignatureTargets() {
      revealSelectors.forEach(function (selector) {
        toArray(document.querySelectorAll(selector)).forEach(markReveal);
      });

      tiltSelectors.forEach(function (selector) {
        toArray(document.querySelectorAll(selector)).forEach(bindTilt);
      });

      applyStaticClass(buttonSelectors, "tm-signature-button");
      applyStaticClass(headingSelectors, "tm-signature-heading");
      applyStaticClass(ribbonSelectors, "tm-signature-ribbon");
    }

    function scheduleRefresh() {
      if (mutationRaf) {
        return;
      }

      mutationRaf = window.requestAnimationFrame(function () {
        mutationRaf = 0;
        refreshSignatureTargets();
      });
    }

    window.requestAnimationFrame(function () {
      document.body.classList.add("tm-signature-ready");
      refreshSignatureTargets();
    });

    if ("MutationObserver" in window) {
      var observer = new MutationObserver(function () {
        scheduleRefresh();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  });
})();
