/**
 * RUNNING CLUB NAME - Shared JavaScript
 * Handles: Loading screen, mobile nav, scroll animations,
 * header scroll state, filters, forms, FAQ, back-to-top
 */

(function () {
  "use strict";

  /* ========================================================================
     Configuration
     ======================================================================== */
  const LOADER = {
    duration: 3000,   // ms: how long the loader takes, every page, every time
    finishPause: 250, // ms: hold on 100% before fading out
    maxWait: 10000,   // ms: failsafe, never keep the overlay longer than this
  };

  // Used only for scroll reveal animations (the loader ignores it on purpose)
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ========================================================================
     DOM Ready
     ======================================================================== */
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    initMobileNav();
    initHeaderScroll();
    initBackToTop();
    initFilters();
    initFAQ();
    initContactForm();
    initActiveNav();

    initLightbox();
    const heroCarousel = initHeroCarousel();

    // Start reveal animations and the carousel only once the loader has gone,
    // so the hero animates in view instead of behind the overlay.
    initLoader(() => {
      initScrollAnimations();
      if (heroCarousel) heroCarousel.start();
    });
  }

  /* ========================================================================
     Loading Screen
     ======================================================================== */
  function initLoader(onDone) {
    const overlay = document.getElementById("loader-overlay");
    if (!overlay) {
      document.body.classList.remove("is-loading");
      onDone();
      return;
    }

    const bar = overlay.querySelector(".loader-progress-bar");
    const track = overlay.querySelector(".loader-progress-track");
    const percentEl = overlay.querySelector(".loader-percent");

    const duration = LOADER.duration;

    // The loader finishes when BOTH the timer is done AND the page is truly ready
    let pageReady = false;
    const markReady = () => {
      pageReady = true;
    };

    const loaded = new Promise((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", resolve, { once: true });
    });
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

    Promise.all([loaded, fontsReady]).then(markReady, markReady);
    setTimeout(markReady, LOADER.maxWait); // failsafe

    let lastPct = -1;

    function render(progress) {
      const pct = progress >= 1 ? 100 : Math.floor(progress * 100);
      if (pct === lastPct) return;
      lastPct = pct;

      if (bar) bar.style.transform = "scaleX(" + pct / 100 + ")";
      if (percentEl) percentEl.textContent = pct + "%";
      if (track) track.setAttribute("aria-valuenow", String(pct));
    }

    // Ease in-out: gentle start, steady middle, smooth landing
    function ease(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function finish() {
      render(1);
      setTimeout(() => {
        overlay.classList.add("is-hidden");
        overlay.setAttribute("aria-hidden", "true");
        overlay.setAttribute("aria-busy", "false");
        document.body.classList.remove("is-loading");
        onDone();
      }, LOADER.finishPause);
    }

    const start = performance.now();

    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      let progress = ease(t);

      // Slow connection: wait at 99% instead of showing 100% too early
      if (!pageReady) progress = Math.min(progress, 0.99);

      render(progress);

      if (t < 1 || !pageReady) {
        requestAnimationFrame(tick);
      } else {
        finish();
      }
    }

    render(0);
    requestAnimationFrame(tick);
  }

  // Back/forward cache restore: page comes back already loaded, so make sure
  // the overlay is out of the way and the scroll lock is off.
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    const overlay = document.getElementById("loader-overlay");
    if (overlay) overlay.classList.add("is-hidden");
    document.body.classList.remove("is-loading");
  });

  /* ========================================================================
     Hero Background Carousel
     Slides in from the right, loops forever, pauses when the tab is hidden
     or the hero is off-screen, and can be paused with the button.
     ======================================================================== */
  function initHeroCarousel() {
    const root = document.querySelector("[data-hero-carousel]");
    if (!root) return null;

    const slides = Array.from(root.querySelectorAll(".hero-slide"));
    const controls = document.querySelector(".hero-carousel-controls");
    const dotsWrap = controls ? controls.querySelector(".hero-dots") : null;
    const toggle = controls ? controls.querySelector(".hero-toggle") : null;

    if (slides.length < 2) {
      if (controls) controls.style.display = "none";
      return { start() {} };
    }

    const INTERVAL = Number(root.dataset.interval) || 5000; // ms each slide stays
    const SLIDE_MS = 1000; // keep in sync with --hero-slide-duration in CSS

    let current = 0;
    let timer = null;
    let animating = false;
    let started = false;
    let userPaused = false;
    let inView = true;

    const dots = slides.map((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "hero-dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", "Show slide " + (i + 1));
      if (i === 0) dot.setAttribute("aria-current", "true");
      dot.addEventListener("click", () => {
        goTo(i);
        schedule();
      });
      if (dotsWrap) dotsWrap.appendChild(dot);
      return dot;
    });

    // Move a slide back to its waiting spot (off to the right) without animating
    function resetSlide(slide) {
      slide.classList.add("no-anim");
      slide.classList.remove("is-leaving", "is-active");
      void slide.offsetWidth; // force reflow so the jump is not animated
      slide.classList.remove("no-anim");
    }

    function goTo(index) {
      if (index === current || animating) return;
      animating = true;

      const from = slides[current];
      const to = slides[index];

      resetSlide(to);
      from.classList.remove("is-active");
      from.classList.add("is-leaving");
      to.classList.add("is-active");

      dots[current].classList.remove("is-active");
      dots[current].removeAttribute("aria-current");
      dots[index].classList.add("is-active");
      dots[index].setAttribute("aria-current", "true");
      current = index;

      setTimeout(() => {
        resetSlide(from);
        animating = false;
      }, SLIDE_MS + 50);
    }

    function canPlay() {
      return started && !userPaused && inView && !document.hidden;
    }

    function schedule() {
      clearTimeout(timer);
      if (!canPlay()) return;
      timer = setTimeout(() => {
        goTo((current + 1) % slides.length);
        schedule();
      }, INTERVAL);
    }

    if (toggle) {
      toggle.addEventListener("click", () => {
        userPaused = !userPaused;
        toggle.classList.toggle("is-paused", userPaused);
        toggle.setAttribute("aria-label", userPaused ? "Play slideshow" : "Pause slideshow");
        schedule();
      });
    }

    document.addEventListener("visibilitychange", schedule);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        inView = entries[0].isIntersecting;
        schedule();
      }).observe(root);
    }

    return {
      start() {
        started = true;
        schedule();
      },
    };
  }

  /* ========================================================================
     Gallery Lightbox
     ======================================================================== */
  function initLightbox() {
    const links = Array.from(document.querySelectorAll("[data-lightbox]"));
    const box = document.getElementById("lightbox");
    if (!links.length || !box) return;

    const img = box.querySelector(".lightbox-img");
    const counter = box.querySelector(".lightbox-counter");
    const closeBtn = box.querySelector(".lightbox-close");
    const prevBtn = box.querySelector(".lightbox-prev");
    const nextBtn = box.querySelector(".lightbox-next");
    const focusable = [closeBtn, prevBtn, nextBtn];

    let index = 0;
    let lastFocus = null;

    function preload(i) {
      const n = (i + links.length) % links.length;
      new Image().src = links[n].href;
    }

    function show(i) {
      index = (i + links.length) % links.length;
      const link = links[index];
      const thumb = link.querySelector("img");

      img.classList.add("is-loading");
      img.onload = () => img.classList.remove("is-loading");
      img.onerror = () => img.classList.remove("is-loading");
      img.src = link.href;
      img.alt = thumb ? thumb.alt : "";
      counter.textContent = index + 1 + " / " + links.length;

      preload(index + 1);
      preload(index - 1);
    }

    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      box.classList.add("is-open");
      box.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
      closeBtn.focus();
    }

    function close() {
      box.classList.remove("is-open");
      box.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");
      if (lastFocus) lastFocus.focus();
    }

    const isOpen = () => box.classList.contains("is-open");

    links.forEach((link, i) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        open(i);
      });
    });

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", () => show(index - 1));
    nextBtn.addEventListener("click", () => show(index + 1));

    // Click on the dark background closes the viewer
    box.addEventListener("click", (e) => {
      if (e.target === box || e.target.classList.contains("lightbox-stage")) close();
    });

    document.addEventListener("keydown", (e) => {
      if (!isOpen()) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(index - 1);
      else if (e.key === "ArrowRight") show(index + 1);
      else if (e.key === "Tab") {
        // Keep keyboard focus inside the viewer
        const pos = focusable.indexOf(document.activeElement);
        e.preventDefault();
        const next = e.shiftKey
          ? focusable[(pos <= 0 ? focusable.length : pos) - 1]
          : focusable[(pos + 1) % focusable.length];
        next.focus();
      }
    });

    // Swipe left / right on touch screens
    let startX = 0;
    box.addEventListener("touchstart", (e) => { startX = e.changedTouches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(dx < 0 ? index + 1 : index - 1);
    }, { passive: true });
  }

  /* ========================================================================
     Mobile Navigation
     ======================================================================== */
  function initMobileNav() {
    const toggle = document.querySelector(".nav-toggle");
    const mobileNav = document.querySelector(".nav-mobile");
    if (!toggle || !mobileNav) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      mobileNav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
    }

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      setOpen(open);

      if (open) {
        const firstLink = mobileNav.querySelector("a");
        if (firstLink) firstLink.focus();
      } else {
        toggle.focus();
      }
    });

    // Close on link click
    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileNav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* ========================================================================
     Header Scroll State
     ======================================================================== */
  function initHeaderScroll() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    let ticking = false;

    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 40);
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );

    update(); // initial
  }

  /* ========================================================================
     Scroll Animations (Intersection Observer) — Reversible
     ======================================================================== */
  function initScrollAnimations() {
    const targets = document.querySelectorAll("[data-animate], [data-stagger]");

    if (REDUCED_MOTION || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          } else {
            // Reset so it can animate again on scroll back
            entry.target.classList.remove("is-visible");
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    targets.forEach((el) => observer.observe(el));
  }

  /* ========================================================================
     Back to Top
     ======================================================================== */
  function initBackToTop() {
    const btn = document.querySelector(".back-to-top");
    if (!btn) return;

    let ticking = false;

    function update() {
      btn.classList.toggle("is-visible", window.scrollY > 500);
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );

    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: REDUCED_MOTION ? "auto" : "smooth" });
    });
  }

  /* ========================================================================
     Active Navigation State
     ======================================================================== */
  function initActiveNav() {
    const path = window.location.pathname.split("/").pop() || "index.html";
    const links = document.querySelectorAll(".nav-link");

    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;
      const linkPath = href.split("/").pop();
      if (linkPath === path) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  /* ========================================================================
     Activity / Event Filters
     ======================================================================== */
  function initFilters() {
    const filterBars = document.querySelectorAll(".filter-bar");
    if (!filterBars.length) return;

    filterBars.forEach((bar) => {
      const buttons = bar.querySelectorAll(".filter-btn");
      const targetSelector = bar.dataset.filterTarget || "[data-filter-item]";
      const items = document.querySelectorAll(targetSelector);

      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const filter = btn.dataset.filter;

          buttons.forEach((b) => {
            b.classList.remove("is-active");
            b.setAttribute("aria-pressed", "false");
          });
          btn.classList.add("is-active");
          btn.setAttribute("aria-pressed", "true");

          items.forEach((item) => {
            const categories = (item.dataset.category || "").split(" ");
            if (filter === "all" || categories.includes(filter)) {
              item.style.display = "";
              // Re-trigger animation
              item.classList.remove("is-visible");
              requestAnimationFrame(() => {
                item.classList.add("is-visible");
              });
            } else {
              item.style.display = "none";
            }
          });
        });
      });
    });
  }

  /* ========================================================================
     FAQ Accordion
     ======================================================================== */
  function initFAQ() {
    const items = document.querySelectorAll(".faq-item");
    if (!items.length) return;

    items.forEach((item) => {
      const question = item.querySelector(".faq-question");
      const answer = item.querySelector(".faq-answer");
      if (!question || !answer) return;

      question.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");

        // Close others (accordion behavior)
        items.forEach((other) => {
          if (other !== item) {
            other.classList.remove("is-open");
            const otherAnswer = other.querySelector(".faq-answer");
            if (otherAnswer) otherAnswer.style.maxHeight = null;
            const otherQ = other.querySelector(".faq-question");
            if (otherQ) otherQ.setAttribute("aria-expanded", "false");
          }
        });

        if (isOpen) {
          item.classList.remove("is-open");
          answer.style.maxHeight = null;
          question.setAttribute("aria-expanded", "false");
        } else {
          item.classList.add("is-open");
          answer.style.maxHeight = answer.scrollHeight + "px";
          question.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  /* ========================================================================
     Contact Form Validation (Client-side only)
     ======================================================================== */
  function initContactForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;

    const successMsg = document.getElementById("form-success");

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      let valid = true;
      const fields = [
        { id: "name", required: true, min: 2 },
        { id: "email", required: true, type: "email" },
        { id: "subject", required: true, min: 3 },
        { id: "message", required: true, min: 10 },
      ];

      fields.forEach((field) => {
        const input = document.getElementById(field.id);
        const group = input?.closest(".form-group");
        if (!input || !group) return;

        const value = input.value.trim();
        let error = "";

        if (field.required && !value) {
          error = "This field is required.";
        } else if (field.min && value.length < field.min) {
          error = `Please enter at least ${field.min} characters.`;
        } else if (field.type === "email" && value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            error = "Please enter a valid email address.";
          }
        }

        if (error) {
          valid = false;
          group.classList.add("has-error");
          const errEl = group.querySelector(".form-error");
          if (errEl) errEl.textContent = error;
        } else {
          group.classList.remove("has-error");
        }
      });

      if (valid) {
        // Demonstration only — no backend
        form.reset();
        if (successMsg) {
          successMsg.classList.add("is-visible");
          successMsg.focus();
        }
        // Hide success after a while
        setTimeout(() => {
          if (successMsg) successMsg.classList.remove("is-visible");
        }, 6000);
      }
    });

    // Clear error on input
    form.querySelectorAll(".form-input, .form-textarea").forEach((input) => {
      input.addEventListener("input", () => {
        const group = input.closest(".form-group");
        if (group) group.classList.remove("has-error");
      });
    });
  }
})();