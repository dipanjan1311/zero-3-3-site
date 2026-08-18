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

    if (!slides.length) return; // no photos yet — reveal plays once and rests, as before

    const FADE_MS = 900;
    const HOLD_MS = 5000;

    function playGallery() {
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

    function replayReveal() {
      const fresh = revealEl.cloneNode(true);
      fresh.classList.remove('is-hidden');
      revealEl.parentNode.replaceChild(fresh, revealEl);
      revealEl = fresh;
      watchReveal();
    }

    function watchReveal() {
      const cubeDrop = revealEl.querySelector('.hero-cube-drop');
      if (!cubeDrop) return;
      cubeDrop.addEventListener('animationend', function onEnd(e) {
        if (e.animationName !== 'heroCubeZoom') return;
        cubeDrop.removeEventListener('animationend', onEnd);
        revealEl.classList.add('is-hidden');
        setTimeout(playGallery, FADE_MS);
      });
    }

    watchReveal();
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
      return `<button class="tile tile-video" type="button" data-index="${index}" aria-label="Open video">
        <video src="${src}" muted preload="metadata" playsinline></video>
        <span class="play-badge" aria-hidden="true">&#9654;</span>
      </button>`;
    }
    return `<button class="tile" type="button" data-index="${index}" aria-label="Open photo">
      <img src="${src}" loading="lazy" alt="">
    </button>`;
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
  createMediaSection('live', 'live', 'Live');
})();
