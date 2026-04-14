(function () {
  const TOKEN_KEY = "token";
  const ROUTE_ORDER = ["index.html", "shop.html", "about.html", "contact.html"];

  document.addEventListener("DOMContentLoaded", initDragNavbar);

  function initDragNavbar() {
    if (!window.gsap || !isLoggedIn()) {
      return;
    }

    const menuBar = document.querySelector("header .menu-bar");
    const track = document.querySelector("header .menu ul");
    if (!menuBar || !track || track.dataset.dragNavReady === "true") {
      return;
    }

    const entries = Array.from(track.querySelectorAll("a"))
      .map((link) => {
        const route = getRouteFromHref(link.getAttribute("href"));
        return {
          link,
          item: link.closest("li"),
          label: link.textContent.trim(),
          href: link.getAttribute("href"),
          route,
          metric: null
        };
      })
      .filter((entry) => entry.item && ROUTE_ORDER.includes(entry.route));

    if (entries.length !== 4) {
      return;
    }

    track.dataset.dragNavReady = "true";
    menuBar.classList.add("tm-nav-ready");
    track.classList.add("tm-nav-track");
    entries.forEach((entry) => {
      entry.item.classList.add("tm-nav-item");
      entry.link.classList.add("tm-nav-link");
    });

    const island = createIsland();
    track.appendChild(island.root);

    const state = {
      anchor: resolveCurrentEntry(entries) || entries[0],
      activeLabel: "",
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      lastX: 0,
      lastY: 0,
      pressOffsetX: 0,
      pressOffsetY: 0,
      pointerId: null
    };

    function setIslandLabel(label) {
      if (!label || state.activeLabel === label) {
        return;
      }

      state.activeLabel = label;
      island.label.textContent = label;
      island.root.setAttribute("aria-label", "Drag navigation selector. Current target: " + label);
    }

    function syncIslandState() {
      state.x = Number(gsap.getProperty(island.root, "x")) || 0;
      state.y = Number(gsap.getProperty(island.root, "y")) || 0;
      state.width = Number(gsap.getProperty(island.root, "width")) || island.root.offsetWidth || 0;
      state.height = Number(gsap.getProperty(island.root, "height")) || island.root.offsetHeight || 0;
    }

    function updateCoveredLink(entry) {
      entries.forEach((item) => {
        item.link.classList.toggle("is-covered", item === entry);
      });
    }

    function clearHighlights() {
      entries.forEach((entry) => {
        entry.item.classList.remove("is-near");
        gsap.to(entry.link, {
          scale: 1,
          y: 0,
          color: "#edf9ff",
          filter: "drop-shadow(0 0 0 rgba(0, 198, 255, 0))",
          duration: 0.18,
          ease: "power4.out",
          overwrite: "auto"
        });
      });
    }

    function measureEntry(entry) {
      const trackRect = track.getBoundingClientRect();
      const rect = entry.link.getBoundingClientRect();
      return {
        x: rect.left - trackRect.left,
        y: rect.top - trackRect.top,
        width: rect.width,
        height: rect.height,
        centerX: rect.left - trackRect.left + rect.width / 2,
        centerY: rect.top - trackRect.top + rect.height / 2
      };
    }

    function refreshMetrics() {
      entries.forEach((entry) => {
        entry.metric = measureEntry(entry);
      });
    }

    function moveIslandToEntry(entry, options) {
      if (!entry || !entry.metric) {
        return;
      }

      setIslandLabel(entry.label);

      gsap.to(island.root, {
        x: entry.metric.x,
        y: entry.metric.y,
        width: entry.metric.width,
        height: entry.metric.height,
        duration: options.duration,
        ease: options.ease,
        overwrite: "auto",
        onUpdate: syncIslandState,
        onComplete: options.onComplete
      });
    }

    function positionIslandAtAnchor(immediate) {
      refreshMetrics();

      if (!state.anchor || !state.anchor.metric) {
        return;
      }

      setIslandLabel(state.anchor.label);

      if (immediate) {
        gsap.set(island.root, {
          x: state.anchor.metric.x,
          y: state.anchor.metric.y,
          width: state.anchor.metric.width,
          height: state.anchor.metric.height
        });
        syncIslandState();
      } else {
        moveIslandToEntry(state.anchor, {
          duration: 0.42,
          ease: "power4.out"
        });
      }

      updateCoveredLink(state.anchor);
      island.root.classList.add("is-ready");
    }

    function getNearestEntry(centerX, centerY) {
      let nearest = null;
      let minDistance = Infinity;

      entries.forEach((entry) => {
        if (!entry.metric) {
          return;
        }

        const distance = Math.hypot(entry.metric.centerX - centerX, entry.metric.centerY - centerY);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = entry;
        }
      });

      return { entry: nearest, dist: minDistance };
    }

    function highlightNearest(entry, intensity) {
      entries.forEach((item) => {
        const active = item === entry && intensity > 0;
        item.item.classList.toggle("is-near", active);
        gsap.to(item.link, {
          scale: active ? 1 + intensity * 0.08 : 1,
          y: active ? -intensity * 2 : 0,
          color: active ? "#ffffff" : "#edf9ff",
          filter: active
            ? "drop-shadow(0 0 14px rgba(0, 198, 255, 0.48))"
            : "drop-shadow(0 0 0 rgba(0, 198, 255, 0))",
          duration: 0.16,
          ease: "power4.out",
          overwrite: "auto"
        });
      });
    }

    function resetIslandVisuals(useElastic) {
      const ease = useElastic ? "elastic.out(1, 0.42)" : "power4.out";
      const duration = useElastic ? 0.82 : 0.22;

      gsap.to(island.root, {
        scale: 1,
        duration,
        ease,
        overwrite: "auto"
      });

      gsap.to(island.face, {
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        borderRadius: 999,
        boxShadow:
          "0 18px 36px rgba(0, 114, 255, 0.26), 0 0 24px rgba(0, 198, 255, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.28)",
        duration,
        ease,
        overwrite: "auto"
      });

      gsap.to(island.aura, {
        scale: 1,
        opacity: 0.78,
        duration: 0.32,
        ease: "power4.out",
        overwrite: "auto"
      });
    }

    function applyDragVisuals(speed, magneticStrength, deltaX) {
      const stretchX = clamp(1 + speed * 0.04 + magneticStrength * 0.12, 1, 1.28);
      const stretchY = clamp(1 - speed * 0.02 - magneticStrength * 0.08, 0.86, 1);
      const rotation = clamp(deltaX * 1.8, -8, 8);

      gsap.to(island.root, {
        scale: 1.04 + magneticStrength * 0.05,
        duration: 0.14,
        ease: "power4.out",
        overwrite: "auto"
      });

      gsap.to(island.face, {
        scaleX: stretchX,
        scaleY: stretchY,
        rotation,
        borderRadius: 26 + magneticStrength * 8,
        boxShadow:
          "0 18px " + (34 + magneticStrength * 18) + "px rgba(0, 114, 255, " + (0.24 + magneticStrength * 0.16) + "), " +
          "0 0 " + (24 + magneticStrength * 18) + "px rgba(0, 198, 255, " + (0.18 + magneticStrength * 0.26) + "), " +
          "inset 0 1px 0 rgba(255, 255, 255, 0.28)",
        duration: 0.12,
        ease: "power4.out",
        overwrite: "auto"
      });

      gsap.to(island.aura, {
        scale: 1.08 + magneticStrength * 0.16,
        opacity: 0.82 + magneticStrength * 0.14,
        duration: 0.12,
        ease: "power4.out",
        overwrite: "auto"
      });
    }

    function pulseEntry(entry) {
      const timeline = gsap.timeline();
      timeline.to(entry.link, {
        scale: 1.08,
        duration: 0.14,
        ease: "power4.out"
      });
      timeline.to(entry.link, {
        scale: 1,
        duration: 0.46,
        ease: "elastic.out(1, 0.44)"
      });
    }

    function releaseToEntry(entry) {
      const targetRoute = entry.route;
      const currentRoute = getRouteFromHref(window.location.pathname);
      const shouldNavigate = targetRoute !== currentRoute;

      state.anchor = entry;
      pulseEntry(entry);
      moveIslandToEntry(entry, {
        duration: 0.52,
        ease: "power4.out",
        onComplete() {
          updateCoveredLink(entry);
          clearHighlights();
          if (shouldNavigate) {
            navigateTo(entry.href);
          }
        }
      });
    }

    function bounceBack() {
      moveIslandToEntry(state.anchor, {
        duration: 0.88,
        ease: "elastic.out(1, 0.42)",
        onComplete() {
          updateCoveredLink(state.anchor);
          clearHighlights();
        }
      });
    }

    function onPointerMove(event) {
      if (event.pointerId !== state.pointerId) {
        return;
      }

      const trackRect = track.getBoundingClientRect();
      let nextX = clamp(
        event.clientX - trackRect.left - state.pressOffsetX,
        0,
        Math.max(track.clientWidth - state.width, 0)
      );
      let nextY = clamp(
        event.clientY - trackRect.top - state.pressOffsetY,
        0,
        Math.max(track.clientHeight - state.height, 0)
      );

      const nearest = getNearestEntry(nextX + state.width / 2, nextY + state.height / 2);
      const magneticDistance = Math.max(110, nearest.entry ? nearest.entry.metric.width * 0.9 : 110);
      const magneticStrength = nearest.entry && nearest.dist < magneticDistance
        ? 1 - nearest.dist / magneticDistance
        : 0;

      if (nearest.entry && magneticStrength > 0) {
        const dx = nearest.entry.metric.centerX - (nextX + state.width / 2);
        const dy = nearest.entry.metric.centerY - (nextY + state.height / 2);
        const pull = 0.08 + magneticStrength * 0.12;

        nextX = clamp(nextX + dx * pull, 0, Math.max(track.clientWidth - state.width, 0));
        nextY = clamp(nextY + dy * pull, 0, Math.max(track.clientHeight - state.height, 0));
      }

      const deltaX = nextX - state.lastX;
      const deltaY = nextY - state.lastY;
      const speed = Math.hypot(deltaX, deltaY);

      state.x = nextX;
      state.y = nextY;
      gsap.set(island.root, { x: nextX, y: nextY });

      highlightNearest(nearest.entry, magneticStrength);
      applyDragVisuals(speed, magneticStrength, deltaX);

      setIslandLabel(nearest.entry && magneticStrength > 0 ? nearest.entry.label : state.anchor.label);
      state.lastX = state.x;
      state.lastY = state.y;
    }

    function onPointerEnd(event) {
      if (event.pointerId !== state.pointerId) {
        return;
      }

      cleanupPointer();
      island.root.classList.remove("is-dragging");
      resetIslandVisuals(true);

      const nearest = getNearestEntry(state.x + state.width / 2, state.y + state.height / 2);
      const snapDistance = Math.max(74, nearest.entry ? nearest.entry.metric.width * 0.46 : 74);

      if (nearest.entry && nearest.dist < snapDistance) {
        releaseToEntry(nearest.entry);
        return;
      }

      setIslandLabel(state.anchor.label);
      bounceBack();
    }

    function cleanupPointer() {
      if (state.pointerId !== null) {
        try {
          island.root.releasePointerCapture(state.pointerId);
        } catch (error) {
          // Ignore browsers that already released the pointer capture.
        }
      }

      state.pointerId = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
    }

    island.root.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType !== "touch" && event.pointerType !== "pen") {
        return;
      }

      refreshMetrics();
      updateCoveredLink(null);
      island.root.classList.add("is-dragging");
      island.root.setPointerCapture(event.pointerId);

      const islandRect = island.root.getBoundingClientRect();
      state.pointerId = event.pointerId;
      state.pressOffsetX = event.clientX - islandRect.left;
      state.pressOffsetY = event.clientY - islandRect.top;
      syncIslandState();
      state.lastX = state.x;
      state.lastY = state.y;

      gsap.to(island.root, {
        scale: 1.04,
        duration: 0.18,
        ease: "power4.out",
        overwrite: "auto"
      });

      gsap.to(island.aura, {
        scale: 1.12,
        opacity: 0.94,
        duration: 0.18,
        ease: "power4.out",
        overwrite: "auto"
      });

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerEnd);
      window.addEventListener("pointercancel", onPointerEnd);
      event.preventDefault();
    });

    island.root.addEventListener("click", (event) => {
      event.preventDefault();
    });

    positionIslandAtAnchor(true);
    clearHighlights();

    window.addEventListener("resize", () => {
      positionIslandAtAnchor(true);
    });

    window.addEventListener("load", () => {
      positionIslandAtAnchor(true);
    });
  }

  function createIsland() {
    const root = document.createElement("button");
    root.type = "button";
    root.className = "tm-nav-island";
    root.setAttribute("aria-label", "Drag navigation selector");

    const aura = document.createElement("span");
    aura.className = "tm-nav-island-aura";

    const face = document.createElement("span");
    face.className = "tm-nav-island-face";

    const shine = document.createElement("span");
    shine.className = "tm-nav-island-shine";

    const copy = document.createElement("span");
    copy.className = "tm-nav-island-copy";

    const dot = document.createElement("span");
    dot.className = "tm-nav-island-dot";

    const label = document.createElement("span");

    copy.appendChild(dot);
    copy.appendChild(label);
    face.appendChild(shine);
    face.appendChild(copy);
    root.appendChild(aura);
    root.appendChild(face);

    return { root, aura, face, label };
  }

  function isLoggedIn() {
    try {
      return !!window.localStorage.getItem(TOKEN_KEY);
    } catch (error) {
      return false;
    }
  }

  function navigateTo(url) {
    if (!url) {
      return;
    }

    if (window.TamGiacLoader && typeof window.TamGiacLoader.show === "function") {
      window.TamGiacLoader.show({
        href: url,
        from: getRouteFromHref(window.location.pathname),
        reason: "nav-drag"
      });

      window.setTimeout(function () {
        window.location.href = url;
      }, 340);
      return;
    }

    window.location.href = url;
  }

  function resolveCurrentEntry(entries) {
    const currentRoute = getRouteFromHref(window.location.pathname);
    return entries.find((entry) => entry.route === currentRoute) || null;
  }

  function getRouteFromHref(href) {
    const value = String(href || "").split("?")[0].split("#")[0];
    if (!value || value === "/") {
      return "index.html";
    }

    const clean = value.endsWith("/") ? value.slice(0, -1) : value;
    const lastSlash = clean.lastIndexOf("/");
    const route = lastSlash >= 0 ? clean.slice(lastSlash + 1) : clean;

    return (route || "index.html").toLowerCase();
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
})();
