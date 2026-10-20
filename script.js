/* Shared JavaScript */

(function () {
  "use strict";

  /* Configuration */
  const LOADER = {
    duration: 3000,   // ms: how long the loader takes, every page, every time
    finishPause: 250, // ms: hold on 100% before fading out
    maxWait: 10000,   // ms: failsafe, never keep the overlay longer than this
  };

  // Used only for scroll reveal animations
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* DOM Ready */
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

  /*  Loading Screen  */
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

  /* 
     Hero Background Carousel
     Auto-plays only (no visitor controls). Slides in from the right, loops
     forever, and pauses while the tab is hidden or the hero is off-screen.
      */
  function initHeroCarousel() {
    const root = document.querySelector("[data-hero-carousel]");
    if (!root) return null;

    const slides = Array.from(root.querySelectorAll(".hero-slide"));
    if (slides.length < 2) return { start() {} };

    const INTERVAL = Number(root.dataset.interval) || 5000; // ms each slide stays
    const SLIDE_MS = 1000; // keep in sync with --hero-slide-duration in CSS

    let current = 0;
    let timer = null;
    let animating = false;
    let started = false;
    let inView = true;

    // Move a slide back to its waiting spot (off to the right) without animating
    function resetSlide(slide) {
      slide.classList.add("no-anim");
      slide.classList.remove("is-leaving", "is-active");
      void slide.offsetWidth; // force reflow so the jump is not animated
      slide.classList.remove("no-anim");
    }

    function next() {
      if (animating) return;
      animating = true;

      const from = slides[current];
      current = (current + 1) % slides.length;
      const to = slides[current];

      resetSlide(to);
      from.classList.remove("is-active");
      from.classList.add("is-leaving");
      to.classList.add("is-active");

      setTimeout(() => {
        resetSlide(from);
        animating = false;
      }, SLIDE_MS + 50);
    }

    function schedule() {
      clearTimeout(timer);
      if (!started || !inView || document.hidden) return;
      timer = setTimeout(() => {
        next();
        schedule();
      }, INTERVAL);
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

  /* Gallery Lightbox  */
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

  /* 
     Mobile Navigation
     Closes with: the X button, a tap on the dark area, Escape, a link click,
     or by resizing up to the desktop layout.
      */
  function initMobileNav() {
    const toggle = document.querySelector(".nav-toggle");
    const mobileNav = document.querySelector(".nav-mobile");
    if (!toggle || !mobileNav) return;

    const closeBtn = mobileNav.querySelector(".nav-close");

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      mobileNav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
    }

    const isOpen = () => mobileNav.classList.contains("is-open");

    toggle.addEventListener("click", () => {
      const open = !isOpen();
      setOpen(open);
      if (open) {
        const firstLink = mobileNav.querySelector("a");
        if (firstLink) firstLink.focus({ preventScroll: true });
      } else {
        toggle.focus();
      }
    });

    // X button
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        setOpen(false);
        toggle.focus();
      });
    }

    // Tap anywhere on the dark area (anything that isn't a link or button)
    mobileNav.addEventListener("click", (e) => {
      if (!e.target.closest("a, button")) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Close on link click
    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    // If the window grows to the desktop layout, don't leave the page locked
    window.matchMedia("(min-width: 1180px)").addEventListener("change", (e) => {
      if (e.matches && isOpen()) setOpen(false);
    });
  }

  /* Header Scroll State  */
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

  /* Scroll Animations (Intersection Observer) — Reversible */
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

  /* 
     Back to Top
     Glides up the page with an eased, distance-based duration so you
     see everything you scrolled past on the way back.
      */
  function initBackToTop() {
    const btn = document.querySelector(".back-to-top");
    if (!btn) return;

    const html = document.documentElement;
    let ticking = false;
    let gliding = false;

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

    // Ease in-out: gentle start, smooth middle, soft landing
    function ease(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function glideToTop() {
      const startY = window.scrollY;
      if (startY <= 0 || gliding) return;
      gliding = true;

      // Longer pages take longer: between 1.2s and 3.5s
      const duration = Math.min(Math.max(startY * 0.7, 1200), 3500);
      const startTime = performance.now();
      const previous = html.style.scrollBehavior;
      let cancelled = false;

      // CSS smooth-scroll would fight every frame of the animation
      html.style.scrollBehavior = "auto";

      // Any manual scroll input stops the glide so the visitor stays in control
      const cancelEvents = ["wheel", "touchstart", "mousedown", "keydown"];
      const cancel = () => { cancelled = true; };
      cancelEvents.forEach((ev) => window.addEventListener(ev, cancel, { passive: true }));

      function done() {
        cancelEvents.forEach((ev) => window.removeEventListener(ev, cancel));
        html.style.scrollBehavior = previous;
        gliding = false;
      }

      function step(now) {
        if (cancelled) return done();
        const t = Math.min((now - startTime) / duration, 1);
        window.scrollTo(0, Math.round(startY * (1 - ease(t))));
        if (t < 1) requestAnimationFrame(step);
        else done();
      }

      requestAnimationFrame(step);
    }

    btn.addEventListener("click", glideToTop);
  }

  /* Active Navigation State */
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

  /* Activity / Event Filters */
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

  /* FAQ Accordion */
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

  /* Contact Form Validation (Client-side only) */
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
        // Open the visitor's email app with the message pre-filled
        const val = (id) => document.getElementById(id).value.trim();
        const body = `${val("message")}\n\n— ${val("name")} (${val("email")})`;
        window.location.href =
          "mailto:hello@runningwithsole.co.za" +
          "?subject=" + encodeURIComponent(val("subject")) +
          "&body=" + encodeURIComponent(body);
        form.reset();
        if (successMsg) {
          successMsg.classList.add("is-visible");
          successMsg.focus();
        }
        // Hide success after a while
        setTimeout(() => {
          if (successMsg) successMsg.classList.remove("is-visible");
        }, 10000);
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

  
/* ==========================================================================
   EVENT DETAILS MODAL
   ========================================================================== */

(() => {
  const modal = document.getElementById("event-modal");

  // This script can safely run on pages without the event modal.
  if (!modal) return;

  const title = document.getElementById("event-modal-title");
  const category = document.getElementById("event-modal-category");
  const description = document.getElementById("event-modal-description");
  const date = document.getElementById("event-modal-date");
  const time = document.getElementById("event-modal-time");
  const location = document.getElementById("event-modal-location");
  const difficulty = document.getElementById("event-modal-difficulty");

  const events = {
    anniversary: {
      title: "Club Anniversary Run & Celebration",
      category: "Featured Event",
      description:
        "Join us for a special group run followed by a social gathering. Celebrate the club, meet fellow runners, and enjoy a welcoming community atmosphere. All paces are welcome.",
      date: "Saturday, 28 November 2026",
      time: "06:30",
      location: "Main Park Entrance",
      difficulty: "All levels"
    },

    sunrise: {
      title: "Sunrise Park Loop",
      category: "Social Run",
      description:
        "Start your morning with an easy-paced group run through scenic park paths. This relaxed session is suitable for runners of all levels. Meet the group at the main entrance and enjoy the run together.",
      date: "Saturday, 7 November 2026",
      time: "05:45",
      location: "Main Park Entrance",
      difficulty: "All levels"
    },

    intervals: {
      title: "Track Intervals Night",
      category: "Speed Session",
      description:
        "Improve your speed and running efficiency with structured 400-metre and 800-metre intervals, with recovery jogs between efforts. Bring a running watch, water bottle, and suitable training shoes.",
      date: "Wednesday, 11 November 2026",
      time: "18:00",
      location: "Community Athletics Track",
      difficulty: "Moderate and above"
    },

    "half-marathon": {
      title: "Half Marathon Tune-Up",
      category: "Race Preparation",
      description:
        "Build endurance with a progressive long run designed for half-marathon preparation. Multiple distance options can accommodate different training goals. Choose a distance appropriate to your current fitness and training plan.",
      date: "Saturday, 21 November 2026",
      time: "05:30",
      location: "Park Trailhead Car Park",
      difficulty: "Experienced runners"
    },

    welcome: {
      title: "New Member Welcome Run",
      category: "Social",
      description:
        "Meet the club in a friendly, relaxed setting. This short group run welcomes new and prospective members, with time afterwards for coffee, introductions, and questions about joining.",
      date: "Saturday, 5 December 2026",
      time: "07:00",
      location: "Main Park Entrance",
      difficulty: "Beginner friendly"
    }
  };

  let previousFocus = null;

  function openModal(eventKey, trigger) {
    const event = events[eventKey];

    if (!event) return;

    previousFocus = trigger;

    title.textContent = event.title;
    category.textContent = event.category;
    description.textContent = event.description;
    date.textContent = event.date;
    time.textContent = event.time;
    location.textContent = event.location;
    difficulty.textContent = event.difficulty;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const closeButton = modal.querySelector(".event-modal-close");
    closeButton.focus();
  }

  function closeModal() {
    if (!modal.classList.contains("is-open")) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (previousFocus && document.contains(previousFocus)) {
      previousFocus.focus();
    }
  }

  // Event delegation supports all event cards, including filtered lists.
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-event-details]");

    if (trigger) {
      openModal(trigger.dataset.eventDetails, trigger);
      return;
    }

    if (
      event.target.closest("[data-modal-close]") &&
      modal.classList.contains("is-open")
    ) {
      closeModal();
    }
  });

  // Close the modal with Escape and keep keyboard focus inside while open.
  document.addEventListener("keydown", (event) => {
    if (!modal.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key === "Tab") {
      const focusable = [
        ...modal.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), ' +
          'select:not([disabled]), textarea:not([disabled]), ' +
          '[tabindex]:not([tabindex="-1"])'
        )
      ].filter((element) => element.getClientRects().length > 0);

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }
  });
})();

})();