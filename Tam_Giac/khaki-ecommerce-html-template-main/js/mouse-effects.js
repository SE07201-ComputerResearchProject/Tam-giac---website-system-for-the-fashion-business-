(function () {
  var supportsFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!supportsFinePointer || reduceMotion) {
    return;
  }

  var interactiveSelector = [
    "a",
    "button",
    "input",
    "select",
    "textarea",
    "summary",
    "label[for]",
    "[role='button']",
    ".btn-auth",
    ".dropdown",
    ".shop-icon img",
    ".tab-btn"
  ].join(", ");

  function init() {
    if (!document.body || document.querySelector(".tm-cursor-glow")) {
      return;
    }

    var glow = document.createElement("div");
    glow.className = "tm-cursor-glow";

    var dot = document.createElement("div");
    dot.className = "tm-cursor-dot";

    document.body.appendChild(glow);
    document.body.appendChild(dot);
    document.body.classList.add("tm-cursor-enabled");

    var targetX = window.innerWidth / 2;
    var targetY = window.innerHeight / 2;
    var glowX = targetX;
    var glowY = targetY;
    var dotX = targetX;
    var dotY = targetY;
    var rafId = 0;
    var isRunning = false;
    var lastHoverTarget = null;

    function setHoverState(target) {
      if (target === lastHoverTarget) {
        return;
      }

      lastHoverTarget = target;
      var isInteractive = Boolean(target && target.closest && target.closest(interactiveSelector));
      document.body.classList.toggle("tm-cursor-hover", isInteractive);
    }

    function render() {
      glowX += (targetX - glowX) * 0.12;
      glowY += (targetY - glowY) * 0.12;
      dotX += (targetX - dotX) * 0.34;
      dotY += (targetY - dotY) * 0.34;

      document.body.style.setProperty("--tm-cursor-glow-x", glowX + "px");
      document.body.style.setProperty("--tm-cursor-glow-y", glowY + "px");
      document.body.style.setProperty("--tm-cursor-dot-x", dotX + "px");
      document.body.style.setProperty("--tm-cursor-dot-y", dotY + "px");
      if (!isRunning) {
        rafId = 0;
        return;
      }

      rafId = window.requestAnimationFrame(render);
    }

    function startLoop() {
      if (isRunning) {
        return;
      }

      isRunning = true;
      rafId = window.requestAnimationFrame(render);
    }

    function stopLoop() {
      isRunning = false;

      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    document.addEventListener(
      "pointermove",
      function (event) {
        if (event.pointerType && event.pointerType !== "mouse") {
          return;
        }

        targetX = event.clientX;
        targetY = event.clientY;
        document.body.classList.add("tm-cursor-visible");
        setHoverState(event.target);

        startLoop();
      },
      { passive: true }
    );

    document.addEventListener(
      "pointerover",
      function (event) {
        setHoverState(event.target);
      },
      { passive: true }
    );

    document.addEventListener(
      "pointerdown",
      function () {
        document.body.classList.add("tm-cursor-press");
      },
      { passive: true }
    );

    document.addEventListener(
      "pointerup",
      function () {
        document.body.classList.remove("tm-cursor-press");
      },
      { passive: true }
    );

    window.addEventListener("blur", function () {
      document.body.classList.remove("tm-cursor-visible", "tm-cursor-hover", "tm-cursor-press");
      lastHoverTarget = null;
      stopLoop();
    });

    document.documentElement.addEventListener("mouseleave", function () {
      document.body.classList.remove("tm-cursor-visible", "tm-cursor-hover", "tm-cursor-press");
      lastHoverTarget = null;
      stopLoop();
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        lastHoverTarget = null;
        stopLoop();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
    return;
  }

  init();
})();
