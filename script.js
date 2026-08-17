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

  let activeEntries = [];
  let activeFolder = '';
  let activeIndex = 0;
  let lastFocusedTile = null;

  function renderStage() {
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

  function openLightbox(entries, folder, index, trigger) {
    activeEntries = entries;
    activeFolder = folder;
    activeIndex = index;
    lastFocusedTile = trigger || null;
    renderStage();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (lightboxClose) lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lightboxStage.innerHTML = ''; // stop any playing video
    if (lastFocusedTile) lastFocusedTile.focus();
  }

  function stepLightbox(delta) {
    if (!activeEntries.length) return;
    activeIndex = (activeIndex + delta + activeEntries.length) % activeEntries.length;
    renderStage();
  }

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', () => stepLightbox(-1));
    if (lightboxNext) lightboxNext.addEventListener('click', () => stepLightbox(1));
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    });
  }

  function renderGrid(sectionId, folder) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const placeholder = section.querySelector('.placeholder-panel');
    const grid = section.querySelector('.gallery-grid');
    if (!grid) return;

    loadManifest(folder).then((entries) => {
      if (!entries.length) return; // leave the "coming soon" panel showing

      grid.innerHTML = entries.map((entry, i) => {
        const src = `assets/${folder}/${encodeURIComponent(entry.file)}`;
        if (entry.type === 'video') {
          return `<button class="tile tile-video" type="button" data-index="${i}" aria-label="Open video">
            <video src="${src}" muted preload="metadata" playsinline></video>
            <span class="play-badge" aria-hidden="true">&#9658;</span>
          </button>`;
        }
        return `<button class="tile" type="button" data-index="${i}" aria-label="Open photo">
          <img src="${src}" loading="lazy" alt="">
        </button>`;
      }).join('');

      grid.querySelectorAll('.tile').forEach((tile) => {
        tile.addEventListener('click', () => {
          openLightbox(entries, folder, Number(tile.dataset.index), tile);
        });
      });

      grid.hidden = false;
      if (placeholder) placeholder.hidden = true;
    });
  }

  renderGrid('gallery', 'gallery');
  renderGrid('live', 'live');
})();
