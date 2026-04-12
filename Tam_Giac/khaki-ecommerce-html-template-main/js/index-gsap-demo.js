document.addEventListener("DOMContentLoaded", function () {
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var prefersLowPower =
    window.matchMedia("(prefers-reduced-data: reduce)").matches ||
    window.matchMedia("(update: slow)").matches;

  if (!gsap || prefersReducedMotion) {
    return;
  }

  if (ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  var headerBrand = document.querySelector("header .brand");
  var menuBar = document.querySelector("header .menu-bar");
  var homeMain = document.querySelector(".home-main");
  var heroSlider = document.querySelector(".slider");
  var heroFrame = document.querySelector(".bx-wrapper") || heroSlider;
  var collectionSection = document.querySelector(".collection");
  var collectionPanels = gsap.utils.toArray(".collection > div");
  var collectionTitles = gsap.utils.toArray(".collection h2");
  var productSections = gsap.utils.toArray(".new-product-section");
  var productCards = gsap.utils.toArray(".new-product-section .product");
  var footerWidgets = gsap.utils.toArray("footer .footer-widget .widget");
  var footerBar = document.querySelector("footer .footer-bar");

  function getRealSlides() {
    return gsap.utils.toArray(".slider > div").filter(function (slide) {
      return !slide.classList.contains("bx-clone");
    });
  }

  function getSlideParts(slide) {
    return slide ? gsap.utils.toArray(slide.querySelectorAll(".slider-text > *")) : [];
  }

  function setInitialHeroState() {
    getRealSlides().forEach(function (slide, index) {
      var image = slide.querySelector("img");
      var text = slide.querySelector(".slider-text");
      var parts = getSlideParts(slide);

      if (image) {
        gsap.set(image, {
          scale: index === 0 ? 1.03 : 1.12,
          transformOrigin: "center center"
        });
      }

      if (text) {
        gsap.set(text, {
          autoAlpha: index === 0 ? 1 : 0.4
        });
      }

      gsap.set(parts, {
        y: index === 0 ? 0 : 24,
        rotateX: index === 0 ? 0 : -12,
        autoAlpha: index === 0 ? 1 : 0,
        transformOrigin: "top center"
      });
    });
  }

  function animateHeroSlide(index, immediate) {
    var slides = getRealSlides();
    if (!slides.length) {
      return;
    }

    slides.forEach(function (slide, slideIndex) {
      var image = slide.querySelector("img");
      var text = slide.querySelector(".slider-text");
      var parts = getSlideParts(slide);
      var cta = slide.querySelector(".slider-text a");
      var active = slideIndex === index;

      if (image) {
        gsap.killTweensOf(image);
        gsap.to(image, {
          scale: active ? 1.03 : 1.1,
          duration: immediate ? 0 : 0.9,
          ease: "power3.out",
          overwrite: true
        });

        if (active && !immediate) {
          gsap.fromTo(image, {
            filter: "brightness(0.82) saturate(0.88)"
          }, {
            filter: "brightness(1) saturate(1.04)",
            duration: 0.8,
            ease: "power2.out",
            overwrite: true
          });
        }
      }

      if (text) {
        gsap.killTweensOf(text);
        gsap.to(text, {
          autoAlpha: active ? 1 : 0.55,
          duration: immediate ? 0 : 0.35,
          ease: "power2.out",
          overwrite: true
        });
      }

      if (active) {
        gsap.fromTo(parts, {
          y: immediate ? 0 : 28,
          rotateX: immediate ? 0 : -10,
          autoAlpha: immediate ? 1 : 0
        }, {
          y: 0,
          rotateX: 0,
          autoAlpha: 1,
          duration: immediate ? 0 : 0.7,
          ease: "power3.out",
          stagger: 0.08,
          overwrite: true
        });
      } else {
        gsap.to(parts, {
          y: 20,
          rotateX: -8,
          autoAlpha: 0,
          duration: immediate ? 0 : 0.24,
          ease: "power1.out",
          overwrite: true
        });
      }

      if (cta && active && !immediate) {
        gsap.fromTo(cta, {
          y: 12,
          scale: 0.94,
          autoAlpha: 0
        }, {
          y: 0,
          scale: 1,
          autoAlpha: 1,
          duration: 0.58,
          ease: "back.out(1.7)",
          delay: 0.22,
          overwrite: true
        });
      }
    });
  }

  function runIntro() {
    var introTimeline = gsap.timeline({
      defaults: {
        ease: "power2.out"
      }
    });

    introTimeline
      .from("header", {
        y: -24,
        autoAlpha: 0,
        duration: 0.6
      })
      .from(headerBrand, {
        y: -18,
        autoAlpha: 0,
        duration: 0.48
      }, "-=0.32")
      .from(menuBar, {
        y: -14,
        autoAlpha: 0,
        duration: 0.44
      }, "-=0.24")
      .from(homeMain, {
        y: 40,
        autoAlpha: 0,
        scale: 0.985,
        duration: 0.78
      }, "-=0.12")
      .from(heroFrame, {
        y: 32,
        autoAlpha: 0,
        duration: 0.72
      }, "-=0.42");

    animateHeroSlide(0, false);
  }

  function enableHeroDepth() {
    if (!heroFrame || !heroSlider || !supportsHover || window.innerWidth < 992 || prefersLowPower) {
      return;
    }

    var heroImages = gsap.utils.toArray(".slider img");
    var heroTexts = gsap.utils.toArray(".slider .slider-text");

    gsap.set(heroFrame, {
      transformPerspective: 1400,
      transformStyle: "preserve-3d",
      willChange: "transform"
    });

    gsap.set(heroImages, {
      willChange: "transform"
    });

    gsap.set(heroTexts, {
      willChange: "transform"
    });

    var rotateYTo = gsap.quickTo(heroFrame, "rotationY", {
      duration: 0.55,
      ease: "power3.out"
    });
    var rotateXTo = gsap.quickTo(heroFrame, "rotationX", {
      duration: 0.55,
      ease: "power3.out"
    });
    var xTo = gsap.quickTo(heroFrame, "x", {
      duration: 0.55,
      ease: "power3.out"
    });
    var yTo = gsap.quickTo(heroFrame, "y", {
      duration: 0.55,
      ease: "power3.out"
    });
    var imageXTo = heroImages.map(function (image) {
      return gsap.quickTo(image, "x", {
        duration: 0.55,
        ease: "power3.out"
      });
    });
    var imageYTo = heroImages.map(function (image) {
      return gsap.quickTo(image, "y", {
        duration: 0.55,
        ease: "power3.out"
      });
    });
    var textXTo = heroTexts.map(function (text) {
      return gsap.quickTo(text, "x", {
        duration: 0.55,
        ease: "power3.out"
      });
    });
    var textYTo = heroTexts.map(function (text) {
      return gsap.quickTo(text, "y", {
        duration: 0.55,
        ease: "power3.out"
      });
    });

    var pendingFrame = 0;
    var latestClientX = 0;
    var latestClientY = 0;
    var latestBounds = null;

    function updateHeroMotion() {
      pendingFrame = 0;
      if (!latestBounds) {
        return;
      }

      var offsetX = (latestClientX - latestBounds.left) / latestBounds.width - 0.5;
      var offsetY = (latestClientY - latestBounds.top) / latestBounds.height - 0.5;

      rotateYTo(offsetX * 9);
      rotateXTo(offsetY * -7);
      xTo(offsetX * 12);
      yTo(offsetY * 8);
      imageXTo.forEach(function (setX) { setX(offsetX * -24); });
      imageYTo.forEach(function (setY) { setY(offsetY * -18); });
      textXTo.forEach(function (setX) { setX(offsetX * 24); });
      textYTo.forEach(function (setY) { setY(offsetY * 14); });
    }

    heroFrame.addEventListener("pointermove", function (event) {
      latestClientX = event.clientX;
      latestClientY = event.clientY;
      latestBounds = heroFrame.getBoundingClientRect();

      if (!pendingFrame) {
        pendingFrame = window.requestAnimationFrame(updateHeroMotion);
      }
    });

    heroFrame.addEventListener("pointerleave", function () {
      rotateYTo(0);
      rotateXTo(0);
      xTo(0);
      yTo(0);
      imageXTo.forEach(function (setX) { setX(0); });
      imageYTo.forEach(function (setY) { setY(0); });
      textXTo.forEach(function (setX) { setX(0); });
      textYTo.forEach(function (setY) { setY(0); });
    });
  }

  function enableHeaderMotion() {
    if (!headerBrand || !menuBar) {
      return;
    }

    if (ScrollTrigger) {
      ScrollTrigger.create({
        start: 0,
        end: 240,
        scrub: 1,
        onUpdate: function (self) {
          var progress = self.progress;

          gsap.to(headerBrand, {
            y: -8 * progress,
            scale: 1 - (0.03 * progress),
            duration: 0.2,
            ease: "none",
            overwrite: true
          });

          gsap.to(menuBar, {
            y: -6 * progress,
            scale: 1 - (0.018 * progress),
            duration: 0.2,
            ease: "none",
            overwrite: true
          });

          if (homeMain) {
            gsap.to(homeMain, {
              y: -8 * progress,
              duration: 0.2,
              ease: "none",
              overwrite: true
            });
          }
        }
      });
      return;
    }

    window.addEventListener("scroll", function () {
      var progress = Math.min(1, (window.pageYOffset || 0) / 240);
      gsap.to(headerBrand, { y: -8 * progress, scale: 1 - (0.03 * progress), duration: 0.2, overwrite: true });
      gsap.to(menuBar, { y: -6 * progress, scale: 1 - (0.018 * progress), duration: 0.2, overwrite: true });
    }, { passive: true });
  }

  function revealProductSection(section) {
    if (prefersLowPower) {
      return;
    }

    var heading = section.querySelector(".product-section-heading");
    var cards = gsap.utils.toArray(section.querySelectorAll(".product"));
    if (!cards.length) {
      return;
    }

    gsap.set(cards, {
      y: 34,
      autoAlpha: 0,
      rotateX: -10,
      transformPerspective: 1000
    });

    function runReveal() {
      var timeline = gsap.timeline({
        defaults: {
          ease: "power2.out"
        }
      });

      if (heading) {
        timeline.fromTo(heading, {
          y: 28,
          autoAlpha: 0
        }, {
          y: 0,
          autoAlpha: 1,
          duration: 0.48
        });
      }

      timeline.to(cards, {
        y: 0,
        autoAlpha: 1,
        rotateX: 0,
        duration: 0.68,
        stagger: 0.09,
        clearProps: "transform,opacity,visibility"
      }, heading ? "-=0.18" : 0);
    }

    if (ScrollTrigger) {
      ScrollTrigger.create({
        trigger: section,
        start: "top 78%",
        once: true,
        onEnter: runReveal
      });
      return;
    }

    runReveal();
  }

  function enableCollectionShowcase() {
    if (!collectionSection || !collectionPanels.length || !ScrollTrigger || prefersLowPower) {
      return;
    }

    collectionPanels.forEach(function (panel, index) {
      gsap.set(panel, {
        autoAlpha: 0,
        y: 60,
        rotateY: index === 0 ? -18 : 18,
        scale: 0.985,
        transformPerspective: 1400,
        transformOrigin: index === 0 ? "right center" : "left center"
      });

      gsap.to(panel, {
        autoAlpha: 1,
        y: 0,
        rotateY: 0,
        scale: 1,
        duration: 1.05,
        ease: "power3.out",
        scrollTrigger: {
          trigger: collectionSection,
          start: "top 78%",
          once: true
        }
      });

      gsap.to(panel, {
        backgroundPosition: index === 0 ? "58% 50%" : "42% 50%",
        ease: "none",
        scrollTrigger: {
          trigger: collectionSection,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.15
        }
      });
    });

    gsap.from(collectionTitles, {
      yPercent: 36,
      autoAlpha: 0,
      duration: 0.72,
      ease: "power2.out",
      stagger: 0.12,
      scrollTrigger: {
        trigger: collectionSection,
        start: "top 78%",
        once: true
      }
    });
  }

  function enableCollectionHoverDepth() {
    if (!supportsHover || window.innerWidth < 992 || prefersLowPower) {
      return;
    }

    collectionPanels.forEach(function (panel) {
      var title = panel.querySelector("h2");

      panel.addEventListener("mousemove", function (event) {
        var bounds = panel.getBoundingClientRect();
        var offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
        var offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;

        gsap.to(panel, {
          y: -8,
          rotateY: offsetX * 8,
          rotateX: offsetY * -8,
          scale: 1.016,
          duration: 0.3,
          ease: "power2.out",
          overwrite: "auto"
        });

        if (title) {
          gsap.to(title, {
            x: offsetX * 16,
            y: offsetY * 10,
            duration: 0.3,
            ease: "power2.out",
            overwrite: "auto"
          });
        }
      });

      panel.addEventListener("mouseleave", function () {
        gsap.to(panel, {
          y: 0,
          rotateY: 0,
          rotateX: 0,
          scale: 1,
          duration: 0.35,
          ease: "power2.out",
          overwrite: "auto"
        });

        if (title) {
          gsap.to(title, {
            x: 0,
            y: 0,
            duration: 0.35,
            ease: "power2.out",
            overwrite: "auto"
          });
        }
      });
    });
  }

  function enableCardHover() {
    if (prefersLowPower || !supportsHover || window.innerWidth < 992) {
      return;
    }

    productCards.forEach(function (card) {
      var image = card.querySelector("img");
      var title = card.querySelector("h2");
      var detailButton = card.querySelector(".product-detail a");
      var price = card.querySelector(".product-detail p");

      gsap.set(card, {
        transformPerspective: 1200,
        transformStyle: "preserve-3d"
      });

      card.addEventListener("mousemove", function (event) {
        var bounds = card.getBoundingClientRect();
        var offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
        var offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;

        gsap.to(card, {
          y: -12,
          rotateY: offsetX * 11,
          rotateX: offsetY * -11,
          scale: 1.02,
          duration: 0.28,
          ease: "power2.out",
          overwrite: "auto"
        });

        if (image) {
          gsap.to(image, {
            scale: 1.06,
            x: offsetX * -10,
            y: offsetY * -10,
            duration: 0.28,
            ease: "power2.out",
            overwrite: "auto"
          });
        }

        if (title) {
          gsap.to(title, {
            x: offsetX * 6,
            duration: 0.28,
            ease: "power2.out",
            overwrite: "auto"
          });
        }

        if (detailButton) {
          gsap.to(detailButton, {
            x: offsetX * 4,
            y: -1,
            duration: 0.28,
            ease: "power2.out",
            overwrite: "auto"
          });
        }

        if (price) {
          gsap.to(price, {
            x: offsetX * -5,
            duration: 0.28,
            ease: "power2.out",
            overwrite: "auto"
          });
        }
      });

      card.addEventListener("mouseleave", function () {
        gsap.to(card, {
          y: 0,
          rotateY: 0,
          rotateX: 0,
          scale: 1,
          duration: 0.34,
          ease: "power2.out",
          overwrite: "auto"
        });

        if (image) {
          gsap.to(image, {
            scale: 1,
            x: 0,
            y: 0,
            duration: 0.34,
            ease: "power2.out",
            overwrite: "auto"
          });
        }

        if (title) {
          gsap.to(title, {
            x: 0,
            duration: 0.34,
            ease: "power2.out",
            overwrite: "auto"
          });
        }

        if (detailButton) {
          gsap.to(detailButton, {
            x: 0,
            y: 0,
            duration: 0.34,
            ease: "power2.out",
            overwrite: "auto"
          });
        }

        if (price) {
          gsap.to(price, {
            x: 0,
            duration: 0.34,
            ease: "power2.out",
            overwrite: "auto"
          });
        }
      });
    });
  }

  function revealFooter() {
    if (!footerWidgets.length) {
      return;
    }

    var run = function () {
      gsap.fromTo(footerWidgets, {
        y: 34,
        autoAlpha: 0
      }, {
        y: 0,
        autoAlpha: 1,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.1
      });

      if (footerBar) {
        gsap.fromTo(footerBar, {
          y: 18,
          autoAlpha: 0
        }, {
          y: 0,
          autoAlpha: 1,
          duration: 0.46,
          ease: "power2.out",
          delay: 0.16
        });
      }
    };

    if (ScrollTrigger) {
      ScrollTrigger.create({
        trigger: "footer",
        start: "top 82%",
        once: true,
        onEnter: run
      });
      return;
    }

    run();
  }

  window.addEventListener("tamgiac:hero-before", function (event) {
    var previousIndex = event.detail && typeof event.detail.previousIndex === "number"
      ? event.detail.previousIndex
      : 0;
    animateHeroSlide(previousIndex, true);
  });

  window.addEventListener("tamgiac:hero-change", function (event) {
    var nextIndex = event.detail && typeof event.detail.index === "number"
      ? event.detail.index
      : 0;
    animateHeroSlide(nextIndex, false);
  });

  setInitialHeroState();
  window.addEventListener("load", runIntro, { once: true });
  window.addEventListener("load", enableHeroDepth, { once: true });
  enableHeaderMotion();
  productSections.forEach(revealProductSection);
  enableCollectionShowcase();
  enableCollectionHoverDepth();
  enableCardHover();
  revealFooter();
});
