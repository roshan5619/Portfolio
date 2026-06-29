/* ============================================================
   ROSHAN BABU — QUANTUM EDITORIAL
   Data-driven renderer + motion.dev animations
   ============================================================ */

/* ---- Motion (motion.dev) via CDN, with graceful fallback ---- */
let animate, inView, stagger;
try {
  const m = await import("https://cdn.jsdelivr.net/npm/motion@11/+esm");
  animate = m.animate;
  inView = m.inView;
  stagger = m.stagger;
} catch (e) {
  console.warn("Motion failed to load — using static fallback.", e);
}

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const MOTION_OK = !!animate && !REDUCED;
const EASE = [0.22, 1, 0.36, 1];

/* ---- Small helpers ---- */
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ============================================================
   TEMPLATES
   ============================================================ */
function navTpl(d) {
  const links = d.nav.links.map(
    (l) => `<a href="${esc(l.href)}" class="nav-a">${esc(l.label)}</a>`
  ).join("");
  return `
    <div class="masthead-row">
      <a href="#home" class="brand">
        <span class="brand-dot"></span>
        <span class="brand-mark">${esc(d.nav.brandMark)}</span>
        <span class="brand-suffix">${esc(d.nav.brandSuffix)}</span>
      </a>
      <nav class="nav-list" id="nav-list" role="navigation" aria-label="Primary">${links}</nav>
      <a class="nav-cta" href="${esc(d.nav.cvUrl)}" download>
        ${esc(d.nav.cvLabel)} <span class="arrow">→</span>
      </a>
      <button class="nav-toggle" id="nav-toggle" aria-label="Toggle menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>`;
}

function heroTpl(h) {
  const stats = h.stats.map(
    (s) => `
      <div class="stat-card reveal">
        <span class="stat-val">${esc(s.value)}</span>
        <span class="stat-lbl">${esc(s.label)}</span>
      </div>`
  ).join("");
  const cta = h.cta.map((c, i) => {
    const dl = c.download ? " download" : "";
    return `${i > 0 ? '<span class="ed-divider">·</span>' : ""}
      <a href="${esc(c.href)}" class="ed-link"${dl}>${esc(c.label)} <span class="arrow">${esc(c.arrow || "→")}</span></a>`;
  }).join("");

  return `
  <section id="home" class="hero">
    <div class="container">
      <div class="hero-topline">
        <span><span class="dash">—</span> ${esc(h.kicker)} <span class="dash">—</span></span>
        <span>${esc(h.volumeLabel)}</span>
      </div>

      <div class="hero-grid">
        <div class="hero-headline">
          <span class="hero-kicker" data-hero>A Profile</span>
          <h1 class="hero-name"><span data-hero>${esc(h.firstName)}</span><br><em data-hero>${esc(h.lastName)}</em></h1>
          <p class="hero-role" data-hero><span class="lead-dash">—</span> ${esc(h.role)}</p>
        </div>
        <figure class="hero-photo" data-hero>
          <div class="photo-frame"><img src="${esc(h.photo)}" alt="Bandlapalli Roshan Babu"></div>
          <figcaption class="photo-caption">${esc(h.photoCaption)}</figcaption>
        </figure>
      </div>

      <div class="hero-lower">
        <div class="hero-section-label">${esc(h.sectionLabel)}</div>
        <p class="hero-lead"><span class="drop-cap">${esc(h.dropCap)}</span>${esc(h.lead)}</p>
        <div class="hero-stats">${stats}</div>
      </div>

      <div class="hero-cta">${cta}</div>
    </div>
  </section>`;
}

function marqueeTpl(text) {
  const one = `<span>${esc(text)}</span>`;
  return `<div class="marquee" aria-hidden="true"><div class="marquee-track">${one.repeat(8)}</div></div>`;
}

function columnTpl(col) {
  let body = "";
  if (col.type === "skills") {
    body = `<dl class="skill-list">${col.items.map(
      (s) => `<div class="skill-row reveal"><dt>${esc(s.dt)}</dt><dd>${esc(s.dd)}</dd></div>`
    ).join("")}</dl>`;
  } else if (col.type === "chips") {
    body = `<div class="chip-row">${col.items.map((c) => `<span class="chip reveal">${esc(c)}</span>`).join("")}</div>`;
  } else if (col.type === "timeline") {
    body = `<ol class="timeline-list">${col.items.map(
      (t) => `
      <li class="tl-row reveal">
        <span class="tl-year">${esc(t.year)}</span>
        <div>
          <h4 class="tl-role">${esc(t.role)}</h4>
          <p class="tl-co">${esc(t.company)}</p>
          <span class="tl-date">${esc(t.date)}</span>
          <p class="tl-desc">${esc(t.desc)}</p>
        </div>
      </li>`
    ).join("")}</ol>`;
  }
  return `<div><h3 class="col-title">${esc(col.title)}</h3>${body}</div>`;
}

function projectsTpl(projects) {
  return `<ol class="proj-list">${projects.map((p) => {
    const link = p.link && p.link.href
      ? `<a class="proj-link" href="${esc(p.link.href)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${esc(p.link.label)} →</a>`
      : `<span class="proj-link">${esc((p.link && p.link.label) || "View")} →</span>`;
    return `
      <li class="proj-row reveal" data-img="${esc(p.img)}" data-caption="${esc(p.caption)}">
        <span class="proj-num">${esc(p.num)}</span>
        <h4 class="proj-title">${esc(p.title)} <em>${esc(p.titleEm)}</em></h4>
        <span class="proj-tags">${esc(p.tags)}</span>
        ${link}
      </li>`;
  }).join("")}</ol>`;
}

function aboutTpl(a) {
  const edu = a.education.map(
    (e) => `
    <div class="edu-row reveal">
      <span class="edu-year">${esc(e.year)}</span>
      <div>
        <div class="edu-deg">${esc(e.degree)}</div>
        <div class="edu-school">${esc(e.school)}</div>
        <div class="edu-meta">${esc(e.meta)}</div>
      </div>
    </div>`
  ).join("");
  const highlights = a.highlights.map((h) => `<li class="reveal">${esc(h)}</li>`).join("");
  const prose = a.prose.map((p) => `<p>${esc(p)}</p>`).join("");

  return `
  <section id="about" class="spread">
    <div class="container spread-content">
      <header class="spread-head reveal">
        <span class="spread-kicker">${esc(a.kicker)}</span>
        <h2 class="spread-title">${esc(a.title)}<br><em>${esc(a.titleEm)}</em></h2>
      </header>

      <div class="spread-cols">
        <div style="position:relative;">
          <p class="leadProse reveal" style="font-family:var(--ff-italic);font-style:italic;font-size:clamp(26px,3.4vw,42px);line-height:1.25;color:var(--text);margin-bottom:30px;">${esc(a.leadProse)}</p>
          <blockquote class="reveal" style="font-family:var(--ff-italic);font-style:italic;font-size:22px;color:var(--text-soft);border-left:2px solid var(--accent-soft);padding-left:22px;margin-top:30px;">${esc(a.pullQuote)}</blockquote>
          <div class="sphere" style="width:130px;height:130px;left:12px;bottom:24px;"></div>
        </div>
        <div>
          <div class="about-prose reveal">${prose}</div>
          <h3 class="col-title" style="margin-top:44px;">Education</h3>
          <div class="timeline-list">${edu}</div>
          <h3 class="col-title" style="margin-top:44px;">${esc(a.highlightsTitle)}</h3>
          <ul class="highlight-list">${highlights}</ul>
        </div>
      </div>
    </div>
  </section>`;
}

function sectionTpl(s) {
  const cols = s.columns ? `<div class="spread-cols">${s.columns.map(columnTpl).join("")}</div>` : "";
  const badge = s.badge
    ? `<div class="q-badge reveal">
         <div class="q-badge-icon">${esc(s.badge.icon)}</div>
         <div class="q-badge-text"><h3>${esc(s.badge.title)}</h3><p>${esc(s.badge.text)}</p></div>
       </div>`
    : "";
  const certs = s.certifications
    ? `<h3 class="col-title">${esc(s.certificationsTitle || "Certifications")}</h3>
       <div class="cert-grid">${s.certifications.map(
        (c) => `
        <div class="cert-row reveal">
          <div>
            <div class="cert-name">${esc(c.name)}</div>
            <div class="cert-issuer">${esc(c.issuer)}</div>
          </div>
          <a class="cert-link" href="${esc(c.link.href)}" target="_blank" rel="noopener">${esc(c.link.label)} →</a>
        </div>`
      ).join("")}</div>`
    : "";
  const more = s.moreList
    ? `<div class="more-block reveal">
         <h4 class="more-title">${esc(s.moreList.title)}</h4>
         <ul class="more-list">${s.moreList.items.map((i) => `<li><strong>${esc(i.strong)}</strong> ${esc(i.text)}</li>`).join("")}</ul>
       </div>`
    : "";
  const projects = s.projects ? `<h3 class="col-title">Selected Projects</h3>${projectsTpl(s.projects)}` : "";
  const resume = s.resume
    ? `<div class="spread-cta"><a href="${esc(s.resume.href)}" class="ed-link" download>${esc(s.resume.label)} <span class="arrow">↓</span></a></div>`
    : "";

  return `
  <section id="${esc(s.id)}" class="spread">
    <div class="spread-numeral" data-parallax="0.06" aria-hidden="true">${esc(s.number)}</div>
    <div class="container spread-content">
      <header class="spread-head reveal">
        <span class="spread-kicker">${esc(s.kicker)}</span>
        <h2 class="spread-title">${esc(s.title)}<br><em>${esc(s.titleEm)}</em></h2>
        ${s.sub ? `<p class="spread-sub">${esc(s.sub)}</p>` : ""}
      </header>
      ${badge}
      ${cols}
      ${certs}
      ${projects}
      ${more}
      ${resume}
    </div>
  </section>`;
}

function achievementsTpl(a) {
  const cats = a.categories.map(
    (cat) => `
    <div class="achiev-cat">
      <div class="achiev-cat-head reveal">
        <span class="achiev-cat-num">${esc(cat.num)}</span>
        <h3 class="achiev-cat-title">${esc(cat.title)}</h3>
      </div>
      <div class="achiev-grid">
        ${cat.items.map(
          (it) => `
          <div class="achiev-row reveal${it.featured ? " featured" : ""}">
            <span class="achiev-tag">${esc(it.tag)}</span>
            <h4 class="achiev-name">${it.nameEm ? `<em>${esc(it.name)}</em>` : esc(it.name)}</h4>
            <p class="achiev-desc">${esc(it.desc)}</p>
          </div>`
        ).join("")}
      </div>
    </div>`
  ).join("");

  return `
  <section id="achievements" class="spread">
    <div class="spread-numeral" data-parallax="0.06" aria-hidden="true">${esc(a.number)}</div>
    <div class="container spread-content">
      <header class="spread-head reveal">
        <span class="spread-kicker">${esc(a.kicker)}</span>
        <h2 class="spread-title">${esc(a.title)}<br><em>${esc(a.titleEm)}</em></h2>
        ${a.sub ? `<p class="spread-sub">${esc(a.sub)}</p>` : ""}
      </header>
      ${cats}
    </div>
  </section>`;
}

function contactTpl(c) {
  const info = c.info.map(
    (i) => `
    <div class="contact-row">
      <span class="label">${esc(i.label)}</span>
      <a class="value" href="${esc(i.href)}"${i.href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(i.value)}</a>
    </div>`
  ).join("");

  return `
  <section id="contact" class="spread">
    <div class="container spread-content">
      <header class="spread-head reveal">
        <span class="spread-kicker">${esc(c.kicker)}</span>
        <h2 class="spread-title">${esc(c.title)}<br><em>${esc(c.titleEm)}</em></h2>
      </header>
      <div class="letters-grid">
        <div class="reveal">
          <p class="contact-lead">${esc(c.lead)}</p>
          <div class="contact-info">${info}</div>
        </div>
        <form class="letter-form reveal" action="${esc(c.form.action)}" method="POST">
          <div class="letter-row"><label for="cf-name">From</label><input id="cf-name" name="name" type="text" placeholder="Your name" required></div>
          <div class="letter-row"><label for="cf-email">Email</label><input id="cf-email" name="email" type="email" placeholder="your@email.com" required></div>
          <div class="letter-row"><label for="cf-subject">Subject</label><input id="cf-subject" name="subject" type="text" placeholder="Research collaboration, internship…"></div>
          <div class="letter-row"><label for="cf-msg">Message</label><textarea id="cf-msg" name="message" placeholder="Tell me about your project or idea…" required></textarea></div>
          <div class="letter-submit"><button type="submit" class="btn-letter">${esc(c.form.submitLabel)}</button></div>
        </form>
      </div>
      <div class="contact-flourish">— ✦ —</div>
    </div>
  </section>`;
}

function footerTpl(f) {
  return `
    <div class="container">
      <div class="colophon-row">
        <div class="colophon-brand">${esc(f.brand)}</div>
        <div class="colophon-meta">${esc(f.meta)}</div>
      </div>
    </div>`;
}

/* ============================================================
   ASSEMBLE
   ============================================================ */
function render(d) {
  $("#masthead").innerHTML = navTpl(d);
  document.title = d.meta.title;

  const m = d.marquees || [];
  let html = heroTpl(d.hero);
  html += marqueeTpl(m[0] || "");
  html += aboutTpl(d.about);
  d.sections.forEach((s, i) => {
    html += marqueeTpl(m[(i + 1) % m.length] || "");
    html += sectionTpl(s);
  });
  html += marqueeTpl(m[m.length - 1] || "");
  html += achievementsTpl(d.achievements);
  html += contactTpl(d.contact);

  const app = $("#app");
  app.innerHTML = html;
  app.setAttribute("aria-busy", "false");
  $("#colophon").innerHTML = footerTpl(d.footer);

  // fix hero photo alt (template helper produced placeholder)
  const heroImg = $(".hero-photo img");
  if (heroImg) heroImg.alt = d.meta.name;
}

/* ============================================================
   INTERACTIONS
   ============================================================ */
function initNav() {
  const masthead = $("#masthead");
  const navList = $("#nav-list");
  const navToggle = $("#nav-toggle");
  const navLinks = $$(".nav-a");
  const backBtn = $("#back-to-top");
  const navH = 78;
  const sections = $$("section[id]");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      e.preventDefault();
      const target = href === "#home" ? document.body : document.querySelector(href);
      if (target) window.scrollTo({ top: (target.offsetTop || 0) - navH + 1, behavior: "smooth" });
      navList.classList.remove("active");
      navToggle.classList.remove("active");
      navToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    });
  });

  navToggle.addEventListener("click", () => {
    const open = navList.classList.toggle("active");
    navToggle.classList.toggle("active", open);
    navToggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
  });

  backBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  let ticking = false;
  function onScroll() {
    const y = window.scrollY;
    masthead.classList.toggle("scrolled", y > 30);
    backBtn.classList.toggle("show", y > 600);

    let current = "home";
    sections.forEach((s) => { if (y >= s.offsetTop - 120) current = s.id; });
    navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + current));

    // parallax
    $$("[data-parallax]").forEach((el) => {
      const speed = parseFloat(el.getAttribute("data-parallax")) || 0;
      el.style.transform = `translate3d(0, ${(y * speed).toFixed(1)}px, 0)`;
    });
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();
}

function initHoverPreview() {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  const hoverEl = $("#hover-img");
  const hoverImg = hoverEl.querySelector("img");
  const hoverCap = hoverEl.querySelector("figcaption");
  let tx = 0, ty = 0, cx = 0, cy = 0;

  $$("[data-img]").forEach((row) => {
    row.addEventListener("mouseenter", () => {
      const src = row.getAttribute("data-img");
      if (!src) return;
      hoverImg.src = src;
      hoverCap.textContent = row.getAttribute("data-caption") || "";
      hoverEl.classList.add("show");
    });
    row.addEventListener("mouseleave", () => hoverEl.classList.remove("show"));
  });

  document.addEventListener("mousemove", (e) => {
    tx = e.clientX + 28; ty = e.clientY - 120;
    const w = 340, h = 290;
    if (tx + w > window.innerWidth - 20) tx = e.clientX - w - 28;
    if (ty < 20) ty = 20;
    if (ty + h > window.innerHeight - 20) ty = window.innerHeight - h - 20;
  });
  (function lerp() {
    cx += (tx - cx) * 0.14; cy += (ty - cy) * 0.14;
    hoverEl.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(lerp);
  })();
}

/* ---- Animations ---- */
function initAnimations() {
  if (!MOTION_OK) {
    document.body.classList.add("is-revealed");
    return;
  }
  // Hero entrance
  const heroEls = $$("[data-hero]");
  if (heroEls.length) {
    animate(heroEls, { opacity: [0, 1], y: [30, 0] }, { duration: 0.9, delay: stagger(0.09, { start: 0.15 }), ease: EASE });
  }
  // Scroll reveals
  $$(".reveal").forEach((el) => {
    inView(el, () => {
      animate(el, { opacity: [0, 1], y: [28, 0] }, { duration: 0.7, ease: EASE });
      el.classList.add("in");
      return () => {};
    }, { amount: 0.15, margin: "0px 0px -8% 0px" });
  });
}

/* ---- Constellation canvas ---- */
function initConstellation() {
  const canvas = $("#constellation");
  if (!canvas || REDUCED) return;
  const ctx = canvas.getContext("2d");
  let w, h, nodes, raf;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * DPR; canvas.height = h * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const count = Math.min(90, Math.floor((w * h) / 16000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.6 + 0.6,
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < nodes.length; i++) {
      const p = nodes[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(160, 175, 255, 0.6)";
      ctx.fill();
      for (let j = i + 1; j < nodes.length; j++) {
        const q = nodes[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const dist = dx * dx + dy * dy;
        if (dist < 18000) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(120, 140, 255, ${0.16 * (1 - dist / 18000)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
    raf = requestAnimationFrame(tick);
  }

  resize();
  tick();
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 200); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else tick();
  });
}

function hideLoader() {
  const loader = $("#page-loader");
  if (loader) {
    loader.classList.add("hidden");
    setTimeout(() => loader.remove(), 700);
  }
}

/* ============================================================
   BOOT
   ============================================================ */
async function boot() {
  let data;
  try {
    const res = await fetch("content.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    data = await res.json();
  } catch (e) {
    console.error("Could not load content.json", e);
    $("#app").innerHTML =
      '<div style="max-width:640px;margin:160px auto;padding:0 24px;text-align:center;color:#c5c9d6;">' +
      '<h1 style="font-family:var(--ff-display);color:#f2f2f7;font-size:32px;margin-bottom:14px;">Content unavailable</h1>' +
      "<p>Could not load <code>content.json</code>. If you're viewing this from a file path, run a local server (e.g. <code>python -m http.server</code>) so fetch() can read the JSON.</p></div>";
    $("#app").setAttribute("aria-busy", "false");
    hideLoader();
    return;
  }

  render(data);
  initNav();
  initHoverPreview();
  initConstellation();
  initAnimations();
  hideLoader();
}

boot();
