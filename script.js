// ---------------------------------------------------------------------------
// Splash — the very first thing that runs, before anything else, so the real
// hero animation gets moved into the splash before the browser paints it in
// the wrong place. It borrows the actual .hero-anim element for its one-time
// play (no duplicate animation markup), then hands the same, already-settled
// element back to the hero once the visitor clicks through — so the main
// hero never has to replay anything, it just already looks the way it will.
// Always shows — every load, every refresh — it's the fixed entry point.
// ---------------------------------------------------------------------------
(function initSplash() {
  const splash = document.getElementById('splash');
  const splashContent = document.getElementById('splashContent');
  const splashEnter = document.getElementById('splashEnter');
  const heroAnimEl = document.querySelector('.hero-anim');
  const heroEl = document.querySelector('.hero');
  if (!splash || !splashContent || !splashEnter || !heroAnimEl || !heroEl) return;

  document.documentElement.classList.add('splash-active');
  splash.insertBefore(heroAnimEl, splashContent);

  // Button + microcopy are visible right away — no need to wait for the
  // animation to finish before someone can enter. The rAF just gives the
  // opening fade-in something to transition from.
  requestAnimationFrame(() => splashContent.classList.add('is-ready'));

  splashEnter.addEventListener('click', () => {
    splash.classList.add('is-leaving');
    heroEl.insertBefore(heroAnimEl, heroEl.firstChild);
    document.documentElement.classList.remove('splash-active');
    document.dispatchEvent(new CustomEvent('hero:enter'));
    setTimeout(() => splash.remove(), 900);
  });
})();

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
if (navToggle) {
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Member bio modal
const bioModal = document.getElementById('bioModal');
const bioModalPhoto = document.getElementById('bioModalPhoto');
const bioModalName = document.getElementById('bioModalName');
const bioModalRole = document.getElementById('bioModalRole');
const bioModalBody = document.getElementById('bioModalBody');
const bioModalClose = bioModal ? bioModal.querySelector('.bio-modal-close') : null;
let lastFocusedTrigger = null;

function openBioModal(card, trigger) {
  const img = card.querySelector('.member-photo img');
  const fullPhotoSrc = card.dataset.fullPhoto; // optional second photo for the modal, set via data-full-photo
  const photoSrc = fullPhotoSrc || (img ? img.getAttribute('src') : null);
  const photoAlt = img ? (img.getAttribute('alt') || '') : '';
  bioModalPhoto.innerHTML = photoSrc
    ? `<img src="${photoSrc}" alt="${photoAlt}">`
    : '';
  bioModalName.textContent = card.querySelector('.member-name').textContent;
  bioModalRole.textContent = card.querySelector('.member-role').textContent;
  bioModalBody.innerHTML = card.querySelector('.member-full').innerHTML;
  lastFocusedTrigger = trigger;
  bioModal.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (bioModalClose) bioModalClose.focus();
}

function closeBioModal() {
  bioModal.classList.remove('open');
  document.body.style.overflow = '';
  if (lastFocusedTrigger) lastFocusedTrigger.focus();
}

document.querySelectorAll('.member-toggle').forEach(btn => {
  btn.addEventListener('click', () => openBioModal(btn.closest('.member'), btn));
});

if (bioModal) {
  // Close on backdrop click (not when clicking inside the panel)
  bioModal.addEventListener('click', (e) => {
    if (e.target === bioModal) closeBioModal();
  });
  if (bioModalClose) bioModalClose.addEventListener('click', closeBioModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bioModal.classList.contains('open')) closeBioModal();
  });
}

// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealEls.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in-view'));
}

// Contact form — draft mode: no live endpoint connected yet
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const note = contactForm.querySelector('.form-note');
    if (note) {
      note.textContent = 'This is a draft — the form isn\'t connected to an inbox yet, so nothing was sent. Wire up a form-handling endpoint before this goes live.';
      note.style.borderColor = 'var(--gold)';
    }
  });
}

// ---------------------------------------------------------------------------
// Past members — photo, name, and role only, no bio. Unlike the photo/video
// folders above, this one's hand-edited: past members change rarely, so
// there's no need for a folder-scanning build step. Add a photo to
// assets/past-members/, then add one line below for them.
// ---------------------------------------------------------------------------
const PAST_MEMBERS = [
  { name: 'Abhinav', role: 'Keyboard &middot; Vocals', photo: 'assets/past-members/abhinav.jpg' },
  { name: 'Kaivalya', role: 'Keyboard', photo: 'assets/past-members/kaivalya.jpg' },
  { name: 'Shreejit', role: 'Bass guitar', photo: 'assets/past-members/shreejit.jpg' },
  { name: 'Rachit', role: 'Percussion', photo: 'assets/past-members/rachit.jpg' },
  { name: 'Subhankar', role: 'Vocals', photo: 'assets/past-members/subhankar.jpg' },
];

(function pastMembers() {
  const section = document.getElementById('past-members');
  if (!section || !PAST_MEMBERS.length) return;
  const placeholder = section.querySelector('.placeholder-panel');
  const grid = section.querySelector('.past-members-grid');
  if (!grid) return;

  grid.innerHTML = PAST_MEMBERS.map((m) => `
    <div class="past-member">
      <div class="past-member-photo"><img src="${m.photo}" alt="${m.name}" loading="lazy"></div>
      <div class="past-member-name">${m.name}</div>
      <div class="past-member-role">${m.role}</div>
    </div>
  `).join('');
  grid.hidden = false;
  if (placeholder) placeholder.hidden = true;
})();

// ---------------------------------------------------------------------------
// Shared helper: fetch a build-generated manifest.json listing whatever
// photos/videos are sitting in a given assets/ folder. These files are
// written automatically by scripts/generate-manifests.js on every deploy —
// nobody ever edits filenames by hand.
// ---------------------------------------------------------------------------
async function loadManifest(folder) {
  try {
    const res = await fetch(`assets/${folder}/manifest.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Hero background: lightning + logo reveal, then a photo gallery, on a loop.
//
// Photos come from assets/hero-gallery/ automatically — drop image files in
// there and push. No filenames to type in here.
// ---------------------------------------------------------------------------
(function heroAnim() {
  const heroAnimEl = document.querySelector('.hero-anim');
  const galleryEl = document.querySelector('.hero-gallery');
  let revealEl = document.querySelector('.hero-reveal');
  if (!heroAnimEl || !galleryEl || !revealEl) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // True only while the splash is actively showing this animation for the
  // first time — see initSplash, which sets this class for exactly that case.
  const splashGating = document.documentElement.classList.contains('splash-active');

  loadManifest('hero-gallery').then((entries) => {
    galleryEl.innerHTML = entries.map((entry) =>
      `<div class="hero-gallery-slide" style="background-image:url('assets/hero-gallery/${encodeURIComponent(entry.file)}')"></div>`
    ).join('');
    const slides = Array.from(galleryEl.querySelectorAll('.hero-gallery-slide'));

    if (reduceMotion) {
      // Skip the animated reveal entirely; show one static photo if we have any,
      // otherwise leave the resting logo cube visible (handled by CSS already).
      if (slides.length) {
        revealEl.style.display = 'none';
        galleryEl.classList.add('is-visible');
        slides[0].classList.add('is-visible');
      }
      return;
    }

    const FADE_MS = 900;
    const HOLD_MS = 5000;

    function playGallery() {
      if (!slides.length) return;
      galleryEl.classList.add('is-visible');
      let i = 0;
      (function step() {
        slides[i].classList.add('is-visible');
        setTimeout(() => {
          slides[i].classList.remove('is-visible');
          i++;
          if (i < slides.length) {
            step();
          } else {
            setTimeout(finishGallery, FADE_MS);
          }
        }, HOLD_MS);
      })();
    }

    function finishGallery() {
      galleryEl.classList.remove('is-visible');
      setTimeout(replayReveal, FADE_MS);
    }

    // Fades the settled reveal out and, if there are hero-gallery photos,
    // starts the crossfade loop. Only ever called once for the very first
    // reveal (either immediately, if there's no splash to wait for, or via
    // the 'hero:enter' signal once the visitor actually enters the site) —
    // and unconditionally for every later cycle of the ongoing loop.
    function settleAndAdvance() {
      revealEl.classList.add('is-hidden');
      if (slides.length) setTimeout(playGallery, FADE_MS);
    }

    function replayReveal() {
      const fresh = revealEl.cloneNode(true);
      fresh.classList.remove('is-hidden');
      revealEl.parentNode.replaceChild(fresh, revealEl);
      revealEl = fresh;
      watchReveal(false);
    }

    function watchReveal(isFirstTime) {
      const cubeDrop = revealEl.querySelector('.hero-cube-drop');
      if (!cubeDrop) return;
      cubeDrop.addEventListener('animationend', function onEnd(e) {
        if (e.animationName !== 'heroCubeZoom') return;
        cubeDrop.removeEventListener('animationend', onEnd);
        if (isFirstTime) {
          document.dispatchEvent(new CustomEvent('hero:revealed'));
          if (splashGating) return; // hold on the settled cube — the splash is still up
        }
        settleAndAdvance();
      });
    }

    if (splashGating) {
      document.addEventListener('hero:enter', settleAndAdvance, { once: true });
    }

    watchReveal(true);
  });
})();

// ---------------------------------------------------------------------------
// Gallery & Live sections: photo/video grids, populated the same way as the
// hero background — drop files into assets/gallery/ or assets/live/ and
// push. Each section quietly stays on its "coming soon" panel until at
// least one file shows up in its folder.
// ---------------------------------------------------------------------------
(function mediaGalleries() {
  const lightbox = document.getElementById('mediaLightbox');
  const lightboxStage = document.getElementById('mediaLightboxStage');
  const lightboxClose = lightbox ? lightbox.querySelector('.media-lightbox-close') : null;
  const lightboxPrev = lightbox ? lightbox.querySelector('.media-lightbox-nav.prev') : null;
  const lightboxNext = lightbox ? lightbox.querySelector('.media-lightbox-nav.next') : null;

  const viewallModal = document.getElementById('viewallModal');
  const viewallTitle = document.getElementById('viewallTitle');
  const viewallGrid = document.getElementById('viewallGrid');
  const viewallClose = viewallModal ? viewallModal.querySelector('.viewall-close') : null;

  let activeEntries = [];
  let activeFolder = '';
  let activeIndex = 0;
  let lastFocusedTile = null;
  let onLightboxCloseCallback = null; // resumes the right marquee / reopens "view all" on close
  let activeViewAllCloseFn = null;    // whichever section's "view all" is currently open, if any

  function tileHTML(entry, folder, index) {
    const src = `assets/${folder}/${encodeURIComponent(entry.file)}`;
    if (entry.type === 'video') {
      const thumb = entry.poster
        ? `<img src="assets/${folder}/${encodeURIComponent(entry.poster)}" loading="lazy" alt="">`
        : `<div class="tile-video-placeholder" data-lazy-video="${src}" aria-hidden="true"></div>`;
      return `<button class="tile tile-video" type="button" data-index="${index}" aria-label="Open video">
        ${thumb}
        <span class="play-badge" aria-hidden="true">&#9654;</span>
      </button>`;
    }
    return `<button class="tile" type="button" data-index="${index}" aria-label="Open photo">
      <img src="${src}" loading="lazy" alt="">
    </button>`;
  }

  // For videos with no poster yet: rather than loading every one of them at
  // once (which is what caused the slow/glitchy grid), each one only turns
  // into a real, playable-preview <video> once it's about to actually be
  // seen — scrolled into the visible area of whichever container it's in.
  function observeLazyVideos(container, rootEl) {
    const placeholders = container.querySelectorAll('[data-lazy-video]');
    if (!placeholders.length) return;
    const observer = new IntersectionObserver((observed) => {
      observed.forEach((item) => {
        if (!item.isIntersecting) return;
        const el = item.target;
        const video = document.createElement('video');
        video.src = el.dataset.lazyVideo;
        video.muted = true;
        video.preload = 'metadata';
        video.playsInline = true;
        el.replaceWith(video);
        observer.unobserve(el);
      });
    }, { root: rootEl || null, rootMargin: '0px' });
    placeholders.forEach((el) => observer.observe(el));
  }

  function renderLightboxStage() {
    if (!lightboxStage) return;
    const entry = activeEntries[activeIndex];
    if (!entry) return;
    const src = `assets/${activeFolder}/${encodeURIComponent(entry.file)}`;
    lightboxStage.innerHTML = entry.type === 'video'
      ? `<video src="${src}" controls autoplay playsinline></video>`
      : `<img src="${src}" alt="">`;
    const showNav = activeEntries.length > 1;
    if (lightboxPrev) lightboxPrev.style.visibility = showNav ? 'visible' : 'hidden';
    if (lightboxNext) lightboxNext.style.visibility = showNav ? 'visible' : 'hidden';
  }

  function openLightbox(entries, folder, index, trigger, onClose) {
    activeEntries = entries;
    activeFolder = folder;
    activeIndex = index;
    lastFocusedTile = trigger || null;
    onLightboxCloseCallback = onClose || null;
    renderLightboxStage();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (lightboxClose) lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightboxStage.innerHTML = ''; // stop any playing video
    if (lastFocusedTile) lastFocusedTile.focus();
    const cb = onLightboxCloseCallback;
    onLightboxCloseCallback = null;
    if (cb) {
      cb();
    } else {
      document.body.style.overflow = '';
    }
  }

  function stepLightbox(delta) {
    if (!activeEntries.length) return;
    activeIndex = (activeIndex + delta + activeEntries.length) % activeEntries.length;
    renderLightboxStage();
  }

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', () => stepLightbox(-1));
    if (lightboxNext) lightboxNext.addEventListener('click', () => stepLightbox(1));
  }

  if (viewallClose) {
    viewallClose.addEventListener('click', () => {
      if (activeViewAllCloseFn) activeViewAllCloseFn();
    });
  }

  // Escape closes whichever is on top (lightbox first, then "view all");
  // arrow keys navigate the lightbox when it's open.
  document.addEventListener('keydown', (e) => {
    const lightboxOpen = lightbox && lightbox.classList.contains('open');
    if (e.key === 'Escape') {
      if (lightboxOpen) {
        closeLightbox();
      } else if (activeViewAllCloseFn) {
        activeViewAllCloseFn();
      }
      return;
    }
    if (lightboxOpen) {
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    }
  });

  const MARQUEE_SPEED_PX_PER_SEC = 40;

  function createMediaSection(sectionId, folder, title) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const placeholder = section.querySelector('.placeholder-panel');
    const viewport = section.querySelector('.marquee-viewport');
    const track = section.querySelector('.marquee-track');
    const controls = section.querySelector('.section-controls');
    const playPauseBtn = section.querySelector('.marquee-playpause');
    const viewAllBtn = section.querySelector('.view-all-btn');
    if (!viewport || !track) return;

    let entries = [];
    let userPaused = false;
    let overlayOpenForThis = false; // true while the lightbox or "view all" is open because of this section
    let hovering = false; // pausing on hover makes it easier to actually click a moving tile

    function updateScrollState() {
      track.classList.toggle('paused', userPaused || overlayOpenForThis || hovering);
    }

    viewport.addEventListener('mouseenter', () => { hovering = true; updateScrollState(); });
    viewport.addEventListener('mouseleave', () => { hovering = false; updateScrollState(); });

    function setPlayPauseIcon() {
      if (!playPauseBtn) return;
      playPauseBtn.innerHTML = userPaused ? '&#9654;' : '&#10074;&#10074;';
      playPauseBtn.setAttribute('aria-label', userPaused ? 'Resume scrolling' : 'Pause scrolling');
    }

    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        userPaused = !userPaused;
        setPlayPauseIcon();
        updateScrollState();
      });
    }

    function openItem(index, trigger, fromViewAll) {
      overlayOpenForThis = true;
      updateScrollState();
      openLightbox(entries, folder, index, trigger, () => {
        if (fromViewAll) {
          openViewAll();
        } else {
          overlayOpenForThis = false;
          updateScrollState();
          document.body.style.overflow = '';
        }
      });
    }

    function openViewAll() {
      overlayOpenForThis = true;
      updateScrollState();
      viewallTitle.textContent = title;
      viewallGrid.innerHTML = entries.map((e, i) => tileHTML(e, folder, i)).join('');
      viewallGrid.querySelectorAll('.tile').forEach((tile) => {
        tile.addEventListener('click', () => {
          viewallModal.classList.remove('open');
          openItem(Number(tile.dataset.index), tile, true);
        });
      });
      viewallModal.classList.add('open');
      requestAnimationFrame(() => observeLazyVideos(viewallGrid, viewallGrid));
      document.body.style.overflow = 'hidden';
      activeViewAllCloseFn = closeViewAll;
    }

    function closeViewAll() {
      viewallModal.classList.remove('open');
      overlayOpenForThis = false;
      updateScrollState();
      document.body.style.overflow = '';
      activeViewAllCloseFn = null;
    }

    if (viewAllBtn) viewAllBtn.addEventListener('click', openViewAll);

    function renderMarquee() {
      const html = entries.map((e, i) => tileHTML(e, folder, i)).join('');
      track.innerHTML = html + html; // duplicated once for a seamless loop
      observeLazyVideos(track, viewport);
      track.querySelectorAll('.tile').forEach((tile) => {
        const i = Number(tile.dataset.index);
        tile.addEventListener('click', () => openItem(i, tile, false));
      });
      requestAnimationFrame(() => {
        const setWidth = track.scrollWidth / 2;
        const duration = Math.max(setWidth / MARQUEE_SPEED_PX_PER_SEC, 12);
        track.style.setProperty('--marquee-duration', `${duration}s`);
      });
    }

    loadManifest(folder).then((loaded) => {
      entries = loaded;
      if (!entries.length) return; // leave the "coming soon" panel showing
      renderMarquee();
      viewport.hidden = false;
      if (controls) controls.hidden = false;
      if (placeholder) placeholder.hidden = true;
    });
  }

  createMediaSection('gallery', 'gallery', 'Studio');
  createMediaSection('live', 'live', 'Live performances');
})();

// ---------------------------------------------------------------------------
// Scroll to top — appears once you're scrolled roughly past the halfway
// point of the hero banner, follows the viewport, and hides again once
// you're back near the top.
// ---------------------------------------------------------------------------
(function scrollTop() {
  const btn = document.getElementById('scrollTopBtn');
  const hero = document.querySelector('.hero');
  if (!btn || !hero) return;

  let ticking = false;
  function updateVisibility() {
    ticking = false;
    const threshold = hero.offsetHeight * 0.5;
    btn.classList.toggle('is-visible', window.scrollY > threshold);
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateVisibility);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateVisibility();

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

// ---------------------------------------------------------------------------
// Background audio — drop tracks into assets/audio/ and they play as a
// shuffled, looping playlist (a different running order each page load, so
// it's not always the same track first). Autoplay-with-sound is blocked by
// every browser until the visitor interacts with the page at least once —
// that's a browser policy, not something any site can turn off. This tries
// on load anyway (browsers let that fail quietly), then unlocks on the very
// first genuine interaction anywhere on the page. Listening in the capture
// phase and calling play() as the first line of the handler matters most on
// mobile, where the window to use a gesture for audio is short and strict.
// ---------------------------------------------------------------------------
(function backgroundAudio() {
  const nav = document.getElementById('navAudio');
  const playBtn = document.getElementById('audioPlayBtn');
  const muteBtn = document.getElementById('audioMuteBtn');
  if (!nav || !playBtn || !muteBtn) return;

  loadManifest('audio').then((loaded) => {
    if (!loaded.length) return; // no tracks yet — leave the controls hidden

    // Shuffle into a random running order each page load (Fisher–Yates).
    const entries = loaded.slice();
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }

    const audio = new Audio();
    audio.volume = 0.5;
    audio.preload = 'auto';

    let index = 0;
    let userPaused = false;

    function loadTrack(i) {
      audio.src = `assets/audio/${encodeURIComponent(entries[i].file)}`;
    }
    loadTrack(index);

    function play() {
      const p = audio.play();
      if (p && p.catch) {
        p.catch(() => {
          // Still blocked — the unlock listeners below will retry on the
          // next real interaction.
        });
      }
    }

    function setPlayIcon() {
      const playing = !audio.paused;
      playBtn.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;';
      playBtn.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
    }

    function setMuteIcon() {
      muteBtn.innerHTML = audio.muted ? '&#128263;' : '&#128266;';
      muteBtn.classList.toggle('is-muted', audio.muted);
      muteBtn.setAttribute('aria-label', audio.muted ? 'Unmute' : 'Mute');
    }

    audio.addEventListener('ended', () => {
      index = (index + 1) % entries.length;
      loadTrack(index);
      play();
    });
    audio.addEventListener('play', setPlayIcon);
    audio.addEventListener('pause', setPlayIcon);

    playBtn.addEventListener('click', () => {
      if (audio.paused) {
        userPaused = false;
        play();
      } else {
        userPaused = true;
        audio.pause();
      }
    });

    muteBtn.addEventListener('click', () => {
      audio.muted = !audio.muted;
      setMuteIcon();
    });

    // Try immediately in case the browser already trusts this origin
    // (returning visitors — see Chrome's Media Engagement Index), then fall
    // back to unlocking on the first real interaction.
    play();

    // 'click' is the one event type Chrome's own developers explicitly
    // recommend for this, specifically because which other events count as
    // valid "user activation" isn't consistent across browsers/devices —
    // pointerdown/touchend/mousedown are not guaranteed to qualify the same
    // way everywhere. 'keydown' is kept alongside it for keyboard users.
    // Listeners are only removed once a play() attempt actually succeeds —
    // never optimistically beforehand — so if an earlier, less-reliable
    // event in the same gesture fails silently, the next real interaction
    // still gets its own chance rather than finding the listener gone.
    let unlocked = false;
    function unlock() {
      if (unlocked || userPaused) return;
      const p = audio.play();
      if (p && p.then) {
        p.then(() => {
          unlocked = true;
          removeUnlockListeners();
        }).catch(() => { /* this attempt didn't count — leave listeners active to retry */ });
      } else {
        unlocked = true;
        removeUnlockListeners();
      }
    }
    function removeUnlockListeners() {
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    }
    document.addEventListener('click', unlock, true);
    document.addEventListener('keydown', unlock, true);

    setPlayIcon();
    setMuteIcon();
    nav.hidden = false;
  });
})();
