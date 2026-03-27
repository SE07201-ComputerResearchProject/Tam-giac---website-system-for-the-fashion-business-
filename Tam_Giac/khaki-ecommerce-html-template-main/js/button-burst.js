(function () {
  var importantSelectors = [
    ".btn-auth",
    ".slider-text a",
    ".collection-copy a",
    ".load-more a",
    ".cart-summary a",
    ".mini-cart-actions a",
    ".checkout-total a",
    ".secondary-link",
    "#cart-form input[type='submit']",
    ".product-detail a"
  ].join(",");

  function loadGsap(callback) {
    if (window.gsap) {
      callback(window.gsap);
      return;
    }

    window.__tamGiacBurstQueue = window.__tamGiacBurstQueue || [];
    window.__tamGiacBurstQueue.push(callback);

    if (window.__tamGiacBurstLoading) {
      return;
    }

    window.__tamGiacBurstLoading = true;
    var script = document.createElement("script");
    script.src = "js/gsap.min.js";
    script.defer = true;
    script.onload = function () {
      var queue = window.__tamGiacBurstQueue || [];
      window.__tamGiacBurstQueue = [];
      queue.forEach(function (queued) {
        queued(window.gsap);
      });
    };
    document.head.appendChild(script);
  }

  function isBurstTarget(node) {
    if (!node) {
      return null;
    }

    var trigger = node.closest(importantSelectors);
    if (!trigger) {
      return null;
    }

    if (trigger.classList.contains("is-disabled") || trigger.disabled) {
      return null;
    }

    if (
      trigger.matches(".product-detail a") &&
      trigger.dataset.addToCart !== "true" &&
      !/(add to cart|them vao gio|kham pha|xem|tim phong cach|go to checkout|mo gio hang|tiep tuc mua sam)/i.test(trigger.textContent || "")
    ) {
      return null;
    }

    return trigger;
  }

  function initBurst(gsap) {
    if (!gsap || document.body.dataset.buttonBurstReady === "true") {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    document.body.dataset.buttonBurstReady = "true";

    var layer = document.createElement("div");
    layer.className = "button-burst-layer";
    document.body.appendChild(layer);

    function createParticle(type) {
      var node = document.createElement("span");
      node.className = type;
      layer.appendChild(node);
      return node;
    }

    function burstFrom(trigger) {
      var rect = trigger.getBoundingClientRect();
      var originX = rect.left + (rect.width / 2);
      var originY = rect.top + (rect.height / 2);
      var dotCount = rect.width > 160 ? 18 : 14;

      gsap.fromTo(trigger, {
        scale: 1
      }, {
        scale: 0.965,
        duration: 0.11,
        yoyo: true,
        repeat: 1,
        ease: "power2.out",
        overwrite: true,
        transformOrigin: "center center"
      });

      var ring = createParticle("button-burst-ring");
      var glow = createParticle("button-burst-glow");

      gsap.set([ring, glow], {
        x: originX,
        y: originY,
        opacity: 0.8
      });

      gsap.to(ring, {
        scale: 5.4,
        opacity: 0,
        duration: 0.65,
        ease: "power2.out",
        onComplete: function () {
          ring.remove();
        }
      });

      gsap.to(glow, {
        scale: 3.1,
        opacity: 0,
        duration: 0.55,
        ease: "power1.out",
        onComplete: function () {
          glow.remove();
        }
      });

      for (var i = 0; i < dotCount; i += 1) {
        var dot = createParticle("button-burst-dot");
        var size = gsap.utils.random(7, 16, 1);
        var angle = Math.random() * Math.PI * 2;
        var spread = gsap.utils.random(42, Math.max(rect.width, rect.height) * 0.48 + 74);
        var endX = originX + Math.cos(angle) * spread;
        var endY = originY + Math.sin(angle) * spread - gsap.utils.random(10, 48);

        gsap.set(dot, {
          x: originX,
          y: originY,
          width: size,
          height: size,
          opacity: 0,
          scale: 0.28,
          rotation: gsap.utils.random(-24, 24),
          force3D: true
        });

        var tl = gsap.timeline({
          onComplete: function () {
            dot.remove();
          }
        });

        tl.to(dot, {
          opacity: 1,
          scale: 1,
          duration: 0.12,
          ease: "power2.out"
        }).to(dot, {
          x: endX,
          y: endY,
          opacity: 0,
          scale: 0.2,
          rotation: gsap.utils.random(-140, 140),
          duration: gsap.utils.random(0.62, 0.86),
          ease: "power3.out"
        }, 0.02);
      }
    }

    document.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) {
        return;
      }

      var trigger = isBurstTarget(event.target);
      if (!trigger) {
        return;
      }

      burstFrom(trigger);
    }, true);
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadGsap(initBurst);
  });
})();
