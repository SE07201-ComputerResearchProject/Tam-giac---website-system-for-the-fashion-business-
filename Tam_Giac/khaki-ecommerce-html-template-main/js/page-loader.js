(function () {
  var overlay = null;
  var labelNode = null;
  var kickerNode = null;
  var subtitleNode = null;
  var visibleSince = 0;
  var MIN_VISIBLE_MS = 540;

  function getCurrentPath() {
    return (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  }

  function normalizePath(rawValue) {
    if (!rawValue) {
      return getCurrentPath();
    }

    if (typeof rawValue === "string") {
      try {
        return new URL(rawValue, window.location.href).pathname.split("/").pop().toLowerCase() || getCurrentPath();
      } catch (error) {
        return rawValue.toLowerCase();
      }
    }

    return getCurrentPath();
  }

  function isAuthPath(path) {
    return path === "login.html" || path === "register.html";
  }

  function isHomePath(path) {
    return path === "index.html" || path === "";
  }

  function deriveContext(rawOptions) {
    var options = rawOptions && typeof rawOptions === "object"
      ? rawOptions
      : { href: rawOptions };
    var source = normalizePath(options.from || getCurrentPath());
    var target = normalizePath(options.href || getCurrentPath());
    var reason = String(options.reason || "").toLowerCase();

    if (reason === "login-success" || (isAuthPath(source) && isHomePath(target))) {
      return {
        theme: "home",
        journey: "auth-to-home",
        kicker: "Session Verified",
        subtitle: "Entering Tam Giac homepage",
        label: "Tam Giac"
      };
    }

    if (reason === "logout" || (!isAuthPath(source) && isAuthPath(target))) {
      return {
        theme: "auth",
        journey: "home-to-auth",
        kicker: "Secure Sign-out",
        subtitle: target === "register.html" ? "Opening sign up portal" : "Returning to secure login",
        label: "Tam Giac ID"
      };
    }

    if (isAuthPath(target)) {
      return {
        theme: "auth",
        journey: "to-auth",
        kicker: "Protected Access",
        subtitle: target === "register.html" ? "Create your account" : "Secure access",
        label: "Tam Giac ID"
      };
    }

    if (isHomePath(target)) {
      return {
        theme: "home",
        journey: "to-home",
        kicker: "Tam Giac",
        subtitle: "Loading homepage",
        label: "Tam Giac"
      };
    }

    return {
      theme: "default",
      journey: "default",
      kicker: "Tam Giac",
      subtitle: "Loading next experience",
      label: "Tam Giac"
    };
  }

  function applyContext(context) {
    var nextContext = context || deriveContext();
    if (!overlay) {
      return;
    }

    overlay.dataset.theme = nextContext.theme || "default";
    overlay.dataset.journey = nextContext.journey || "default";

    if (kickerNode) {
      kickerNode.textContent = nextContext.kicker || "Tam Giac";
    }

    if (labelNode) {
      labelNode.textContent = nextContext.label || "Tam Giac";
    }

    if (subtitleNode) {
      subtitleNode.textContent = nextContext.subtitle || "Loading next experience";
    }
  }

  function ensureOverlay() {
    if (!document.body || overlay) {
      return overlay;
    }

    overlay = document.createElement("div");
    overlay.className = "page-loader-overlay is-visible";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = [
      '<div class="page-loader-ambient">',
      '  <span class="page-loader-orb page-loader-orb-one"></span>',
      '  <span class="page-loader-orb page-loader-orb-two"></span>',
      '  <span class="page-loader-grid"></span>',
      '</div>',
      '<div class="page-loader-panels">',
      '  <span class="page-loader-panel page-loader-panel-left"></span>',
      '  <span class="page-loader-panel page-loader-panel-right"></span>',
      '</div>',
      '<div class="page-loader-core">',
      '  <div class="page-loader-gate">',
      '    <span class="page-loader-beam"></span>',
      '    <span class="page-loader-halo page-loader-halo-one"></span>',
      '    <span class="page-loader-halo page-loader-halo-two"></span>',
      '    <span class="page-loader-track"></span>',
      '    <span class="page-loader-triangle page-loader-triangle-outer"></span>',
      '    <span class="page-loader-triangle page-loader-triangle-middle"></span>',
      '    <span class="page-loader-triangle page-loader-triangle-inner"></span>',
      '    <span class="page-loader-flare"></span>',
      '  </div>',
      '  <div class="page-loader-copy">',
      '    <div class="page-loader-kicker">Tam Giac</div>',
      '    <div class="page-loader-label">Tam Giac</div>',
      '    <div class="page-loader-subtitle">Loading next experience</div>',
      '  </div>',
      '</div>'
    ].join("");

    document.body.appendChild(overlay);
    kickerNode = overlay.querySelector(".page-loader-kicker");
    labelNode = overlay.querySelector(".page-loader-label");
    subtitleNode = overlay.querySelector(".page-loader-subtitle");
    applyContext(deriveContext());
    visibleSince = Date.now();
    return overlay;
  }

  function setVisible(nextVisible, options) {
    var node = ensureOverlay();
    if (!node) {
      return;
    }

    var context = deriveContext(options);

    if (nextVisible) {
      applyContext(context);
      node.classList.remove("is-visible");
      void node.offsetWidth;
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

    setVisible(true, {
      href: anchor.href,
      from: getCurrentPath()
    });
  }

  function onFormSubmit(event) {
    var form = event.target;
    if (!shouldHandleForm(form, event)) {
      return;
    }

    window.setTimeout(function () {
      if (!event.defaultPrevented) {
        setVisible(true, {
          href: form.action || window.location.href,
          from: getCurrentPath()
        });
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

    window.setTimeout(function () {
      try {
        if (overlay && overlay.classList && overlay.classList.contains("is-visible")) {
          setVisible(false);
        }
      } catch (error) {
        // no-op
      }
    }, 3600);
  });

  window.addEventListener("load", hideLoader);
  window.addEventListener("pageshow", hideLoader);

  window.TamGiacLoader = {
    show: function (options) {
      setVisible(true, options || {});
    },
    hide: hideLoader
  };
})();
