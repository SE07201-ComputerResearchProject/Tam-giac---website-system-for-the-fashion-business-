document.addEventListener('DOMContentLoaded', () => {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (!gsap || prefersReducedMotion) {
    return;
  }

  if (ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  const headerBrand = document.querySelector('header .brand');
  const menuBar = document.querySelector('header .menu-bar');
  const heroSlider = document.querySelector('.slider');
  const heroTextParts = gsap.utils.toArray('.slider .slider-text > *');
  const collectionSection = document.querySelector('.collection');
  const collectionPanels = gsap.utils.toArray('.collection > div');
  const collectionTitles = gsap.utils.toArray('.collection h2');
  const productSections = gsap.utils.toArray('.new-product-section');
  const productCards = gsap.utils.toArray('.new-product-section .product');
  const prefersLowPower =
    window.matchMedia('(prefers-reduced-data: reduce)').matches ||
    window.matchMedia('(update: slow)').matches;

  const runIntro = () => {
    const introTimeline = gsap.timeline({
      defaults: {
        duration: 0.55,
        ease: 'power2.out'
      }
    });

    introTimeline
      .from(headerBrand, { y: -18, autoAlpha: 0 })
      .from(menuBar, { y: -14, autoAlpha: 0 }, '-=0.28')
      .from(heroSlider, { y: 30, autoAlpha: 0, scale: 0.985, duration: 0.68 }, '-=0.12')
      .from(heroTextParts, { y: 26, autoAlpha: 0, duration: 0.48, stagger: 0.08 }, '-=0.34');
  };

  const enableHeroDepth = () => {
    if (!heroSlider || !supportsHover || window.innerWidth < 992 || prefersLowPower) {
      return;
    }

    const heroFrame = document.querySelector('.bx-wrapper') || heroSlider;
    const heroImages = gsap.utils.toArray('.slider img');
    const heroTexts = gsap.utils.toArray('.slider .slider-text');

    if (!heroFrame || !heroImages.length || !heroTexts.length) {
      return;
    }

    gsap.set(heroFrame, {
      transformPerspective: 1400,
      transformStyle: 'preserve-3d',
      willChange: 'transform'
    });
    gsap.set(heroImages, {
      scale: 1.04,
      transformOrigin: 'center center',
      willChange: 'transform'
    });
    gsap.set(heroTexts, {
      transformPerspective: 1200,
      transformStyle: 'preserve-3d',
      willChange: 'transform'
    });

    const rotateYTo = gsap.quickTo(heroFrame, 'rotationY', {
      duration: 0.55,
      ease: 'power3.out'
    });
    const rotateXTo = gsap.quickTo(heroFrame, 'rotationX', {
      duration: 0.55,
      ease: 'power3.out'
    });
    const xTo = gsap.quickTo(heroFrame, 'x', {
      duration: 0.55,
      ease: 'power3.out'
    });
    const imageXTo = heroImages.map((image) => gsap.quickTo(image, 'x', {
      duration: 0.55,
      ease: 'power3.out'
    }));
    const imageYTo = heroImages.map((image) => gsap.quickTo(image, 'y', {
      duration: 0.55,
      ease: 'power3.out'
    }));
    const textXTo = heroTexts.map((text) => gsap.quickTo(text, 'x', {
      duration: 0.55,
      ease: 'power3.out'
    }));
    const textYTo = heroTexts.map((text) => gsap.quickTo(text, 'y', {
      duration: 0.55,
      ease: 'power3.out'
    }));

    var pendingFrame = 0;
    var latestClientX = 0;
    var latestClientY = 0;
    var latestBounds = null;

    function updateHeroMotion() {
      pendingFrame = 0;
      if (!latestBounds) {
        return;
      }

      var offsetX = ((latestClientX - latestBounds.left) / latestBounds.width) - 0.5;
      var offsetY = ((latestClientY - latestBounds.top) / latestBounds.height) - 0.5;

      rotateYTo(offsetX * 8);
      rotateXTo(offsetY * -6);
      xTo(offsetX * 10);
      imageXTo.forEach((setX) => setX(offsetX * -22));
      imageYTo.forEach((setY) => setY(offsetY * -14));
      textXTo.forEach((setX) => setX(offsetX * 26));
      textYTo.forEach((setY) => setY(offsetY * 18));
    }

    function scheduleHeroMotion(event) {
      latestClientX = event.clientX;
      latestClientY = event.clientY;
      latestBounds = heroFrame.getBoundingClientRect();

      if (pendingFrame) {
        return;
      }

      pendingFrame = window.requestAnimationFrame(updateHeroMotion);
    }

    heroFrame.addEventListener('pointermove', scheduleHeroMotion);

    heroFrame.addEventListener('pointerleave', () => {
      rotateYTo(0);
      rotateXTo(0);
      xTo(0);
      imageXTo.forEach((setX) => setX(0));
      imageYTo.forEach((setY) => setY(0));
      textXTo.forEach((setX) => setX(0));
      textYTo.forEach((setY) => setY(0));
    });
  };

  const revealProductSection = (section) => {
    if (prefersLowPower) {
      return;
    }

    const heading = section.querySelector('.product-section-heading');
    const cards = gsap.utils.toArray(section.querySelectorAll('.product'));

    if (!cards.length) {
      return;
    }

    gsap.set(cards, { y: 28, autoAlpha: 0 });

    const runReveal = () => {
      const sectionTimeline = gsap.timeline({
        defaults: {
          ease: 'power2.out'
        }
      });

      if (heading) {
        sectionTimeline.fromTo(heading, {
          y: 24,
          autoAlpha: 0
        }, {
          y: 0,
          autoAlpha: 1,
          duration: 0.46
        });
      }

      sectionTimeline.to(cards, {
        y: 0,
        autoAlpha: 1,
        duration: 0.58,
        stagger: 0.08,
        clearProps: 'transform,opacity,visibility'
      }, heading ? '-=0.12' : 0);
    };

    if (ScrollTrigger) {
      ScrollTrigger.create({
        trigger: section,
        start: 'top 78%',
        once: true,
        onEnter: runReveal
      });
      return;
    }

    if (!('IntersectionObserver' in window)) {
      runReveal();
      return;
    }

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        runReveal();
        revealObserver.disconnect();
      });
    }, {
      threshold: 0.16
    });

    revealObserver.observe(section);
  };

  const enableCollectionShowcase = () => {
    if (!collectionSection || !collectionPanels.length || !ScrollTrigger || prefersLowPower) {
      return;
    }

    collectionPanels.forEach((panel, index) => {
      const fromClip = index === 0
        ? 'inset(0 100% 0 0 round 30px)'
        : 'inset(0 0 0 100% round 30px)';

      gsap.set(panel, {
        autoAlpha: 0,
        y: 62,
        rotateY: index === 0 ? -16 : 16,
        clipPath: fromClip,
        transformPerspective: 1400,
        transformOrigin: index === 0 ? 'right center' : 'left center'
      });

      gsap.to(panel, {
        autoAlpha: 1,
        y: 0,
        rotateY: 0,
        clipPath: 'inset(0 0 0 0 round 30px)',
        duration: 1.05,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: collectionSection,
          start: 'top 78%',
          once: true
        }
      });

      gsap.to(panel, {
        backgroundPosition: index === 0 ? '58% 50%' : '42% 50%',
        ease: 'none',
        scrollTrigger: {
          trigger: collectionSection,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.15
        }
      });
    });

    gsap.from(collectionTitles, {
      yPercent: 35,
      autoAlpha: 0,
      duration: 0.72,
      ease: 'power2.out',
      stagger: 0.12,
      scrollTrigger: {
        trigger: collectionSection,
        start: 'top 78%',
        once: true
      }
    });
  };

  const enableCardHover = () => {
    if (prefersLowPower) {
      return;
    }

    productCards.forEach((card) => {
      if (!supportsHover || window.innerWidth < 992) {
        return;
      }

      gsap.set(card, {
        transformPerspective: 1200,
        transformStyle: 'preserve-3d'
      });

      card.addEventListener('mousemove', (event) => {
        const bounds = card.getBoundingClientRect();
        const offsetX = ((event.clientX - bounds.left) / bounds.width) - 0.5;
        const offsetY = ((event.clientY - bounds.top) / bounds.height) - 0.5;

        gsap.to(card, {
          y: -10,
          rotateY: offsetX * 10,
          rotateX: offsetY * -10,
          scale: 1.018,
          duration: 0.28,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      });

      card.addEventListener('mouseenter', () => {
        gsap.to(card, {
          y: -8,
          duration: 0.24,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          y: 0,
          rotateY: 0,
          rotateX: 0,
          scale: 1,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      });
    });
  };

  window.addEventListener('load', runIntro, { once: true });
  window.addEventListener('load', enableHeroDepth, { once: true });
  productSections.forEach(revealProductSection);
  enableCollectionShowcase();
  enableCardHover();
});
