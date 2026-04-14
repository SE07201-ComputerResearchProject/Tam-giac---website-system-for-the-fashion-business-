(function () {
  var COPY = {
    login: {
      title: "Welcome back",
      kicker: "Fast sign-in. Minimal steps.",
      hint: "Start from a glowing triangle core that expands into a refined 3D account panel, keeping the experience focused, smooth, and easy to use.",
      chip: "Login Mode",
      trigger: "Activate the 3D login portal",
      documentTitle: "Login | Tam Giac",
      switchTilt: -16
    },
    register: {
      title: "Create your Tam Giac account",
      kicker: "Set up your account in one smooth flow.",
      hint: "The triangle core opens into a modern 3D control space that gathers every sign-up detail into one clear, polished experience.",
      chip: "Register Mode",
      trigger: "Activate the 3D register portal",
      documentTitle: "Register | Tam Giac",
      switchTilt: 16
    }
  };

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }

    callback();
  }

  onReady(function () {
    var page = document.querySelector(".auth-page");
    var scene = document.querySelector("[data-auth-scene]");
    var core = document.querySelector("[data-auth-launch]");
    var card = document.querySelector("[data-auth-card]");
    if (!page || !scene || !core || !card) {
      return;
    }

    var gsap = window.gsap;
    var Flip = window.Flip;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (gsap && Flip && gsap.registerPlugin) {
      gsap.registerPlugin(Flip);
    }

    initFieldState();
    bindStatusAnimation(gsap);
    initAuthState(page, scene, core, card, gsap, Flip, reduceMotion);

    if (gsap && !reduceMotion) {
      introAnimation(gsap);
      loopBackground(gsap);
    }
  });

  function initFieldState() {
    document.querySelectorAll("[data-field]").forEach(function (field) {
      var input = field.querySelector("input");
      if (!input) {
        return;
      }

      var syncState = function () {
        field.classList.toggle("is-filled", Boolean(input.value));
      };

      input.addEventListener("focus", function () {
        field.classList.add("is-focused");
      });

      input.addEventListener("blur", function () {
        field.classList.remove("is-focused");
        syncState();
      });

      input.addEventListener("input", syncState);
      syncState();
    });
  }

  function bindStatusAnimation(gsap) {
    window.addEventListener("auth:status", function (event) {
      if (!gsap || !event.detail) {
        return;
      }

      var target = document.getElementById(event.detail.id);
      if (!target || !event.detail.visible) {
        return;
      }

      gsap.fromTo(target, {
        y: 14,
        autoAlpha: 0,
        scale: 0.985
      }, {
        y: 0,
        autoAlpha: 1,
        scale: 1,
        duration: 0.42,
        ease: "power2.out",
        overwrite: true
      });
    });
  }

  function initAuthState(page, scene, core, card, gsap, Flip, reduceMotion) {
    var tabs = Array.prototype.slice.call(card.querySelectorAll("[data-auth-toggle]"));
    var views = {
      login: card.querySelector('[data-auth-view="login"]'),
      register: card.querySelector('[data-auth-view="register"]')
    };
    var title = card.querySelector("[data-auth-title]");
    var kicker = card.querySelector("[data-auth-kicker]");
    var hint = card.querySelector("[data-auth-hint]");
    var indicator = card.querySelector("[data-auth-indicator]");
    var triggerCopy = core.querySelector("[data-auth-trigger-copy]");
    var modeChip = card.querySelector("[data-auth-mode-badge]");
    var authTop = card.querySelector(".auth-top");
    var authHeading = card.querySelector(".auth-heading");
    var authSwitch = card.querySelector(".auth-switch");
    var prismDepth = card.querySelector(".auth-prism-depth");
    var prismInner = card.querySelector(".auth-prism-inner");
    var prismLayers = Array.prototype.slice.call(card.querySelectorAll(".prism-face, .prism-edge, .prism-glow"));
    var prismScan = card.querySelector(".prism-scan");
    var shine = card.querySelector(".card-shine");
    var currentMode = null;
    var isOpen = page.dataset.authOpen === "true";
    var isTransitioning = false;
    var detailTimer = 0;
    var switchTimeline = null;
    var openTimeline = null;

    function resolveMode() {
      var file = window.location.pathname.split("/").pop() || "";
      if (file === "register.html") {
        return "register";
      }

      if (file === "login.html") {
        return "login";
      }

      return page.dataset.authDefault || "login";
    }

    function setOpenState(open) {
      isOpen = open;
      page.dataset.authOpen = open ? "true" : "false";
      core.setAttribute("aria-expanded", String(open));
      card.setAttribute("aria-hidden", String(!open));

      if (open) {
        card.classList.add("is-ready");
        card.style.pointerEvents = "none";
      } else {
        card.style.pointerEvents = "none";
      }
    }

    function updateCopy(mode) {
      var nextCopy = COPY[mode] || COPY.login;
      title.textContent = nextCopy.title;
      kicker.textContent = nextCopy.kicker;
      hint.textContent = nextCopy.hint;
      document.title = nextCopy.documentTitle;

      if (modeChip) {
        modeChip.textContent = nextCopy.chip;
      }

      if (triggerCopy) {
        triggerCopy.textContent = nextCopy.trigger;
      }
    }

    function moveIndicator(button) {
      if (indicator && button && indicator.parentNode !== button) {
        button.appendChild(indicator);
      }
    }

    function getAnimatedParts(view) {
      if (!view) {
        return [];
      }

      return Array.prototype.slice.call(
        view.querySelectorAll(".field, .auth-inline, .strength, .password-rules, .form-actions, .auth-footnote, .field-note, .status")
      );
    }

    function getHeaderParts() {
      return [authTop, authHeading, authSwitch].filter(Boolean);
    }

    function applyVisibility(mode) {
      Object.keys(views).forEach(function (key) {
        var active = key === mode;
        views[key].hidden = !active;
        views[key].classList.toggle("is-active", active);
        views[key].setAttribute("aria-hidden", String(!active));
      });
    }

    function updateTabs(mode) {
      tabs.forEach(function (tab) {
        var active = tab.dataset.authToggle === mode;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
      });
    }

    function updateHistoryForMode(targetTab, options) {
      if (!targetTab || options.updateHistory === false) {
        return;
      }

      var path = targetTab.dataset.authPath;
      var currentPath = window.location.pathname.split("/").pop();
      if (path && currentPath !== path) {
        history[options.replaceHistory ? "replaceState" : "pushState"]({ authMode: currentMode }, "", path);
      }
    }

    function focusFirstField(mode, delay) {
      if (!mode || !views[mode]) {
        return;
      }

      var firstInput = views[mode].querySelector("input");
      if (!firstInput) {
        return;
      }

      window.setTimeout(function () {
        firstInput.focus({ preventScroll: true });
      }, delay || 0);
    }

    function animateViewDetails(view, immediate) {
      if (!gsap || !view) {
        return;
      }

      var parts = getAnimatedParts(view);
      if (!parts.length) {
        return;
      }

      gsap.killTweensOf(parts);

      if (immediate) {
        gsap.set(parts, {
          y: 0,
          z: 0,
          autoAlpha: 1
        });
        return;
      }

      gsap.fromTo(parts, {
        y: 20,
        z: 0,
        autoAlpha: 0
      }, {
        y: 0,
        z: 0,
        autoAlpha: 1,
        duration: 0.58,
        ease: "power3.out",
        stagger: 0.045,
        overwrite: true,
        clearProps: "transform,opacity,visibility"
      });
    }

    function queueViewDetailAnimation(mode, immediate) {
      if (!gsap || reduceMotion || !views[mode]) {
        return;
      }

      window.clearTimeout(detailTimer);
      detailTimer = window.setTimeout(function () {
        animateViewDetails(views[mode], immediate);
      }, immediate ? 0 : 110);
    }

    function dispatchModeChanged(mode) {
      window.dispatchEvent(new CustomEvent("auth:mode-changed", {
        detail: { mode: mode }
      }));
    }

    function commitMode(mode, options) {
      var targetTab = tabs.find(function (tab) {
        return tab.dataset.authToggle === mode;
      });

      currentMode = mode;
      page.dataset.authMode = mode;
      card.dataset.mode = mode;

      updateTabs(mode);
      moveIndicator(targetTab);
      updateCopy(mode);
      applyVisibility(mode);
      updateHistoryForMode(targetTab, options || {});
      dispatchModeChanged(mode);

      return targetTab;
    }

    function openPortal(options) {
      options = options || {};
      var animate = options.animate !== false;
      var focusField = Boolean(options.focusField);
      var activeMode = currentMode || resolveMode();
      var activeView = views[activeMode];
      var headerParts = getHeaderParts();
      var viewParts = getAnimatedParts(activeView);
      var allRevealParts = headerParts.concat(viewParts);
      var tilt = (COPY[activeMode] || COPY.login).switchTilt;

      if (isOpen || !activeView) {
        if (focusField) {
          focusFirstField(activeMode, 120);
        }
        return;
      }

      setOpenState(true);

      if (!gsap || reduceMotion || !animate) {
        card.classList.add("is-ready");
        card.style.opacity = "1";
        card.style.visibility = "visible";
        card.style.pointerEvents = "none";
        card.style.transform = "translate3d(-50%, -50%, 0)";
        applyVisibility(activeMode);
        updateCopy(activeMode);
        queueViewDetailAnimation(activeMode, true);

        if (focusField) {
          focusFirstField(activeMode, 80);
        }
        return;
      }

      if (openTimeline) {
        openTimeline.kill();
      }

      isTransitioning = true;
      card.classList.add("is-ready");

      gsap.set(card, {
        autoAlpha: 1,
        visibility: "visible",
        pointerEvents: "none",
        scale: 0.9,
        y: 30,
        z: 0,
        rotationX: 14,
        rotationY: tilt * 0.3,
        rotationZ: tilt * 0.18
      });

      gsap.set(prismLayers, {
        autoAlpha: 0,
        y: 18,
        scale: 0.96
      });

      if (prismInner) {
        gsap.set(prismInner, {
          autoAlpha: 0.52,
          y: 22,
          scale: 0.985
        });
      }

      gsap.set(allRevealParts, {
        autoAlpha: 0,
        y: 26,
        z: 0
      });

      openTimeline = gsap.timeline({
        defaults: {
          ease: "expo.out"
        },
        onComplete: function () {
          isTransitioning = false;
          gsap.set(allRevealParts, { clearProps: "transform,opacity,visibility" });

          if (focusField) {
            focusFirstField(activeMode, 40);
          }
        }
      });

      openTimeline
        .to(core, {
          autoAlpha: 0,
          y: -18,
          scale: 0.88,
          duration: 0.32,
          rotationZ: tilt * -0.2,
          ease: "power2.inOut"
        }, 0)
        .to(card, {
          scale: 1,
          y: 0,
          z: 0,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          duration: 0.9
        }, 0.04)
        .to(prismLayers, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.58,
          stagger: 0.04,
          ease: "power2.out"
        }, 0.12)
        .to(prismInner, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.62,
          ease: "power3.out"
        }, 0.18)
        .fromTo(prismScan, {
          xPercent: -18,
          autoAlpha: 0.14
        }, {
          xPercent: 122,
          autoAlpha: 0.62,
          duration: 1.02,
          ease: "power2.inOut"
        }, 0.14)
        .fromTo(shine, {
          xPercent: -8,
          autoAlpha: 0.08
        }, {
          xPercent: 96,
          autoAlpha: 0.4,
          duration: 1.08,
          ease: "power2.inOut"
        }, 0.18)
        .to(headerParts, {
          autoAlpha: 1,
          y: 0,
          z: 0,
          duration: 0.44,
          stagger: 0.07
        }, 0.3)
        .to(viewParts, {
          autoAlpha: 1,
          y: 0,
          z: 0,
          duration: 0.46,
          stagger: 0.045,
          clearProps: "transform,opacity,visibility"
        }, 0.38);
    }

    function setMode(mode, options) {
      options = options || {};
      var animate = options.animate !== false;
      var focusField = Boolean(options.focusField);
      var openIfNeeded = options.openIfNeeded !== false;

      if (!views[mode]) {
        mode = "login";
      }

      if (!isOpen && openIfNeeded && options.openPanel) {
        commitMode(mode, options);
        openPortal({
          animate: animate,
          focusField: focusField
        });
        return;
      }

      if (mode === currentMode && !options.force) {
        if (!isOpen && openIfNeeded) {
          openPortal({
            animate: animate,
            focusField: focusField
          });
        } else if (focusField) {
          focusFirstField(mode, 80);
        }
        return;
      }

      if (!gsap || reduceMotion || !animate || !isOpen || !currentMode || !views[currentMode]) {
        commitMode(mode, options);

        queueViewDetailAnimation(mode, !animate || !isOpen);

        if (focusField) {
          focusFirstField(mode, 120);
        }
        return;
      }

      if (switchTimeline) {
        switchTimeline.kill();
      }

      isTransitioning = true;

      var previousMode = currentMode;
      var outgoingView = views[previousMode];
      var outgoingParts = getAnimatedParts(outgoingView);
      var incomingView = views[mode];
      var incomingParts = getAnimatedParts(incomingView);
      var headerParts = getHeaderParts();
      var tilt = (COPY[mode] || COPY.login).switchTilt;
      var direction = mode === "register" ? 1 : -1;
      var indicatorState = Flip && indicator ? Flip.getState(indicator) : null;

      switchTimeline = gsap.timeline({
        onComplete: function () {
          isTransitioning = false;

          if (focusField) {
            focusFirstField(mode, 180);
          }
        }
      });

      switchTimeline
        .to(outgoingParts, {
          autoAlpha: 0,
          y: -12,
          z: 0,
          duration: 0.22,
          stagger: {
            each: 0.018,
            from: "end"
          },
          ease: "power1.inOut"
        }, 0)
        .to(headerParts, {
          autoAlpha: 0.18,
          y: -8,
          duration: 0.18,
          stagger: 0.03,
          ease: "power1.inOut"
        }, 0)
        .to(card, {
          x: direction * 12,
          scale: 0.985,
          rotationX: 6,
          rotationY: tilt * 0.22,
          rotationZ: tilt * 0.08,
          duration: 0.24,
          ease: "power2.inOut"
        }, 0)
        .to(prismInner, {
          y: 10,
          scale: 0.99,
          duration: 0.24,
          ease: "power2.inOut"
        }, 0)
        .to(prismLayers, {
          y: 8,
          autoAlpha: 0.74,
          scale: 0.985,
          duration: 0.24,
          stagger: 0.03,
          ease: "power2.inOut"
        }, 0)
        .fromTo(prismScan, {
          xPercent: -6,
          autoAlpha: 0.18
        }, {
          xPercent: 60,
          autoAlpha: 0.52,
          duration: 0.42,
          ease: "power2.inOut"
        }, 0)
        .add(function () {
          commitMode(mode, options);

          if (indicatorState && Flip) {
            Flip.from(indicatorState, {
              duration: 0.36,
              ease: "power2.out",
              absolute: true,
              simple: true
            });
          }

          gsap.set(incomingParts.concat(headerParts), {
            autoAlpha: 0,
            y: 16,
            z: 0
          });
        }, 0.24)
        .to(card, {
          x: 0,
          scale: 1,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          duration: 0.68,
          ease: "expo.out"
        }, 0.24)
        .to(prismInner, {
          y: 0,
          scale: 1,
          duration: 0.42,
          ease: "power2.out"
        }, 0.28)
        .to(prismLayers, {
          y: 0,
          autoAlpha: 1,
          scale: 1,
          duration: 0.44,
          stagger: 0.03,
          ease: "power2.out"
        }, 0.24)
        .to(headerParts, {
          autoAlpha: 1,
          y: 0,
          z: 0,
          duration: 0.36,
          stagger: 0.04,
          ease: "power2.out"
        }, 0.3)
        .to(incomingParts, {
          autoAlpha: 1,
          y: 0,
          z: 0,
          duration: 0.42,
          stagger: 0.04,
          clearProps: "transform,opacity,visibility",
          ease: "power3.out"
        }, 0.34);
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        setMode(tab.dataset.authToggle, {
          updateHistory: true,
          focusField: true
        });
      });
    });

    card.querySelectorAll("[data-auth-link]").forEach(function (button) {
      button.addEventListener("click", function () {
        setMode(button.dataset.authLink, {
          updateHistory: true,
          focusField: true
        });
      });
    });

    core.addEventListener("click", function () {
      openPortal({
        animate: true,
        focusField: true
      });
    });

    window.addEventListener("auth:request-mode", function (event) {
      setMode((event.detail && event.detail.mode) || "login", {
        updateHistory: true,
        replaceHistory: true,
        focusField: true,
        openPanel: true
      });
    });

    window.addEventListener("popstate", function () {
      setMode(resolveMode(), {
        updateHistory: false,
        force: true,
        openIfNeeded: false
      });
    });

    if (gsap && !reduceMotion) {
      enableSceneInteractivity(gsap, page, scene, core, card, function () {
        return {
          open: isOpen,
          transitioning: isTransitioning
        };
      });
    }

    window.authCard = {
      open: function (options) {
        openPortal(options || {});
      },
      setMode: function (mode, options) {
        setMode(mode, options || {});
      }
    };

    commitMode(resolveMode(), {
      updateHistory: false
    });
    setOpenState(false);

    window.setTimeout(function () {
      openPortal({
        animate: !reduceMotion,
        focusField: false
      });
    }, reduceMotion ? 0 : 420);
  }

  function introAnimation(gsap) {
    gsap.timeline({
      defaults: {
        ease: "power2.out"
      }
    })
      .from(".bg-orb, .bg-ring", {
        autoAlpha: 0,
        scale: 0.72,
        stagger: 0.08,
        duration: 1.16
      }, 0)
      .from(".bg-grid, .bg-noise", {
        autoAlpha: 0,
        duration: 1.2
      }, 0.1)
      .from(".auth-core-triangle", {
        autoAlpha: 0,
        scale: 0.4,
        rotationX: 110,
        rotationY: -60,
        rotationZ: -36,
        duration: 1.3,
        ease: "expo.out"
      }, 0.14)
      .from(".auth-core-copy", {
        autoAlpha: 0,
        y: 22,
        duration: 0.56
      }, 0.62);
  }

  function loopBackground(gsap) {
    gsap.to(".bg-orb-one", {
      x: 26,
      y: 18,
      duration: 7.6,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    gsap.to(".bg-orb-two", {
      x: -24,
      y: 24,
      duration: 8.8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    gsap.to(".bg-orb-three", {
      x: 18,
      y: -20,
      duration: 7.1,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    gsap.to(".bg-ring-one", {
      rotation: 360,
      duration: 42,
      repeat: -1,
      ease: "none",
      transformOrigin: "50% 50%"
    });

    gsap.to(".bg-ring-two", {
      rotation: -360,
      duration: 34,
      repeat: -1,
      ease: "none",
      transformOrigin: "50% 50%"
    });

    gsap.to(".auth-core-triangle", {
      y: -12,
      duration: 2.8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

  }

  function enableSceneInteractivity(gsap, page, scene, core, card, getState) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    var coreTriangle = core.querySelector(".auth-core-triangle");
    var coreCopy = core.querySelector(".auth-core-copy");
    var prismDepth = card.querySelector(".auth-prism-depth");
    var prismInner = card.querySelector(".auth-prism-inner");
    var prismGlow = card.querySelector(".prism-glow");
    var prismScan = card.querySelector(".prism-scan");
    var authTop = card.querySelector(".auth-top");
    var authHeading = card.querySelector(".auth-heading");
    var authSwitch = card.querySelector(".auth-switch");
    var authStage = card.querySelector(".auth-stage");

    var coreRX = coreTriangle ? gsap.quickTo(coreTriangle, "rotationX", { duration: 0.5, ease: "power3.out" }) : null;
    var coreRY = coreTriangle ? gsap.quickTo(coreTriangle, "rotationY", { duration: 0.5, ease: "power3.out" }) : null;
    var coreRZ = coreTriangle ? gsap.quickTo(coreTriangle, "rotationZ", { duration: 0.5, ease: "power3.out" }) : null;
    var coreCopyX = coreCopy ? gsap.quickTo(coreCopy, "x", { duration: 0.45, ease: "power3.out" }) : null;
    var coreCopyY = coreCopy ? gsap.quickTo(coreCopy, "y", { duration: 0.45, ease: "power3.out" }) : null;

    var depthX = prismDepth ? gsap.quickTo(prismDepth, "x", { duration: 0.6, ease: "power2.out" }) : null;
    var depthY = prismDepth ? gsap.quickTo(prismDepth, "y", { duration: 0.6, ease: "power2.out" }) : null;
    var depthRX = prismDepth ? gsap.quickTo(prismDepth, "rotationX", { duration: 0.6, ease: "power2.out" }) : null;
    var depthRY = prismDepth ? gsap.quickTo(prismDepth, "rotationY", { duration: 0.6, ease: "power2.out" }) : null;
    var innerX = prismInner ? gsap.quickTo(prismInner, "x", { duration: 0.5, ease: "power2.out" }) : null;
    var innerY = prismInner ? gsap.quickTo(prismInner, "y", { duration: 0.5, ease: "power2.out" }) : null;
    var glowX = prismGlow ? gsap.quickTo(prismGlow, "x", { duration: 0.7, ease: "power2.out" }) : null;
    var glowY = prismGlow ? gsap.quickTo(prismGlow, "y", { duration: 0.7, ease: "power2.out" }) : null;
    var scanX = prismScan ? gsap.quickTo(prismScan, "x", { duration: 0.7, ease: "power2.out" }) : null;
    var topX = authTop ? gsap.quickTo(authTop, "x", { duration: 0.48, ease: "power2.out" }) : null;
    var topY = authTop ? gsap.quickTo(authTop, "y", { duration: 0.48, ease: "power2.out" }) : null;
    var headingX = authHeading ? gsap.quickTo(authHeading, "x", { duration: 0.52, ease: "power2.out" }) : null;
    var headingY = authHeading ? gsap.quickTo(authHeading, "y", { duration: 0.52, ease: "power2.out" }) : null;
    var switchX = authSwitch ? gsap.quickTo(authSwitch, "x", { duration: 0.56, ease: "power2.out" }) : null;
    var switchY = authSwitch ? gsap.quickTo(authSwitch, "y", { duration: 0.56, ease: "power2.out" }) : null;
    var stageX = authStage ? gsap.quickTo(authStage, "x", { duration: 0.6, ease: "power2.out" }) : null;
    var stageY = authStage ? gsap.quickTo(authStage, "y", { duration: 0.6, ease: "power2.out" }) : null;
    var isStageScrolling = false;
    var stageScrollTimer = 0;

    function resetCoreTransforms() {
      if (coreRX && coreRY && coreRZ) {
        coreRX(63);
        coreRY(-28);
        coreRZ(-12);
      }

      if (coreCopyX && coreCopyY) {
        coreCopyX(0);
        coreCopyY(0);
      }
    }

    function resetOpenTransforms() {
      if (depthX && depthY) {
        depthX(0);
        depthY(0);
      }

      if (depthRX && depthRY) {
        depthRX(0);
        depthRY(0);
      }

      if (innerX && innerY) {
        innerX(0);
        innerY(0);
      }

      if (glowX && glowY) {
        glowX(0);
        glowY(0);
      }

      if (scanX) {
        scanX(0);
      }

      if (topX && topY) {
        topX(0);
        topY(0);
      }

      if (headingX && headingY) {
        headingX(0);
        headingY(0);
      }

      if (switchX && switchY) {
        switchX(0);
        switchY(0);
      }

      if (stageX && stageY) {
        stageX(0);
        stageY(0);
      }
    }

    function setStageScrollState(active) {
      if (isStageScrolling === active) {
        return;
      }

      isStageScrolling = active;

      if (page) {
        page.classList.toggle("auth-scroll-active", active);
      }

      if (active) {
        resetOpenTransforms();
      }
    }

    function pulseStageScrollState() {
      window.clearTimeout(stageScrollTimer);
      setStageScrollState(true);
      stageScrollTimer = window.setTimeout(function () {
        setStageScrollState(false);
      }, 180);
    }

    if (authStage) {
      authStage.addEventListener("wheel", pulseStageScrollState, { passive: true });
      authStage.addEventListener("scroll", pulseStageScrollState, { passive: true });
      authStage.addEventListener("touchmove", pulseStageScrollState, { passive: true });
      authStage.addEventListener("pointerdown", pulseStageScrollState, { passive: true });
    }

    scene.addEventListener("pointermove", function (event) {
      var state = getState();
      if (!state || state.transitioning) {
        return;
      }

      if (!state.open) {
        var coreBounds = core.getBoundingClientRect();
        var coreOffsetX = (event.clientX - coreBounds.left) / coreBounds.width - 0.5;
        var coreOffsetY = (event.clientY - coreBounds.top) / coreBounds.height - 0.5;

        if (coreRX && coreRY && coreRZ) {
          coreRX(63 - coreOffsetY * 16);
          coreRY(-28 + coreOffsetX * 20);
          coreRZ(-12 + coreOffsetX * -6);
        }

        if (coreCopyX && coreCopyY) {
          coreCopyX(coreOffsetX * 10);
          coreCopyY(coreOffsetY * 8);
        }
        return;
      }

      if (isStageScrolling) {
        resetOpenTransforms();
        return;
      }

      var bounds = card.getBoundingClientRect();
      var offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
      var offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;

      if (depthX && depthY) {
        depthX(offsetX * 16);
        depthY(offsetY * 18);
      }

      if (depthRX && depthRY) {
        depthRX(-offsetY * 5);
        depthRY(offsetX * 7);
      }

      if (innerX && innerY) {
        innerX(offsetX * 4);
        innerY(offsetY * 4);
      }

      if (glowX && glowY) {
        glowX(offsetX * 34);
        glowY(offsetY * 26);
      }

      if (scanX) {
        scanX(offsetX * 28);
      }

      if (topX && topY) {
        topX(offsetX * 6);
        topY(offsetY * 5);
      }

      if (headingX && headingY) {
        headingX(offsetX * 9);
        headingY(offsetY * 7);
      }

      if (switchX && switchY) {
        switchX(offsetX * 7);
        switchY(offsetY * 5);
      }

      if (stageX && stageY) {
        stageX(offsetX * 2.5);
        stageY(offsetY * 2.5);
      }
    });

    scene.addEventListener("pointerleave", function () {
      resetCoreTransforms();
      resetOpenTransforms();
    });
  }

})();
