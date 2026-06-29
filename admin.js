/* ============================================================
   CONTENT STUDIO — CMS for the Roshan Babu portfolio
   Generic recursive editor over content.json
   ============================================================ */

const $ = (s, c = document) => c.querySelector(s);
const LS_DRAFT = "cms_draft";
const LS_GH = "cms_gh";
const LS_GH_TOKEN = "cms_gh_token";

let model = {};
let dirty = false;

/* ---------- helpers ---------- */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function humanize(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bUrl\b/, "URL").replace(/\bCv\b/, "CV").replace(/\bCta\b/, "CTA");
}
const deepClone = (v) => JSON.parse(JSON.stringify(v));
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

let viewTimer;
function setDirty(v) {
  dirty = v;
  $("#dirty-dot").classList.toggle("show", v);
}
function changed() {
  setDirty(true);
  clearTimeout(viewTimer);
  viewTimer = setTimeout(updateJsonView, 150);
}
function updateJsonView() {
  try {
    $("#json-view").textContent = JSON.stringify(model, null, 2);
    $("#json-view").classList.remove("invalid");
  } catch (e) {
    $("#json-view").classList.add("invalid");
  }
}

/* ---------- field renderers ---------- */
function renderPrimitive(parent, key) {
  const value = parent[key];
  if (typeof value === "boolean") {
    const f = el("div", "field check");
    const input = el("input");
    input.type = "checkbox";
    input.checked = value;
    input.id = "f_" + Math.random().toString(36).slice(2);
    input.addEventListener("change", () => { parent[key] = input.checked; changed(); });
    const lbl = el("label", null, humanize(key));
    lbl.htmlFor = input.id;
    f.append(input, lbl);
    return f;
  }
  const f = el("div", "field");
  f.appendChild(el("label", null, humanize(key)));
  const isNum = typeof value === "number";
  const long = typeof value === "string" && (value.length > 70 || value.includes("\n"));
  const input = el(long ? "textarea" : "input");
  if (!long) input.type = isNum ? "number" : "text";
  input.value = value;
  input.addEventListener("input", () => {
    parent[key] = isNum ? (input.value === "" ? 0 : Number(input.value)) : input.value;
    changed();
  });
  f.appendChild(input);
  return f;
}

function renderObject(obj) {
  const frag = document.createDocumentFragment();
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (Array.isArray(val)) {
      frag.appendChild(renderArray(val, key));
    } else if (isObj(val)) {
      const node = el("div", "node nested");
      node.appendChild(el("span", "node-label", humanize(key)));
      node.appendChild(renderObject(val));
      frag.appendChild(node);
    } else {
      frag.appendChild(renderPrimitive(obj, key));
    }
  });
  return frag;
}

function newItem(arr) {
  if (arr.length) return deepClone(arr[arr.length - 1]);
  return "";
}

function renderArray(arr, key) {
  const wrap = el("div", "node nested");
  const label = el("span", "node-label");
  wrap.appendChild(label);
  const box = el("div", "array-items");
  wrap.appendChild(box);

  function setLabel() { label.textContent = `${humanize(key)} (${arr.length})`; }

  function rebuild() {
    box.innerHTML = "";
    arr.forEach((item, i) => box.appendChild(renderArrayItem(arr, i, rebuild)));
    setLabel();
  }

  const actions = el("div", "array-actions");
  const add = el("button", "btn small primary", "+ Add");
  add.type = "button";
  add.addEventListener("click", () => { arr.push(newItem(arr)); changed(); rebuild(); });
  actions.appendChild(add);
  wrap.appendChild(actions);

  rebuild();
  return wrap;
}

function renderArrayItem(arr, i, rebuild) {
  const item = arr[i];

  // primitive string/number item -> inline row
  if (!isObj(item) && !Array.isArray(item)) {
    const row = el("div", "array-item string-item");
    const isNum = typeof item === "number";
    const input = el("input");
    input.type = isNum ? "number" : "text";
    input.value = item;
    input.addEventListener("input", () => {
      arr[i] = isNum ? (input.value === "" ? 0 : Number(input.value)) : input.value;
      changed();
    });
    const rm = el("button", "btn small danger", "×");
    rm.type = "button";
    rm.title = "Remove";
    rm.addEventListener("click", () => { arr.splice(i, 1); changed(); rebuild(); });
    row.append(input, rm);
    return row;
  }

  // object (or nested array) item -> card
  const card = el("div", "array-item");
  const head = el("div", "item-head");
  // try a friendly title from common keys
  const titleKey = ["title", "name", "label", "dt", "role", "degree", "value"].find((k) => item && item[k]);
  head.appendChild(el("span", "item-idx", `# ${i + 1}${titleKey ? " · " + String(item[titleKey]).slice(0, 40) : ""}`));
  const rm = el("button", "btn small danger", "× Remove");
  rm.type = "button";
  rm.addEventListener("click", () => { arr.splice(i, 1); changed(); rebuild(); });
  head.appendChild(rm);
  card.appendChild(head);

  if (Array.isArray(item)) card.appendChild(renderArray(item, "items"));
  else card.appendChild(renderObject(item));
  return card;
}

/* ---------- top-level form ---------- */
function buildForm() {
  const root = $("#form");
  root.innerHTML = "";
  const openByDefault = ["meta", "nav", "hero"];
  Object.keys(model).forEach((key) => {
    const det = el("details", "group");
    if (openByDefault.includes(key)) det.open = true;
    const sum = el("summary", null, humanize(key));
    const count = el("span", "count");
    if (Array.isArray(model[key])) count.textContent = `${model[key].length} items`;
    sum.appendChild(count);
    det.appendChild(sum);

    const body = el("div", "group-body");
    const val = model[key];
    if (Array.isArray(val)) body.appendChild(renderArray(val, key));
    else if (isObj(val)) body.appendChild(renderObject(val));
    else body.appendChild(renderPrimitive(model, key));
    det.appendChild(body);
    root.appendChild(det);
  });
  updateJsonView();
}

/* ---------- data load / save ---------- */
async function loadFromServer() {
  const res = await fetch("content.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  model = await res.json();
  buildForm();
  setDirty(false);
  showStatus("Loaded content.json", "ok");
}

function setModel(obj) {
  model = obj;
  buildForm();
  setDirty(true);
}

function exportJson() {
  const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
  const a = el("a");
  a.href = URL.createObjectURL(blob);
  a.download = "content.json";
  a.click();
  URL.revokeObjectURL(a.href);
  showStatus("Downloaded content.json — commit it to your repo to publish.", "info");
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      setModel(JSON.parse(reader.result));
      showStatus("Imported " + file.name, "ok");
    } catch (e) {
      showStatus("Invalid JSON: " + e.message, "err");
    }
  };
  reader.readAsText(file);
}

/* ---------- GitHub publish ---------- */
function b64(str) { return btoa(unescape(encodeURIComponent(str))); }

function readGh() {
  return {
    owner: $("#gh-owner").value.trim(),
    repo: $("#gh-repo").value.trim(),
    branch: $("#gh-branch").value.trim() || "master",
    path: $("#gh-path").value.trim() || "content.json",
    token: $("#gh-token").value.trim(),
  };
}
function saveGhConfig() {
  const g = readGh();
  localStorage.setItem(LS_GH, JSON.stringify({ owner: g.owner, repo: g.repo, branch: g.branch, path: g.path }));
  if ($("#gh-remember").checked && g.token) localStorage.setItem(LS_GH_TOKEN, g.token);
  else localStorage.removeItem(LS_GH_TOKEN);
}
function loadGhConfig() {
  const cfg = JSON.parse(localStorage.getItem(LS_GH) || "{}");
  $("#gh-owner").value = cfg.owner || "roshan5619";
  $("#gh-repo").value = cfg.repo || "Portfolio";
  $("#gh-branch").value = cfg.branch || "master";
  $("#gh-path").value = cfg.path || "content.json";
  const tok = localStorage.getItem(LS_GH_TOKEN);
  if (tok) { $("#gh-token").value = tok; $("#gh-remember").checked = true; }
}

async function publish() {
  const g = readGh();
  if (!g.owner || !g.repo) return showStatus("Owner and repo are required.", "err");
  if (!g.token) return showStatus("A GitHub token is required to publish.", "err");
  saveGhConfig();

  const api = `https://api.github.com/repos/${g.owner}/${g.repo}/contents/${encodeURIComponent(g.path)}`;
  const headers = {
    Authorization: `Bearer ${g.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  showStatus("Publishing…", "info");
  try {
    // current sha (if file exists)
    let sha = null;
    const getRes = await fetch(`${api}?ref=${encodeURIComponent(g.branch)}`, { headers });
    if (getRes.ok) sha = (await getRes.json()).sha;
    else if (getRes.status !== 404) {
      const t = await getRes.text();
      throw new Error(`${getRes.status} ${getRes.statusText} — ${t.slice(0, 200)}`);
    }

    const body = {
      message: `CMS: update ${g.path}`,
      content: b64(JSON.stringify(model, null, 2)),
      branch: g.branch,
    };
    if (sha) body.sha = sha;

    const res = await fetch(api, { method: "PUT", headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`${res.status} ${res.statusText} — ${t.slice(0, 240)}`);
    }
    const j = await res.json();
    setDirty(false);
    const link = j.commit && j.commit.html_url ? ` <a href="${j.commit.html_url}" target="_blank" rel="noopener">View commit →</a>` : "";
    showStatus("Published! GitHub Pages will rebuild in ~1 min." + link, "ok", true);
  } catch (e) {
    showStatus("Publish failed: " + e.message, "err");
  }
}

/* ---------- status ---------- */
function showStatus(msg, type, html) {
  const s = $("#status");
  s.className = "status show " + (type || "info");
  if (html) s.innerHTML = msg; else s.textContent = msg;
}

/* ---------- wire up ---------- */
function init() {
  loadGhConfig();

  $("#btn-reload").addEventListener("click", async () => {
    if (dirty && !confirm("Discard unsaved changes and reload content.json?")) return;
    try { await loadFromServer(); } catch (e) { showStatus("Reload failed: " + e.message, "err"); }
  });
  $("#btn-import").addEventListener("click", () => $("#file-input").click());
  $("#file-input").addEventListener("change", (e) => { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ""; });
  $("#btn-export").addEventListener("click", exportJson);
  $("#btn-draft-save").addEventListener("click", () => {
    localStorage.setItem(LS_DRAFT, JSON.stringify(model));
    showStatus("Draft saved to this browser.", "ok");
  });
  $("#btn-draft-load").addEventListener("click", () => {
    const d = localStorage.getItem(LS_DRAFT);
    if (!d) return showStatus("No saved draft found.", "err");
    try { setModel(JSON.parse(d)); showStatus("Draft loaded.", "ok"); }
    catch (e) { showStatus("Draft is corrupt: " + e.message, "err"); }
  });
  $("#btn-clear-draft").addEventListener("click", () => {
    localStorage.removeItem(LS_DRAFT);
    showStatus("Saved draft cleared.", "info");
  });
  $("#btn-publish").addEventListener("click", publish);
  ["#gh-owner", "#gh-repo", "#gh-branch", "#gh-path", "#gh-remember"].forEach((s) =>
    $(s).addEventListener("change", saveGhConfig)
  );

  window.addEventListener("beforeunload", (e) => {
    if (dirty) { e.preventDefault(); e.returnValue = ""; }
  });

  loadFromServer().catch((e) => {
    showStatus("Could not load content.json (" + e.message + "). Run a local server, or Import a file.", "err");
    $("#form").innerHTML = '<p class="hint">No content loaded. Use <strong>Import</strong> to open a content.json file, or run a local server so it can be fetched.</p>';
  });
}

init();
