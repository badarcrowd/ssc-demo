/**
 * Author: Badar Rashdi
 * main.js
 * =========================================================
 * Interactive behaviour for luxury scroll-driven websites.
 *
 * Dependencies (must be loaded before this file):
 *   - GSAP          https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js
 *   - ScrollTrigger https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js
 *
 * Public API (all functions are exported on the `VoltaUI` namespace):
 * ┌──────────────────────────────┬──────────────────────────────────────────────────┐
 * │ Function                     │ Purpose                                          │
 * ├──────────────────────────────┼──────────────────────────────────────────────────┤
 * │ initGSAP()                   │ Register GSAP plugins                            │
 * │ setupHorizontalScroll(cfg)   │ Pin a section and drive horizontal slide scroll  │
 * │ initScrollReveal(sel, opts)  │ Fade-up reveal elements as they enter viewport   │
 * │ initNavbarScroll(id, thresh) │ Toggle .scrolled class on navbar after threshold │
 * │ initCustomCursor(cfg)        │ Animated two-part custom cursor                  │
 * │ initParallax(cfg)            │ Subtle parallax offset on a hero image           │
 * │ initAnchorScroll(selector)   │ Smooth-scroll to in-page anchor links            │
 * │ initHeroAnimation(cfg)       │ GSAP entry animations for the hero section       │
 * │ initFormSubmit(sel, opts)    │ Contact form submit with visual success feedback │
 * │ initResizeRefresh(sections)  │ Debounced ScrollTrigger refresh on window resize │
 * │ init()                       │ Convenience: runs all modules with default config│
 * └──────────────────────────────┴──────────────────────────────────────────────────┘
 *
 * Reuse on another project:
 *   1. Copy this file into your project.
 *   2. Load GSAP + ScrollTrigger before this script.
 *   3. Call the individual functions you need, OR call VoltaUI.init()
 *      with an optional config object to boot everything at once.
 *   4. Adjust CSS class names via the config arguments if your markup
 *      uses different class conventions.
 * =========================================================
 */

(function (global) {
  'use strict';

  /* =========================================================
     UTILITIES
     ========================================================= */

  /**
   * Returns the first DOM element matching a CSS selector.
   * Returns null (without throwing) when no match is found.
   *
   * @param {string} selector - CSS selector string.
   * @param {Element} [ctx=document] - Optional context to search within.
   * @returns {Element|null}
   */
  function qs(selector, ctx) {
    return (ctx || document).querySelector(selector);
  }

  /**
   * Returns all DOM elements matching a CSS selector as an Array.
   *
   * @param {string} selector - CSS selector string.
   * @param {Element} [ctx=document] - Optional context to search within.
   * @returns {Element[]}
   */
  function qsa(selector, ctx) {
    return Array.from((ctx || document).querySelectorAll(selector));
  }


  /* =========================================================
     1. GSAP PLUGIN REGISTRATION
     =========================================================
     Must be the first call before any ScrollTrigger usage.
     ========================================================= */

  /**
   * Registers required GSAP plugins.
   * Call this once, before any other GSAP-dependent function.
   *
   * @example
   *   VoltaUI.initGSAP();
   */
  function initGSAP() {
    if (typeof gsap === 'undefined') {
      console.warn('[VoltaUI] GSAP not found — make sure it is loaded before main.js');
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
  }


  /* =========================================================
     2. LENIS SMOOTH SCROLL
     =========================================================
     Lenis is a free, lightweight smooth-scroll library.
     It intercepts native scroll, applies easing, then fires
     ScrollTrigger.update() on every frame so GSAP animations
     stay in sync.

     No special HTML wrapper elements are required.
     ========================================================= */

  /**
   * Initialises Lenis smooth scrolling and syncs it with GSAP ScrollTrigger.
   * Must be called after initGSAP().
   *
   * @param {object}   [opts={}]         - Lenis constructor options.
   * @param {number}   [opts.duration=1.2] - Scroll animation duration in seconds.
   * @param {boolean}  [opts.smooth=true]  - Enable smooth scrolling.
   * @returns {object|null} The Lenis instance, or null if Lenis is not loaded.
   *
   * @example
   *   VoltaUI.initLenis({ duration: 1.5 });
   */
  function initLenis(opts) {
    if (typeof Lenis === 'undefined') {
      console.warn('[VoltaUI] Lenis not found — load Lenis before main.js');
      return null;
    }
    opts = opts || {};
    var lenis = new Lenis({
      duration:    opts.duration  !== undefined ? opts.duration : 1.2,
      easing:      opts.easing    || function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smooth:      opts.smooth    !== undefined ? opts.smooth   : true,
      smoothTouch: opts.smoothTouch || false,
    });

    // Keep GSAP ScrollTrigger in sync with Lenis virtual scroll position
    if (typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    return lenis;
  }


  /* =========================================================
     3. STICKY NARRATIVE SECTION
     =========================================================
     Left panel sticks at 100vh. Right panel stacks full-height
     image items vertically. An IntersectionObserver fires when
     each image item crosses the viewport midpoint, updating the
     counter, caption text, and a CSS progress bar on the right.

     Required HTML structure:
       <section class="sn-section">
         <div class="sn-layout">
           <div class="sn-left" id="snLeft">
             ...header...
             <div class="sn-left-bottom">
               <div class="sn-counter">
                 <span class="sn-counter-current" id="snCurrent">1</span>
                 <span>/</span>
                 <span class="sn-counter-total" id="snTotal">4</span>
               </div>
               <p class="sn-caption" id="snCaption">...</p>
             </div>
           </div>
           <div class="sn-right">
             <div class="sn-image-item" data-index="0" data-caption="...">...</div>
             <div class="sn-image-item" data-index="1" data-caption="...">...</div>
           </div>
         </div>
       </section>
     ========================================================= */

  /**
   * Initialises the sticky-left / scroll-right narrative section.
   * Uses GSAP ScrollTrigger to pin the left panel so it works
   * with Lenis smooth scroll. Each image item gets its own
   * ScrollTrigger that updates the caption, counter, and
   * progress bar on the left when the image enters the viewport.
   *
   * @param {object}  [opts={}]                                      - Configuration.
   * @param {string}  [opts.sectionSelector='#about']                - The outer <section> to pin within.
   * @param {string}  [opts.itemSelector='.sn-image-item']           - Scrollable image panel selector.
   * @param {string}  [opts.captionSelector='#snCaption']            - Caption <p> selector.
   * @param {string}  [opts.currentSelector='#snCurrent']            - Current-index element selector.
   * @param {string}  [opts.leftSelector='#snLeft']                  - Sticky left panel selector.
   * @returns {void}
   *
   * @example
   *   VoltaUI.initStickyNarrative();
   *   VoltaUI.initStickyNarrative({ sectionSelector: '#mySection' });
   */
  function initStickyNarrative(opts) {
    opts = opts || {};
    var sectionSel = opts.sectionSelector || '#about';
    var itemSel    = opts.itemSelector    || '.sn-image-item';
    var captionSel = opts.captionSelector || '#snCaption';
    var currentSel = opts.currentSelector || '#snCurrent';
    var leftSel    = opts.leftSelector    || '#snLeft';

    var sectionEl  = document.querySelector(sectionSel);
    var items      = document.querySelectorAll(itemSel);
    var captionEl  = document.querySelector(captionSel);
    var currentEl  = document.querySelector(currentSel);
    var leftEl     = document.querySelector(leftSel);
    var total      = items.length;

    if (!sectionEl || !items.length || !leftEl) return;

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('[VoltaUI] initStickyNarrative requires GSAP + ScrollTrigger');
      return;
    }

    /**
     * Fade caption out, swap text, fade back in.
     * @param {string} newText
     */
    function swapCaption(newText) {
      if (!captionEl || captionEl.textContent === newText) return;
      captionEl.classList.add('is-transitioning');
      setTimeout(function () {
        captionEl.textContent = newText;
        captionEl.classList.remove('is-transitioning');
      }, 450);
    }

    // 1. Pin the left panel for the full height of the section
    ScrollTrigger.create({
      trigger:    sectionEl,
      start:      'top top',
      end:        'bottom bottom',
      pin:        leftEl,
      pinSpacing: false,
    });

    // 2. Each image item updates the counter + caption when it enters the viewport
    items.forEach(function (item) {
      var idx     = parseInt(item.dataset.index || '0', 10);
      var caption = item.dataset.caption || '';

      ScrollTrigger.create({
        trigger:  item,
        start:    'top 60%',
        end:      'bottom 40%',
        onEnter:  function () { update(idx, caption, item); },
        onEnterBack: function () { update(idx, caption, item); },
      });
    });

    function update(idx, caption, activeItem) {
      if (currentEl) currentEl.textContent = idx + 1;
      swapCaption(caption);
      leftEl.style.setProperty('--sn-progress', ((idx + 1) / total * 100) + '%');
      items.forEach(function (el) { el.classList.remove('is-active'); });
      activeItem.classList.add('is-active');
    }
  }


  /* =========================================================
     4. 3D TILT IMAGE
     =========================================================
     Listens to mousemove over a stage element, calculates
     the pointer offset from centre, then applies rotateX /
     rotateY to the card via GSAP quickTo for silky 60 fps
     interpolation. Also shifts a glare overlay and a
     drop-shadow element in the opposite direction for depth.

     Requires GSAP. Works with or without Lenis.

     Required HTML structure:
       <div class="tilt3d-stage" id="tiltStage">
         <div class="tilt3d-card"  id="tiltCard">
           <img ... />
           <div class="tilt3d-glare" id="tiltGlare"></div>
         </div>
         <div class="tilt3d-shadow" id="tiltShadow"></div>
       </div>
     ========================================================= */

  /**
   * Adds a 3D mouse-parallax tilt effect to a card inside a perspective stage.
   * Uses GSAP quickTo for interpolated, lag-free rotation on every mousemove.
   *
   * @param {object}  [opts={}]                          - Configuration.
   * @param {string}  [opts.stageSelector='#tiltStage']  - Outer perspective container.
   * @param {string}  [opts.cardSelector='#tiltCard']    - Element to rotate.
   * @param {string}  [opts.glareSelector='#tiltGlare']  - Glare overlay element.
   * @param {string}  [opts.shadowSelector='#tiltShadow']- Drop-shadow element.
   * @param {number}  [opts.maxRotate=12]                - Max rotation degrees.
   * @param {number}  [opts.ease=0.1]                    - quickTo ease factor (0–1).
   * @returns {void}
   *
   * @example
   *   VoltaUI.initTilt3D();
   *   VoltaUI.initTilt3D({ maxRotate: 8, stageSelector: '#myStage' });
   */
  function initTilt3D(opts) {
    opts = opts || {};
    var stageSel  = opts.stageSelector  || '#tiltStage';
    var cardSel   = opts.cardSelector   || '#tiltCard';
    var glareSel  = opts.glareSelector  || '#tiltGlare';
    var shadowSel = opts.shadowSelector || '#tiltShadow';
    var maxRot    = opts.maxRotate !== undefined ? opts.maxRotate : 12;
    var ease      = opts.ease      !== undefined ? opts.ease      : 0.1;

    var stageEl  = document.querySelector(stageSel);
    var cardEl   = document.querySelector(cardSel);
    var glareEl  = document.querySelector(glareSel);
    var shadowEl = document.querySelector(shadowSel);

    if (!stageEl || !cardEl) return;

    if (typeof gsap === 'undefined') {
      console.warn('[VoltaUI] initTilt3D requires GSAP');
      return;
    }

    // quickTo gives silky interpolation without re-creating tweens
    var rotX = gsap.quickTo(cardEl, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    var rotY = gsap.quickTo(cardEl, 'rotationY', { duration: 0.6, ease: 'power3.out' });

    // Shadow moves slightly counter to card for depth
    var shadowX, shadowY;
    if (shadowEl) {
      shadowX = gsap.quickTo(shadowEl, 'x', { duration: 0.8, ease: 'power3.out' });
      shadowY = gsap.quickTo(shadowEl, 'y', { duration: 0.8, ease: 'power3.out' });
    }

    function onMouseMove(e) {
      var rect   = stageEl.getBoundingClientRect();
      // Normalise pointer to -0.5 … +0.5 relative to stage centre
      var nx = (e.clientX - rect.left)  / rect.width  - 0.5;
      var ny = (e.clientY - rect.top)   / rect.height - 0.5;

      rotX(-ny * maxRot);         // tilt up/down
      rotY( nx * maxRot);         // tilt left/right

      // Glare centre tracks pointer
      if (glareEl) {
        var px = ((nx + 0.5) * 100).toFixed(1) + '%';
        var py = ((ny + 0.5) * 100).toFixed(1) + '%';
        glareEl.style.backgroundImage =
          'radial-gradient(circle at ' + px + ' ' + py +
          ', rgba(201,169,110,0.18) 0%, transparent 60%)';
      }

      // Shadow drifts opposite to tilt
      if (shadowEl) {
        shadowX(-nx * 24);
        shadowY(-ny * 24);
      }
    }

    function onMouseLeave() {
      rotX(0);
      rotY(0);
      if (shadowEl) { shadowX(0); shadowY(0); }
      // Reset glare to centre
      if (glareEl) {
        glareEl.style.backgroundImage =
          'radial-gradient(circle at 50% 50%, rgba(201,169,110,0.08) 0%, transparent 60%)';
      }
    }

    stageEl.addEventListener('mousemove',  onMouseMove);
    stageEl.addEventListener('mouseleave', onMouseLeave);

    // Fade-in reveal when section scrolls into view
    if (typeof ScrollTrigger !== 'undefined') {
      gsap.fromTo(cardEl,
        { opacity: 0, y: 60, rotationX: 8 },
        {
          opacity: 1, y: 0, rotationX: 0,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: stageEl,
            start: 'top 75%',
          },
        }
      );
    }
  }


  /* =========================================================
     5. HORIZONTAL SCROLL (section pin + slide track)
     =========================================================
     Pins a section to the viewport and translates a flex row
     of slides horizontally as the user scrolls vertically.
     When the last slide is fully visible, vertical scrolling
     resumes normally.

     Required HTML structure:
       <div class="h-scroll-outer" id="mySection">
         <div class="h-scroll-pin-wrapper">
           <div class="h-scroll-track" id="myTrack">
             <div class="h-slide"> … </div>
             <div class="h-slide"> … </div>
           </div>
           <!-- optional progress dots -->
           <div class="h-progress" id="myProgress">
             <div class="h-dot active" data-index="0"></div>
             <div class="h-dot"        data-index="1"></div>
           </div>
         </div>
       </div>
     ========================================================= */

  /**
   * Configures a horizontally scrolling pinned section.
   *
   * @param {object}  cfg           - Configuration object.
   * @param {string}  cfg.outer     - CSS selector for the outermost wrapper element.
   * @param {string}  cfg.track     - CSS selector for the flex slide track element.
   * @param {string}  [cfg.progress]- CSS selector for the progress dots container (optional).
   * @param {number}  cfg.slides    - Total number of slides.
   * @param {number}  [cfg.scrub=1] - GSAP scrub value (1 = 1-second lag, true = instant).
   *
   * @returns {gsap.core.Timeline|null} The GSAP timeline, or null if elements missing.
   *
   * @example
   *   VoltaUI.setupHorizontalScroll({
   *     outer:    '#architecture',
   *     track:    '#hScrollTrack',
   *     progress: '#hProgress',
   *     slides:   4,
   *   });
   */
  function setupHorizontalScroll(cfg) {
    var outer    = cfg.outer;
    var track    = cfg.track;
    var progress = cfg.progress || null;
    var slides   = cfg.slides   || 4;
    var scrub    = cfg.scrub    !== undefined ? cfg.scrub : 1;

    var outerEl    = qs(outer);
    var trackEl    = qs(track);
    var progressEl = progress ? qs(progress) : null;

    if (!outerEl || !trackEl) {
      console.warn('[VoltaUI] setupHorizontalScroll: missing elements for', outer);
      return null;
    }

    // Distance to travel = total track width minus one viewport
    var totalWidth   = trackEl.scrollWidth - window.innerWidth;

    // How many pixels of vertical scroll each slide consumes
    var scrollHeight = window.innerHeight * (slides - 1);

    // Expand the outer wrapper so ScrollTrigger has room to scroll
    outerEl.style.height = (window.innerHeight + scrollHeight) + 'px';

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger:       outerEl,
        start:         'top top',
        end:           '+=' + scrollHeight,
        pin:           outer + ' .h-scroll-pin-wrapper',
        scrub:         scrub,
        anticipatePin: 1,

        /**
         * Updates the active progress dot as the user scrolls through slides.
         *
         * @param {ScrollTrigger} self - The ScrollTrigger instance.
         */
        onUpdate: function (self) {
          if (!progressEl) return;
          var activeIndex = Math.round(self.progress * (slides - 1));
          qsa('.h-dot', progressEl).forEach(function (dot, i) {
            dot.classList.toggle('active', i === activeIndex);
          });
        },
      },
    });

    // Translate the track from 0 to -totalWidth
    tl.to(trackEl, { x: -totalWidth, ease: 'none' });

    return tl;
  }


  /* =========================================================
     3. SCROLL-REVEAL (IntersectionObserver)
     =========================================================
     Watches elements with a given selector. When they enter
     the viewport, the `visibleClass` is added (default: 'visible').
     CSS handles the actual transition (see .reveal in main.css).
     ========================================================= */

  /**
   * Observes elements and adds a CSS class when they enter the viewport.
   * Falls back to immediately showing all elements in older browsers.
   *
   * @param {string} [selector='.reveal'] - CSS selector for elements to observe.
   * @param {object} [opts={}]            - Options.
   * @param {number} [opts.threshold=0.15]  - 0–1, fraction of element visible to trigger.
   * @param {string} [opts.visibleClass='visible'] - Class added when visible.
   *
   * @example
   *   // Default — targets all .reveal elements
   *   VoltaUI.initScrollReveal();
   *
   *   // Custom selector + threshold
   *   VoltaUI.initScrollReveal('.fade-in', { threshold: 0.3 });
   */
  function initScrollReveal(selector, opts) {
    // Simple fade-up effect for .reveal, .reveal-img, .reveal-title (no stagger/3D)
    selector = selector || '.reveal, .reveal-img, .reveal-title';
    opts = opts || {};
    var threshold = opts.threshold !== undefined ? opts.threshold : 0.15;
    var elements = qsa(selector);

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      // Fallback: just show all
      elements.forEach(function (el) { el.style.opacity = 1; });
      return;
    }

    elements.forEach(function (el) {
      var animProps = { opacity: 0, y: 24 };
      var animTo = { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' };

      if (el.classList.contains('reveal-img')) {
        animProps = { opacity: 0, scale: 0.98, y: 20 };
        animTo = { opacity: 1, scale: 1, y: 0, duration: 0.65, ease: 'power2.out' };
      }

      ScrollTrigger.create({
        trigger: el,
        start: 'top 95%',
        once: true,
        onEnter: function() {
          gsap.fromTo(el, animProps, animTo);
        }
      });
    });
  }


  /* =========================================================
     4. NAVBAR SCROLL STATE
     =========================================================
     Listens to the window scroll event and adds a `.scrolled`
     class to the navbar element once the user scrolls past a
     threshold. CSS handles the visual change (padding, bg).
     ========================================================= */

  /**
   * Toggles a CSS class on the navbar when the page scrolls past a threshold.
   *
   * @param {string} [navbarId='navbar']   - ID of the navbar element.
   * @param {number} [threshold=80]        - Scroll distance (px) before class is added.
   * @param {string} [activeClass='scrolled'] - Class to toggle.
   *
   * @example
   *   VoltaUI.initNavbarScroll('mainNav', 60);
   */
  function initNavbarScroll(navbarId, threshold, activeClass) {
    navbarId    = navbarId    || 'navbar';
    threshold   = threshold   !== undefined ? threshold  : 80;
    activeClass = activeClass || 'scrolled';

    var navbar = document.getElementById(navbarId);
    if (!navbar) return;

    window.addEventListener('scroll', function () {
      navbar.classList.toggle(activeClass, window.scrollY > threshold);
    }, { passive: true });
  }


  /* =========================================================
     5. CUSTOM CURSOR
     =========================================================
     Replaces the native browser cursor with two elements:
       - A small dot that follows the mouse instantly.
       - A larger ring that lags behind (lerp / ease-to).
     Both elements must already exist in the DOM.
     ========================================================= */

  /**
   * Initialises the two-part custom cursor.
   *
   * @param {object} [cfg={}]                      - Configuration.
   * @param {string} [cfg.cursorId='cursor']        - ID of the dot element.
   * @param {string} [cfg.followerId='cursorFollower'] - ID of the ring element.
   * @param {number} [cfg.lerpFactor=0.12]          - Lerp speed for the follower (0–1).
   * @param {string} [cfg.hoverSelector='a, button, .h-dot'] - Elements that trigger hover state.
   * @param {object} [cfg.hoverStyles]              - Inline style overrides on hover.
   *
   * @example
   *   VoltaUI.initCustomCursor();
   *
   *   // Custom lerp speed and interactive elements
   *   VoltaUI.initCustomCursor({ lerpFactor: 0.08, hoverSelector: 'a, button, [data-cursor]' });
   */
  function initCustomCursor(cfg) {
    cfg = cfg || {};
    var cursorId       = cfg.cursorId       || 'cursor';
    var followerId     = cfg.followerId     || 'cursorFollower';
    var lerpFactor     = cfg.lerpFactor     !== undefined ? cfg.lerpFactor : 0.12;
    var hoverSelector  = cfg.hoverSelector  || 'a, button, .h-dot';

    var cursor   = document.getElementById(cursorId);
    var follower = document.getElementById(followerId);

    if (!cursor || !follower) {
      console.warn('[VoltaUI] initCustomCursor: cursor elements not found');
      return;
    }

    var mx = 0, my = 0; // mouse position
    var fx = 0, fy = 0; // follower position (lerped)

    // Track raw mouse position and snap the dot immediately
    document.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      cursor.style.left = mx + 'px';
      cursor.style.top  = my + 'px';
    });

    /**
     * RAF loop: smoothly interpolates the follower ring toward the cursor dot.
     * Uses linear interpolation (lerp): position += (target - position) * factor
     */
    function lerpFollower() {
      fx += (mx - fx) * lerpFactor;
      fy += (my - fy) * lerpFactor;
      follower.style.left = fx + 'px';
      follower.style.top  = fy + 'px';
      requestAnimationFrame(lerpFollower);
    }
    lerpFollower();

    // Expand the ring when hovering interactive elements
    qsa(hoverSelector).forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        cursor.style.transform   = 'translate(-50%, -50%) scale(2)';
        follower.style.width     = '60px';
        follower.style.height    = '60px';
        follower.style.borderColor = 'rgba(201,169,110,0.8)';
      });
      el.addEventListener('mouseleave', function () {
        cursor.style.transform   = 'translate(-50%, -50%) scale(1)';
        follower.style.width     = '36px';
        follower.style.height    = '36px';
        follower.style.borderColor = 'rgba(201,169,110,0.5)';
      });
    });
  }


  /* =========================================================
     6. HERO IMAGE PARALLAX
     =========================================================
     Offsets the hero image vertically as the section scrolls
     out of view, creating a multi-layer depth effect.
     ========================================================= */

  /**
   * Applies a scroll-driven vertical parallax to an image element.
   * Requires GSAP + ScrollTrigger (call initGSAP first).
   *
   * @param {object} cfg                     - Configuration.
   * @param {string} cfg.trigger             - CSS selector for the scroll trigger container.
   * @param {string} cfg.image               - ID or CSS selector of the image to move.
   * @param {number} [cfg.offset=80]         - Max Y displacement in pixels.
   * @param {string} [cfg.start='top top']   - ScrollTrigger start marker.
   * @param {string} [cfg.end='bottom top']  - ScrollTrigger end marker.
   *
   * @example
   *   VoltaUI.initParallax({ trigger: '#hero', image: '#heroImg', offset: 100 });
   */
  function initParallax(cfg) {
    if (!cfg || !cfg.trigger || !cfg.image) return;

    var imageEl = typeof cfg.image === 'string'
      ? (cfg.image.startsWith('#') ? document.getElementById(cfg.image.slice(1)) : qs(cfg.image))
      : cfg.image;

    if (!imageEl) return;

    var offset = cfg.offset !== undefined ? cfg.offset : 80;

    ScrollTrigger.create({
      trigger: cfg.trigger,
      start:   cfg.start || 'top top',
      end:     cfg.end   || 'bottom top',
      onUpdate: function (self) {
        gsap.set(imageEl, { y: self.progress * offset });
      },
    });
  }


  /* =========================================================
     7. SMOOTH ANCHOR SCROLL
     =========================================================
     Intercepts clicks on internal anchor links (<a href="#id">)
     and scrolls to the target section smoothly.
     Compatible with GSAP-pinned sections because it reads the
     element's current bounding rect at click time.
     ========================================================= */

  /**
   * Attaches smooth-scroll behaviour to all anchor links matching a selector.
   *
   * @param {string} [selector='a[href^="#"]'] - CSS selector for anchor links.
   *
   * @example
   *   VoltaUI.initAnchorScroll();                    // default
   *   VoltaUI.initAnchorScroll('.nav a[href^="#"]'); // scoped to nav only
   */
  function initAnchorScroll(selector) {
    selector = selector || 'a[href^="#"]';

    qsa(selector).forEach(function (link) {
      link.addEventListener('click', function (e) {
        var targetId = link.getAttribute('href').slice(1);
        if (!targetId) return;
        var target = document.getElementById(targetId);
        if (!target) return;

        e.preventDefault();

        var rect      = target.getBoundingClientRect();
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        window.scrollTo({
          top:      scrollTop + rect.top,
          behavior: 'smooth',
        });
      });
    });
  }


  /* =========================================================
     8. HERO ENTRY ANIMATION
     =========================================================
     Runs a sequence of GSAP fromTo tweens on page load to
     reveal the hero content with staggered timing.
     All selectors are configurable so this works with any markup.
     ========================================================= */

  /**
   * Plays GSAP entry animations for the hero section on load.
   * Requires GSAP (call initGSAP first).
   *
   * @param {object} [cfg={}]                        - Configuration.
   * @param {string} [cfg.label='#hero .section-label'] - Selector for the label above the heading.
   * @param {string} [cfg.heading='#hero h1']           - Selector for the main heading.
   * @param {string} [cfg.divider='#hero .divider']     - Selector for the decorative divider.
   * @param {string} [cfg.subtitle='#hero .section-subtitle'] - Selector for subtitle copy.
   * @param {string} [cfg.cta='#hero .btn-gold, #hero a:last-of-type'] - Selector for CTA elements.
   * @param {string} [cfg.image='#heroImg']             - Selector for the hero image.
   *
   * @example
   *   VoltaUI.initHeroAnimation();
   *
   *   // Customise selectors for different markup
   *   VoltaUI.initHeroAnimation({
   *     heading:  '.hero__title',
   *     subtitle: '.hero__copy',
   *     cta:      '.hero__cta',
   *   });
   */
  function initHeroAnimation(cfg) {
    cfg = cfg || {};
    var label    = cfg.label    || '#hero .section-label';
    var heading  = cfg.heading  || '#hero h1';
    var divider  = cfg.divider  || '#hero .divider';
    var subtitle = cfg.subtitle || '#hero .section-subtitle';
    var cta      = cfg.cta      || '#hero .btn-gold, #hero a:last-of-type';
    var image    = cfg.image    || '#heroImg';

    // Label fades in first
    gsap.fromTo(label,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.1 }
    );

    // Heading rises up with slight delay
    gsap.fromTo(heading,
      { opacity: 0, y: 60 },
      { opacity: 1, y: 0, duration: 1.4, ease: 'power3.out', delay: 0.3 }
    );

    // Divider scales in from the left
    gsap.fromTo(divider,
      { scaleX: 0 },
      { scaleX: 1, duration: 1, ease: 'power3.out', delay: 0.8, transformOrigin: 'left' }
    );

    // Subtitle appears after heading
    gsap.fromTo(subtitle,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 1.0 }
    );

    // CTAs stagger in last
    gsap.fromTo(cta,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 1.2, stagger: 0.15 }
    );

    // Hero image subtle Ken Burns zoom-out
    if (image) {
      gsap.fromTo(image,
        { scale: 1.08 },
        { scale: 1.02, duration: 6, ease: 'power1.out' }
      );
    }
  }


  /* =========================================================
     9. CONTACT FORM SUBMIT
     =========================================================
     Lightweight submit handler that provides visual feedback
     without a real back-end. Swap the callback for an actual
     fetch/XHR call when integrating with a server.
     ========================================================= */

  /**
   * Attaches a submit handler to a contact form.
   * On submit: shows a success state on the button, then resets
   * the form and button after a delay.
   *
   * @param {string} [selector='form'] - CSS selector for the form element.
   * @param {object} [opts={}]         - Options.
   * @param {number} [opts.resetDelay=3000]       - ms before form resets after success.
   * @param {string} [opts.successText='Message Sent ✓'] - Button text on success.
   * @param {string} [opts.resetText='<span>Send Message</span><span class="arrow">→</span>'] - Button HTML after reset.
   * @param {Function} [opts.onSubmit]            - Optional async callback(formData) for real API calls.
   *
   * @example
   *   // Simple client-side feedback only
   *   VoltaUI.initFormSubmit('form');
   *
   *   // With a real API call
   *   VoltaUI.initFormSubmit('form', {
   *     onSubmit: async (data) => {
   *       await fetch('/api/contact', { method: 'POST', body: data });
   *     }
   *   });
   */
  function initFormSubmit(selector, opts) {
    selector = selector || 'form';
    opts     = opts     || {};

    var resetDelay  = opts.resetDelay  !== undefined ? opts.resetDelay  : 3000;
    var successText = opts.successText || 'Message Sent ✓';
    var resetText   = opts.resetText   || '<span>Send Message</span><span class="arrow">→</span>';
    var onSubmit    = opts.onSubmit    || null;

    var form = qs(selector);
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var btn    = form.querySelector('button[type="submit"]');
      var data   = new FormData(form);

      /**
       * Applies success visual state to the submit button.
       */
      function showSuccess() {
        if (btn) {
          btn.innerHTML         = '<span>' + successText + '</span>';
          btn.style.background  = '#C9A96E';
          btn.style.color       = '#0A0A0A';
        }
        setTimeout(function () {
          if (btn) {
            btn.innerHTML        = resetText;
            btn.style.background = '';
            btn.style.color      = '';
          }
          form.reset();
        }, resetDelay);
      }

      if (typeof onSubmit === 'function') {
        // If caller provides an async handler, show success when it resolves
        Promise.resolve(onSubmit(data)).then(showSuccess).catch(function (err) {
          console.error('[VoltaUI] Form submit error:', err);
        });
      } else {
        showSuccess();
      }
    });

    // Also expose as global for inline onsubmit= usage
    global.handleFormSubmit = function (e) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    };
  }


  /* =========================================================
     10. RESIZE REFRESH
     =========================================================
     ScrollTrigger caches element positions. After a window
     resize the cache must be invalidated. This function adds a
     debounced resize listener that also recalculates the height
     of each horizontal scroll outer wrapper.
     ========================================================= */

  /**
   * Debounces window resize events and refreshes all ScrollTrigger instances.
   * Also recalculates the `height` of each horizontal scroll outer wrapper.
   *
   * @param {string[]} [horizontalSections=['#architecture','#amenities']]
   *   Array of CSS selectors for .h-scroll-outer elements.
   * @param {number}   [debounceMs=200] - Debounce delay in milliseconds.
   *
   * @example
   *   VoltaUI.initResizeRefresh(['#architecture', '#amenities']);
   */
  /* =========================================================
     10. SCROLL GALLERY
     =========================================================
     Pins the `.sg-viewport` element for ~250vh of scroll
     travel.  During the scrub:
       - 4 corner cells scatter outward and fade out.
       - The centre cell scales + translates to fill the
         entire viewport.
       - An overlay block fades in once zoom is complete.
     ========================================================= */

  /**
   * Measuna-style scroll-gallery: collage zoom on scroll.
   *
   * @param {object} [opts]
   * @param {string} [opts.section='#sgallery']      - Outer section (sets scroll trigger).
   * @param {string} [opts.viewport='#sgViewport']   - Inner element that GSAP pins.
   * @param {string} [opts.center='#sgCenter']       - Centre image cell.
   * @param {string} [opts.header='#sgHeader']       - Header text faded out on scroll.
   * @param {string} [opts.overlay='#sgOverlayText'] - Overlay text revealed at zoom end.
   * @param {number} [opts.scrub=1.5]                - ScrollTrigger scrub value.
   */
  function initScrollGallery(opts) {
    opts = opts || {};
    var sectionSel  = opts.section  || '#sgallery';
    var viewportSel = opts.viewport || '#sgViewport';
    var centerSel   = opts.center   || '#sgCenter';
    var headerSel   = opts.header   || '#sgHeader';
    var overlaySel  = opts.overlay  || '#sgOverlayText';
    var scrub       = opts.scrub    !== undefined ? opts.scrub : 1.5;

    var sectionEl  = qs(sectionSel);
    var viewportEl = qs(viewportSel);
    var centerEl   = qs(centerSel);
    var headerEl   = qs(headerSel);
    var overlayEl  = qs(overlaySel);

    if (!sectionEl || !centerEl || !viewportEl) return;

    /**
     * Measure how far the centre cell must scale + translate
     * to fill the entire viewport.
     *
     * Uses offsetLeft/offsetTop (relative to the pinned container)
     * instead of getBoundingClientRect() — the section is off-screen
     * at init time so getBoundingClientRect gives a huge r.top which
     * makes dy massively negative (image flies upward).
     *
     * @returns {{ scale: number, dx: number, dy: number }}
     */
    function getTransform() {
      var vw    = viewportEl.offsetWidth  || window.innerWidth;
      var vh    = viewportEl.offsetHeight || window.innerHeight;
      var cl    = centerEl.offsetLeft;
      var ct    = centerEl.offsetTop;
      var cw    = centerEl.offsetWidth;
      var ch    = centerEl.offsetHeight;
      var scale = Math.max(vw / cw, vh / ch) * 1.02;
      // Align the centre of the cell with the centre of the viewport.
      var dx    = (vw / 2) - (cl + cw / 2);
      var dy    = (vh / 2) - (ct + ch / 2);
      return { scale: scale, dx: dx, dy: dy };
    }

    // Corner definitions:  each has an element + percentage
    // offsets defining the direction it scatters towards.
    var cornerDefs = [
      { sel: '.sg-tl', x: -110, y: -110 },
      { sel: '.sg-tr', x:  110, y: -110 },
      { sel: '.sg-bl', x: -110, y:  110 },
      { sel: '.sg-br', x:  110, y:  110 },
    ].map(function (def) {
      return { el: qs(def.sel, sectionEl), x: def.x, y: def.y };
    }).filter(function (def) { return !!def.el; });

    var t  = getTransform();
    var tl = gsap.timeline({ defaults: { ease: 'none' } });

    // 0 → 0.35 — Header fades up and out.
    if (headerEl) {
      tl.to(headerEl, { opacity: 0, y: -24, ease: 'power2.in', duration: 0.35 }, 0);
    }

    // 0 → 0.55 — Corner cells scatter outward and fade.
    cornerDefs.forEach(function (def) {
      tl.to(def.el, {
        xPercent: def.x,
        yPercent: def.y,
        opacity:  0,
        ease:     'power2.inOut',
        duration: 0.55,
      }, 0);
    });

    // 0.08 → 0.75 — Centre cell zooms to fullscreen.
    tl.to(centerEl, {
      scale:    t.scale,
      x:        t.dx,
      y:        t.dy,
      ease:     'power2.inOut',
      duration: 0.67,
    }, 0.08);

    // 0.72 → 1.0 — Overlay text revealed.
    if (overlayEl) {
      tl.to(overlayEl, {
        opacity:       1,
        y:             0,
        ease:          'power2.out',
        duration:      0.28,
        pointerEvents: 'auto',
      }, 0.72);
    }

    // Pin the viewport element at the top of the viewport
    // for the full scroll travel, scrubbing the timeline.
    ScrollTrigger.create({
      trigger:   sectionEl,
      start:     'top top',
      end:       '+=250%',
      pin:       viewportEl,
      scrub:     scrub,
      animation: tl,
    });

    // Re-compute the zoom maths after a resize so scale/dx/dy stay accurate.
    // Invalidating the tween vars and refreshing is the safest approach.
    ScrollTrigger.addEventListener('refreshInit', function () {
      var fresh = getTransform();
      gsap.getTweensOf(centerEl).forEach(function (tw) {
        if (tw.vars.scale !== undefined) {
          tw.vars.scale = fresh.scale;
          tw.vars.x     = fresh.dx;
          tw.vars.y     = fresh.dy;
          tw.invalidate();
        }
      });
      tl.invalidate();
    });
  }


  function initResizeRefresh(horizontalSections, debounceMs) {
    horizontalSections = horizontalSections || ['#architecture', '#amenities'];
    debounceMs         = debounceMs         !== undefined ? debounceMs : 200;

    var timer;

    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        ScrollTrigger.refresh();

        // Re-apply outer heights (slides × 100vh)
        horizontalSections.forEach(function (sel) {
          var el = qs(sel);
          if (el) {
            // Each section uses 4 slides → 4 × 100vh outer height
            var slideCount = el.querySelectorAll('.h-slide').length || 4;
            el.style.height = (window.innerHeight * slideCount) + 'px';
          }
        });
      }, debounceMs);
    });
  }


  /* =========================================================
     11. CONVENIENCE INIT
     =========================================================
     Runs all modules with sensible defaults.
     Pass a config object to override specific settings.
     ========================================================= */

  /**
   * Master initialiser — boots all UI modules for a standard
   * luxury-scroll page layout.
   *
   * @param {object} [cfg={}] - Optional top-level config overrides.
   * @param {object} [cfg.horizontalSections]   - Array of { outer, track, progress, slides } configs.
   * @param {object} [cfg.scrollReveal]         - Options for initScrollReveal.
   * @param {object} [cfg.navbar]               - { id, threshold, activeClass } for initNavbarScroll.
   * @param {object} [cfg.cursor]               - Options for initCustomCursor.
   * @param {object} [cfg.parallax]             - Options for initParallax.
   * @param {object} [cfg.heroAnimation]        - Options for initHeroAnimation.
   * @param {string} [cfg.anchorSelector]       - Selector for initAnchorScroll.
   * @param {object} [cfg.formSubmit]           - { selector, opts } for initFormSubmit.
   * @param {object} [cfg.resize]               - { sections, debounceMs } for initResizeRefresh.
   *
   * @example
   *   // Simplest usage — everything uses defaults
   *   VoltaUI.init();
   *
   *   // With custom overrides
   *   VoltaUI.init({
   *     navbar: { id: 'site-header', threshold: 50 },
   *     formSubmit: { selector: '#contactForm' },
   *   });
   */
  function init(cfg) {
    cfg = cfg || {};

    // 1. Bootstrap GSAP
    initGSAP();

    // 1b. Lenis smooth scroll (synced with GSAP ScrollTrigger)
    if (cfg.lenis !== false) {
      initLenis(cfg.lenis);
    }

    // 1c. Sticky narrative section (VOLTA SKAI)
    if (cfg.stickyNarrative !== false) {
      initStickyNarrative(cfg.stickyNarrative);
    }

    // 1d. 3D tilt image section
    if (cfg.tilt3d !== false) {
      initTilt3D(cfg.tilt3d);
    }

    // 1e. Scroll gallery collage zoom
    if (cfg.scrollGallery !== false) {
      initScrollGallery(cfg.scrollGallery);
    }

    // 2. Horizontal scroll sections
    var hSections = cfg.horizontalSections || [
      { outer: '#architecture', track: '#hScrollTrack',  progress: '#hProgress',  slides: 4 },
      { outer: '#amenities',    track: '#hScrollTrack2', progress: '#hProgress2', slides: 4 },
    ];
    hSections.forEach(function (s) { setupHorizontalScroll(s); });

    // 3. Scroll-reveal elements
    initScrollReveal('.reveal', cfg.scrollReveal);

    // 4. Navbar scroll state
    var nav = cfg.navbar || {};
    initNavbarScroll(nav.id, nav.threshold, nav.activeClass);

    // 5. Custom cursor
    initCustomCursor(cfg.cursor);

    // 6. Hero parallax
    var parallaxCfg = cfg.parallax || { trigger: '#hero', image: '#heroImg', offset: 80 };
    initParallax(parallaxCfg);

    // 7. Smooth anchor clicks
    initAnchorScroll(cfg.anchorSelector);

    // 8. Hero entry animation
    initHeroAnimation(cfg.heroAnimation);

    // 9. Contact form
    var form = cfg.formSubmit || {};
    initFormSubmit(form.selector, form.opts);

    // 10. Resize refresh
    var resize = cfg.resize || {};
    initResizeRefresh(resize.sections, resize.debounceMs);
  }


  /* =========================================================
     PUBLIC NAMESPACE EXPORT
     =========================================================
     All functions are available on `window.VoltaUI`.
     If you use a bundler (Webpack, Vite, Rollup) you can
     replace this block with ES module exports instead:

       export { initGSAP, setupHorizontalScroll, ... };
     ========================================================= */
  global.VoltaUI = {
    initGSAP:               initGSAP,
    initLenis:              initLenis,
    initStickyNarrative:    initStickyNarrative,
    initTilt3D:             initTilt3D,
    setupHorizontalScroll:  setupHorizontalScroll,
    initScrollReveal:       initScrollReveal,
    initNavbarScroll:       initNavbarScroll,
    initCustomCursor:       initCustomCursor,
    initParallax:           initParallax,
    initAnchorScroll:       initAnchorScroll,
    initHeroAnimation:      initHeroAnimation,
    initFormSubmit:         initFormSubmit,
    initScrollGallery:      initScrollGallery,
    initResizeRefresh:      initResizeRefresh,
    init:                   init,
  };

}(window));


/* =========================================================
   AUTO-INIT
   =========================================================
   Calls VoltaUI.init() once the DOM is ready.
   Remove or comment out this block if you want to call
   init() manually with custom config from another script.
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {
  VoltaUI.init();
});
