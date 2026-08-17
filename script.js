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
// Hero background: lightning + logo reveal, then a photo gallery, on a loop.
//
// To add your own hero background photos: drop image files into
// assets/hero-gallery/ and list their filenames below. You can add as many
// (or as few) as you like — the timing adjusts automatically. Leave the list
// empty and the hero will just show the logo reveal, at rest, as it does now.
// ---------------------------------------------------------------------------
const HERO_GALLERY_PHOTOS = [
  // 'band-live-1.jpg',
  // 'band-live-2.jpg',
];

(function heroAnim() {
  const heroAnimEl = document.querySelector('.hero-anim');
  const galleryEl = document.querySelector('.hero-gallery');
  let revealEl = document.querySelector('.hero-reveal');
  if (!heroAnimEl || !galleryEl || !revealEl) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  galleryEl.innerHTML = HERO_GALLERY_PHOTOS.map((file) =>
    `<div class="hero-gallery-slide" style="background-image:url('assets/hero-gallery/${file}')"></div>`
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

  if (!slides.length) return; // no photos configured — reveal plays once and rests, as before

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
})();
