// ---------- Login ----------

// Change these to the username and password you want. Anyone who opens the page
// source can read them, so this keeps out casual visitors, not determined ones.
const LOGIN = { username: "OurStory", password: "girlfriendpower6000" };
const LOGIN_KEY = "anniversary-logged-in";
const LOGIN_PAGE = new URL("../login.html", document.currentScript.src).href;
// Logging in leads to the chapter list; each chapter then has its own home page
const CHAPTERS_PAGE = new URL("../chapters.html", document.currentScript.src).href;
const ON_LOGIN_PAGE = Boolean(document.querySelector("[data-login]"));

function isLoggedIn() {
  try {
    return sessionStorage.getItem(LOGIN_KEY) === "yes";
  } catch {
    return true; // storage blocked: don't lock them out for good
  }
}

// Every other page sends visitors to log in first; the login page skips ahead if they already have
if (ON_LOGIN_PAGE === isLoggedIn()) {
  document.documentElement.style.visibility = "hidden";
  window.location.replace(ON_LOGIN_PAGE ? CHAPTERS_PAGE : LOGIN_PAGE);
}

function setupLogin() {
  const form = document.querySelector("[data-login]");
  if (!form) return;
  const { username, password } = form.elements;
  const error = form.querySelector(".login-error");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const ok =
      username.value.trim().toLowerCase() === LOGIN.username.toLowerCase() &&
      password.value === LOGIN.password;
    if (ok) {
      try { sessionStorage.setItem(LOGIN_KEY, "yes"); } catch {}
      navigateTo(CHAPTERS_PAGE);
      return;
    }
    error.textContent = "That's not quite right, try again";
    password.value = "";
    password.focus();
    // Restart the little shake each time
    form.classList.remove("shake");
    void form.offsetWidth;
    form.classList.add("shake");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  createSky();
  decorateWithSprigs();
  setupLogin();
  setSplash();
  setupMenu();
  setupStoryNav();
  setupPageLinks();
  setupGallery();
  setupCollage();
});

// ---------- Page transitions ----------

const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Fade the whole page out, then load the next one (which fades itself in via CSS)
function navigateTo(url) {
  if (REDUCE_MOTION) {
    window.location.href = url;
    return;
  }
  document.body.classList.add("page-leaving");
  setTimeout(() => {
    window.location.href = url;
  }, 400);
}

function setupPageLinks() {
  document.querySelectorAll("a[data-transition]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(link.href);
    });
  });

  // Coming back via the browser's back button can restore the faded-out page
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) document.body.classList.remove("page-leaving");
  });
}

// ---------- Photo gallery ----------

// Little sprig of baby's breath as the placeholder for photos not added yet
const PHOTO_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#fbeef3"/><g stroke="#a9bfa5" stroke-width="0.6" fill="none"><path d="M20 31Q19 25 14.5 19.5"/><path d="M20 31Q20.5 24 25.5 18.5"/><path d="M20 31Q20 23 20 15"/></g><g fill="#fff" stroke="#efc3d2" stroke-width="0.5"><circle cx="14" cy="18.5" r="2"/><circle cx="12" cy="20.5" r="1.6"/><circle cx="16" cy="17" r="1.5"/><circle cx="20" cy="14" r="2.1"/><circle cx="18" cy="12.6" r="1.5"/><circle cx="22" cy="12.8" r="1.6"/><circle cx="26" cy="17.5" r="2"/><circle cx="28" cy="19.5" r="1.6"/><circle cx="24.4" cy="16" r="1.4"/></g></svg>`
  );

const MONTH_FORMAT = { month: "long", year: "numeric" };

// Photo file types tried in order, so 1.jpg, 1.png, 1.webp ... all work
const PHOTO_TYPES = ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG"];

// Loads base.jpg, falling back through the other types, then the placeholder
function loadPhoto(img, base, onMissing) {
  let i = 0;
  img.addEventListener("error", function tryNext() {
    i++;
    if (i < PHOTO_TYPES.length) {
      img.src = `${base}.${PHOTO_TYPES[i]}`;
    } else {
      img.removeEventListener("error", tryNext);
      img.src = PHOTO_PLACEHOLDER;
      onMissing?.();
    }
  });
  img.src = `${base}.${PHOTO_TYPES[0]}`;
}

// Builds the slides from the settings on the gallery element; see the comment in pages/story.html
function setupGallery() {
  const gallery = document.querySelector("[data-gallery]");
  if (!gallery) return;
  const track = gallery.querySelector(".gallery-track");
  const heading = gallery.closest(".page-card").querySelector(".gallery-month");
  const caption = gallery.closest(".page-card").querySelector(".gallery-caption");
  const captions = (gallery.dataset.captions || "").split("|").map((c) => c.trim());
  const [prev, next] = gallery.querySelectorAll(".gallery-arrow");
  const { slides: count = "auto", titles, start, label = "Slide", photos } = gallery.dataset;

  // Photos per slide can be 1 to 4; the CSS lays each count out differently.
  // One number for every slide ("3"), or one per slide ("2 | 3 | 1"); the last one repeats.
  const perSlide = (gallery.dataset.perSlide || "3").split("|")
    .map((n) => Math.min(4, Math.max(1, Number(n) || 3)));
  const countFor = (i) => perSlide[Math.min(i, perSlide.length - 1)];

  // Each slide needs a title and the folder its photos live in
  const pages = [];
  if (titles) {
    titles.split("|").map((t) => t.trim()).filter(Boolean)
      .forEach((title, i) => pages.push({ folder: String(i + 1), label: title }));
  } else if (start) {
    // Months from data-start: a fixed number, or "auto" for every month up to this one
    const [year, month] = start.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    const now = new Date();
    const total = count === "auto" ? Infinity : Number(count);
    while (pages.length < total && (total !== Infinity || date <= now)) {
      pages.push({
        folder: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: date.toLocaleDateString("en-US", MONTH_FORMAT),
      });
      date.setMonth(date.getMonth() + 1);
    }
  } else {
    // Numbered slides: "Matching Profile 1", "Matching Profile 2", ...
    for (let n = 1; n <= Number(count); n++) {
      pages.push({ folder: String(n), label: `${label} ${n}` });
    }
  }
  if (!pages.length) return;

  const slides = pages.map(({ folder, label }, s) => {
    const slide = document.createElement("div");
    slide.className = "gallery-slide";
    slide.dataset.label = label;
    slide.dataset.count = countFor(s);
    for (let i = 1; i <= countFor(s); i++) {
      const card = document.createElement("figure");
      card.className = "photocard";
      const img = document.createElement("img");
      img.alt = `${label}, photo ${i}`;
      img.loading = "lazy";
      // Shape the frame to the photo (wide, tall or square); placeholders stay square
      img.addEventListener("load", () => {
        const real = img.src !== PHOTO_PLACEHOLDER && img.naturalHeight;
        card.style.setProperty("--ratio", real ? img.naturalWidth / img.naturalHeight : 1);
      });
      loadPhoto(img, `${photos}/${folder}/${i}`);
      card.appendChild(img);
      slide.appendChild(card);
    }
    track.appendChild(slide);
    return slide;
  });

  let index = 0;
  const show = (i) => {
    slides[index].classList.remove("is-active");
    index = i;
    slides[index].classList.add("is-active");
    if (heading) heading.textContent = slides[index].dataset.label;
    if (caption) caption.textContent = captions[index] || "";
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
  };

  prev.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => show(index + 1));
  show(0);
}

// ---------- Us collage ----------

// Resolves to the URL of base.jpg / base.png / ... whichever exists, or null if none do
function findPhoto(base) {
  return new Promise((resolve) => {
    const probe = new Image();
    let i = 0;
    probe.onload = () => resolve(probe.src);
    probe.onerror = () => {
      i++;
      if (i < PHOTO_TYPES.length) probe.src = `${base}.${PHOTO_TYPES[i]}`;
      else resolve(null);
    };
    probe.src = `${base}.${PHOTO_TYPES[0]}`;
  });
}

// Fills the collage with photos 1, 2, 3 ... from the folder, finding them by itself;
// see the note at the top of pages/us.html
async function setupCollage() {
  const collage = document.querySelector("[data-collage]");
  if (!collage) return;
  const { photos } = collage.dataset;
  const captions = (collage.dataset.captions || "").split("|").map((c) => c.trim());
  const found = [];
  const BATCH = 8; // photos looked for at once, so the page fills quickly

  const addCard = (n, src, order) => {
    const caption = captions[n - 1] || "";
    const photo = { src, alt: caption || `Memory ${n}`, caption };
    const index = found.push(photo) - 1;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "collage-card";
    // Each photo leans a little differently, like they were stuck up by hand,
    // and each batch gets pinned up one after another
    card.style.setProperty("--tilt", `${random(-4, 4).toFixed(1)}deg`);
    card.style.setProperty("--delay", `${order * 80}ms`);
    const img = document.createElement("img");
    img.src = src;
    img.alt = photo.alt;
    card.appendChild(img);
    if (caption) {
      const words = document.createElement("span");
      words.className = "collage-caption";
      words.textContent = caption;
      card.appendChild(words);
    }
    card.addEventListener("click", () => openLightbox(found, index, card));
    collage.appendChild(card);
  };

  // Keep looking until 3 numbers in a row are missing, so one skipped number doesn't end it
  let misses = 0;
  for (let first = 1; misses < 3 && first <= 500; first += BATCH) {
    const numbers = Array.from({ length: BATCH }, (_, i) => first + i);
    const sources = await Promise.all(numbers.map((n) => findPhoto(`${photos}/${n}`)));
    let order = 0;
    for (const [i, src] of sources.entries()) {
      if (!src) {
        if (++misses >= 3) break;
        continue;
      }
      misses = 0;
      addCard(numbers[i], src, order++);
    }
  }
}

// Shows a photo large over the page. Arrows or ← → flip through the rest;
// clicking outside the photo, the × or Escape closes it.
function openLightbox(list, start, opener) {
  let box = document.querySelector(".lightbox");
  if (!box) {
    box = document.createElement("div");
    box.className = "lightbox";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Photo viewer");
    box.innerHTML = `
      <button class="lightbox-close" type="button" aria-label="Close">&times;</button>
      <button class="gallery-arrow lightbox-arrow" type="button" data-dir="-1" aria-label="Previous photo">&#8249;</button>
      <figure class="lightbox-photo"><img alt=""><figcaption></figcaption></figure>
      <button class="gallery-arrow lightbox-arrow" type="button" data-dir="1" aria-label="Next photo">&#8250;</button>
      <p class="lightbox-count" aria-live="polite"></p>`;

    const close = () => {
      box.hidden = true;
      box.opener?.focus();
    };
    box.show = (i) => {
      box.index = (i + box.list.length) % box.list.length; // wraps around at either end
      const { src, alt, caption } = box.list[box.index];
      const big = box.querySelector("img");
      big.src = src;
      big.alt = alt;
      box.querySelector("figcaption").textContent = caption;
      box.querySelector(".lightbox-count").textContent = `${box.index + 1} / ${box.list.length}`;
    };

    box.addEventListener("click", (e) => {
      const arrow = e.target.closest(".lightbox-arrow");
      if (arrow) box.show(box.index + Number(arrow.dataset.dir));
      else if (!e.target.closest(".lightbox-photo")) close();
    });
    // Swipe left or right on phones to flip through
    let touchX = null;
    box.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 50 && box.list.length > 1) box.show(box.index + (dx < 0 ? 1 : -1));
    });
    document.addEventListener("keydown", (e) => {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") box.show(box.index - 1);
      if (e.key === "ArrowRight") box.show(box.index + 1);
    });
    document.body.appendChild(box);
  }
  box.list = list;
  box.opener = opener;
  box.classList.toggle("is-single", list.length < 2);
  box.show(start);
  box.hidden = false;
  box.querySelector(".lightbox-close").focus();
}

// ---------- Our Story pages ----------

// The pages behind the "Our Story" button, in the order Back/Next walk through them.
// To add a page: copy pages/story.html, give it a new name, and add that name here.
const STORY_PAGES = [
  "beginning.html",
];

function setupStoryNav() {
  const nav = document.querySelector("[data-story-nav]");
  if (!nav) return;
  const here = decodeURIComponent(window.location.pathname.split("/").pop());
  const i = STORY_PAGES.indexOf(here);
  if (i === -1) return;
  const back = nav.querySelector("[data-back]");
  const next = nav.querySelector("[data-next]");
  // First page goes back home; the last page's Next also leads home
  back.href = i > 0 ? STORY_PAGES[i - 1] : "../index.html";
  if (i < STORY_PAGES.length - 1) {
    next.href = STORY_PAGES[i + 1];
  } else {
    next.href = "../index.html";
    next.textContent = "Home";
  }
}

// ---------- Splash text ----------

const SPLASHES = [
  "Year 1",
];

function setSplash() {
  const splash = document.getElementById("splash");
  if (!splash) return;
  splash.textContent = SPLASHES[Math.floor(Math.random() * SPLASHES.length)];
}

// ---------- Menu panels ----------

// Placeholder content; replace with your own words
const PANELS = {
  letter: { title: "Love Letter", body: "A letter, just for you." },
  us: { title: "Us", body: "Images of us, all in one place." },
};

function setupMenu() {
  const backdrop = document.getElementById("panel");
  if (!backdrop) return; // only the home page has the menu
  const panelEl = backdrop.querySelector(".panel");
  const title = document.getElementById("panel-title");
  const body = document.getElementById("panel-body");
  const next = document.getElementById("panel-next");
  let current = null;
  let closing = false;

  document.querySelectorAll("[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      current = btn.dataset.panel;
      title.textContent = PANELS[current].title;
      body.textContent = PANELS[current].body;
      backdrop.hidden = false;
      next.focus();
    });
  });

  // Each section has its own page, e.g. pages/letter.html (or the `page` set in PANELS)
  next.addEventListener("click", () => navigateTo(`pages/${PANELS[current].page || current}.html`));

  // Fade the dialog out before hiding it so the menu reappears smoothly
  const hide = async () => {
    if (closing) return;
    closing = true;
    const options = { duration: REDUCE_MOTION ? 1 : 300, easing: "ease-in-out", fill: "forwards" };
    await Promise.all([
      backdrop.animate([{ opacity: 1 }, { opacity: 0 }], options).finished,
      panelEl.animate([
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: "translateY(10px) scale(0.97)" },
      ], options).finished,
    ]);
    backdrop.hidden = true;
    backdrop.getAnimations().forEach((a) => a.cancel());
    panelEl.getAnimations().forEach((a) => a.cancel());
    closing = false;
    document.querySelector(`[data-panel="${current}"]`).focus();
  };

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) hide();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !backdrop.hidden) hide();
  });
}

// ---------- Background sky ----------

// Puff layout relative to cloud width: [left, bottom, diameter]
const CLOUD_SHAPE = [
  [0.0, 0.02, 0.3],
  [0.16, 0.1, 0.38],
  [0.34, 0.16, 0.46],
  [0.56, 0.1, 0.36],
  [0.72, 0.02, 0.28],
  [0.12, 0.0, 0.3],
  [0.32, 0.0, 0.34],
  [0.52, 0.0, 0.32],
];

function createSky() {
  const sky = document.createElement("div");
  sky.className = "sky";
  sky.setAttribute("aria-hidden", "true");

  // A few clouds at different heights; negative delays put them mid-drift on load
  const clouds = [
    { top: 6, width: 280, dur: 150, delay: -40 },
    { top: 32, width: 190, dur: 190, delay: -120 },
    { top: 58, width: 320, dur: 170, delay: -15 },
    { top: 80, width: 210, dur: 210, delay: -160 },
  ];
  clouds.forEach(({ top, width, dur, delay }) => {
    sky.appendChild(createCloud(top, width, dur, delay));
  });

  // Baby's breath blossoms drifting down
  const petalCount = window.innerWidth < 600 ? 14 : 26;
  for (let i = 0; i < petalCount; i++) {
    const petal = document.createElement("div");
    petal.className = "petal";
    const dur = random(14, 24);
    petal.style.setProperty("--x", `${random(0, 100)}%`);
    petal.style.setProperty("--size", `${random(9, 18)}px`);
    petal.style.setProperty("--opacity", random(0.6, 0.95).toFixed(2));
    petal.style.setProperty("--dur", `${dur}s`);
    petal.style.setProperty("--delay", `${-random(0, dur)}s`);
    petal.innerHTML = blossomSvg();
    sky.appendChild(petal);
  }

  document.body.prepend(sky);
  scheduleBouquets(sky);
}

// ---------- Falling bouquets ----------

// Every so often a mini bouquet of baby's breath in pink wrapping tumbles down
function scheduleBouquets(sky) {
  if (REDUCE_MOTION) return;
  const drop = () => {
    if (!document.hidden) sky.appendChild(createBouquet());
    setTimeout(drop, random(8000, 16000));
  };
  setTimeout(drop, random(2500, 6000));
}

function createBouquet() {
  const bouquet = document.createElement("div");
  bouquet.className = "bouquet";
  bouquet.style.setProperty("--x", `${random(5, 88)}%`);
  bouquet.style.setProperty("--size", `${random(44, 64)}px`);
  bouquet.style.setProperty("--dur", `${random(11, 16)}s`);
  bouquet.innerHTML = bouquetSvg();
  // Clean up once it has fallen past the bottom of the screen
  bouquet.addEventListener("animationend", (e) => {
    if (e.target === bouquet) bouquet.remove();
  });
  return bouquet;
}

function bouquetSvg() {
  const f = (n) => n.toFixed(1);
  // Stems fanning out of the wrapping toward the flowers
  const stems = [-14, -7, 0, 7, 14]
    .map((dx) => `<path d="M30 52Q${f(30 + dx * 0.4)} 40 ${f(30 + dx)} ${f(28 + Math.abs(dx) * 0.3)}" stroke-width="0.8"/>`)
    .join("");
  // A dome of tiny florets rising out of the paper
  const florets = [];
  for (let i = 0; i < 48; i++) {
    const a = random(Math.PI - 0.3, Math.PI * 2 + 0.3);
    const d = Math.sqrt(Math.random()) * 17;
    const x = 30 + Math.cos(a) * d * 1.1;
    const y = 30 + Math.sin(a) * d * 0.9;
    florets.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(random(1.5, 2.4))}"/>`);
  }
  return `<svg viewBox="0 0 60 80" aria-hidden="true">
    <path d="M6 22Q18 30 30 28Q42 30 54 22L33 74H27Z" fill="#f8c4d4"/>
    <g class="sprig-stems">${stems}</g>
    <g class="sprig-florets">${florets.join("")}</g>
    <path d="M11 34Q20 40 30 38Q40 40 49 34L32.5 74H27.5Z" fill="#f4a7bf"/>
    <path d="M30 38V74" stroke="#e98aa9" stroke-width="0.4"/>
    <path d="M21 56H39L38.3 60H21.7Z" fill="#d9668c"/>
    <path d="M30 58C24 52 20 56 23 60C25 62 28 60 30 58ZM30 58C36 52 40 56 37 60C35 62 32 60 30 58Z" fill="#e17a9c"/>
    <path d="M30 58L26 67M30 58L34 67" stroke="#d9668c" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="30" cy="58" r="1.7" fill="#d9668c"/>
  </svg>`;
}

function createCloud(top, width, dur, delay) {
  const cloud = document.createElement("div");
  cloud.className = "cloud";
  cloud.style.top = `${top}%`;
  cloud.style.setProperty("--w", `${width}px`);
  cloud.style.setProperty("--dur", `${dur}s`);
  cloud.style.setProperty("--delay", `${delay}s`);

  // Slight random jitter so no two clouds look identical
  CLOUD_SHAPE.forEach(([left, bottom, size]) => {
    const puff = document.createElement("span");
    puff.className = "puff";
    const d = width * size * random(0.9, 1.1);
    puff.style.width = `${d}px`;
    puff.style.height = `${d}px`;
    puff.style.left = `${width * left + random(-4, 4)}px`;
    puff.style.bottom = `${width * bottom}px`;
    cloud.appendChild(puff);
  });

  return cloud;
}

function blossomSvg() {
  // Five rounded white petals around a pale center
  const petals = [0, 72, 144, 216, 288]
    .map((angle) => `<ellipse cx="10" cy="5" rx="3.6" ry="4.6" transform="rotate(${angle} 10 10)" />`)
    .join("");
  return `<svg viewBox="0 0 20 20"><g fill="#fff">${petals}</g><circle cx="10" cy="10" r="2.2" fill="#f6e7c8" /></svg>`;
}

// ---------- Baby's breath sprigs ----------

// Seeded random so each sprig keeps the same shape on every page load
function seededRandom(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

// Thin sage stems that keep forking, every tip ending in a puff of tiny white florets
function sprigSvg(seed, { roots = [-90], length = 40, depth = 3, spread = 30 } = {}) {
  const rand = seededRandom(seed);
  const between = (min, max) => min + rand() * (max - min);
  const f = (n) => n.toFixed(1);
  const stems = [];
  const florets = [];
  let minX = 0, minY = 0, maxX = 0, maxY = 0;
  const grow = (x, y, pad = 0) => {
    minX = Math.min(minX, x - pad);
    minY = Math.min(minY, y - pad);
    maxX = Math.max(maxX, x + pad);
    maxY = Math.max(maxY, y + pad);
  };

  const cluster = (x, y, size) => {
    const count = Math.round(between(4, 8));
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * size;
      const r = between(1.5, 2.5);
      const cx = x + Math.cos(a) * d;
      const cy = y + Math.sin(a) * d;
      florets.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`);
      grow(cx, cy, r + 0.5);
    }
  };

  const branch = (x, y, angle, len, level) => {
    const rad = (angle * Math.PI) / 180;
    const ex = x + Math.cos(rad) * len;
    const ey = y + Math.sin(rad) * len;
    // Bend each stem a little so nothing looks ruler-straight
    const bend = between(-0.2, 0.2) * len;
    const qx = (x + ex) / 2 - Math.sin(rad) * bend;
    const qy = (y + ey) / 2 + Math.cos(rad) * bend;
    stems.push(`<path d="M${f(x)} ${f(y)}Q${f(qx)} ${f(qy)} ${f(ex)} ${f(ey)}" stroke-width="${f(0.5 + level * 0.4)}"/>`);
    grow(ex, ey);
    if (level === 0) {
      cluster(ex, ey, len * 0.3 + 3);
      return;
    }
    const forks = rand() < 0.5 ? 2 : 3;
    for (let i = 0; i < forks; i++) {
      const offset = (i - (forks - 1) / 2) * between(spread * 0.7, spread * 1.1);
      branch(ex, ey, angle + offset, len * between(0.55, 0.75), level - 1);
    }
  };

  roots.forEach((angle, i) => branch(0, 0, angle, length * (i % 2 ? 1 : 0.85), depth));

  const viewBox = `${f(minX)} ${f(minY)} ${f(maxX - minX)} ${f(maxY - minY)}`;
  return `<svg class="sprig" viewBox="${viewBox}" aria-hidden="true"><g class="sprig-stems">${stems.join("")}</g><g class="sprig-florets">${florets.join("")}</g></svg>`;
}

// Sprigs either side of the heart, and tucked onto the corners of cards and panels
function decorateWithSprigs() {
  document.querySelectorAll(".logo-divider > span").forEach((span) => {
    span.innerHTML = sprigSvg(3, { roots: [180], length: 20, depth: 2, spread: 26 });
  });

  document.querySelectorAll(".page-card, .panel").forEach((card) => {
    if (card.querySelector("[data-login]")) return; // keep the login form uncluttered
    ["start", "end"].forEach((corner, i) => {
      const sprig = document.createElement("span");
      sprig.className = `card-sprig card-sprig--${corner}`;
      sprig.setAttribute("aria-hidden", "true");
      sprig.innerHTML = sprigSvg(11 + i, { roots: [-100, -80], length: 22, depth: 2 });
      card.appendChild(sprig);
    });
  });
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}
