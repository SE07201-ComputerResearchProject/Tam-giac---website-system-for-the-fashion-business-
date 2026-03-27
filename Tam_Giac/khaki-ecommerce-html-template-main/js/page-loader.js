(function () {
  var overlay = null;
  var visibleSince = 0;
  var MIN_VISIBLE_MS = 260;

  function ensureOverlay() {
    if (!document.body || overlay) {
      return overlay;
    }

    overlay = document.createElement("div");
    overlay.className = "page-loader-overlay is-visible";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = [
      '<div class="flipping"></div>',
      '<div class="page-loader-label">Tam Giac</div>'
    ].join("");

    document.body.appendChild(overlay);
    visibleSince = Date.now();
    return overlay;
  }

  function setVisible(nextVisible) {
    var node = ensureOverlay();
    if (!node) {
      return;
    }

    if (nextVisible) {
      node.classList.add("is-visible");
      visibleSince = Date.now();
      return;
    }

    var delay = Math.max(0, MIN_VISIBLE_MS - (Date.now() - visibleSince));
    window.setTimeout(function () {
      node.classList.remove("is-visible");
    }, delay);
  }

  function shouldHandleLink(anchor) {
    if (!anchor) {
      return false;
    }

    if (anchor.hasAttribute("download") || anchor.dataset.noLoader === "true") {
      return false;
    }

    if (anchor.target && anchor.target !== "_self") {
      return false;
    }

    var href = anchor.getAttribute("href");
    if (!href || href === "#" || href.indexOf("javascript:") === 0) {
      return false;
    }

    if (href.charAt(0) === "#") {
      return false;
    }

    var url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) {
      return false;
    }

    if (url.href === window.location.href) {
      return false;
    }

    return true;
  }

  function shouldHandleForm(form, event) {
    if (!form || form.dataset.noLoader === "true") {
      return false;
    }

    if (event.defaultPrevented) {
      return false;
    }

    if (form.target && form.target !== "_self") {
      return false;
    }

    return true;
  }

  function onLinkClick(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    var anchor = event.target.closest("a");
    if (!shouldHandleLink(anchor)) {
      return;
    }

    setVisible(true);
  }

  function onFormSubmit(event) {
    var form = event.target;
    if (!shouldHandleForm(form, event)) {
      return;
    }

    window.setTimeout(function () {
      if (!event.defaultPrevented) {
        setVisible(true);
      }
    }, 0);
  }

  function hideLoader() {
    setVisible(false);
  }

  document.addEventListener("DOMContentLoaded", function () {
    ensureOverlay();
    document.addEventListener("click", onLinkClick, true);
    document.addEventListener("submit", onFormSubmit, false);
    // Safety: if window.load never fires (3rd-party scripts hang), hide loader after timeout
    window.setTimeout(function () {
      try {
        if (overlay && overlay.classList && overlay.classList.contains('is-visible')) {
          setVisible(false);
        }
      } catch (e) {
        // swallow errors
      }
    }, 3000);
  });

  window.addEventListener("load", hideLoader);
  window.addEventListener("pageshow", hideLoader);

  window.TamGiacLoader = {
    show: function () {
      setVisible(true);
    },
    hide: hideLoader
  };
})();
