// Customizable Nous Portal — content script (Chrome, Edge, Brave, Opera, Firefox).
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const ART = globalThis.NCP_ART;
  const byId = Object.fromEntries(ART.map((a) => [a.id, a]));
  const DEFAULTS = globalThis.NCP_DEFAULTS;

  let settings = { ...DEFAULTS };
  let randomPick = null; // chosen once per page visit

  const isPortalImg = (img) =>
    img.dataset.ncpOrig !== undefined ||
    /\/landing\/portal-art\./.test(img.getAttribute("src") || "") ||
    !!img.closest(".landing-portal-art");

  const findImgs = () =>
    [...document.querySelectorAll("#portal img, .landing-portal-art img")].filter(isPortalImg);

  const allowed = (id) => !(settings.noGirl && byId[id]?.girl);

  function resolveMode() {
    if (settings.mode !== "random") {
      // A Nous Girl pick with "No Nous Girl" on falls back to the original art.
      return allowed(settings.mode) ? settings.mode : "original";
    }
    if (!randomPick) {
      const ex = new Set(settings.randomExclude || []);
      const pool = ART.map((a) => a.id).filter((id) => allowed(id) && !ex.has(id));
      if (settings.custom && !ex.has("custom")) pool.push("custom");
      randomPick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : "original";
    }
    return randomPick;
  }

  function artUrl(mode) {
    if (mode === "custom") return settings.custom || null;
    if (byId[mode]) return api.runtime.getURL(`art/${mode}.webp`);
    return null;
  }

  let applying = false;
  function applyTo(img) {
    if (img.dataset.ncpOrig === undefined) {
      img.dataset.ncpOrig = img.getAttribute("src") || "";
      const ss = img.getAttribute("srcset");
      if (ss) img.dataset.ncpOrigSrcset = ss;
    }
    const mode = resolveMode();
    const url = artUrl(mode);
    applying = true;
    if (mode === "hidden") {
      img.dataset.ncpMode = "hidden";
    } else if (url) {
      img.dataset.ncpMode = "art";
      img.style.setProperty("--ncp-pos", mode === "custom" ? settings.customPos || "center" : (byId[mode]?.focus || "center"));
      img.removeAttribute("srcset");
      if (img.getAttribute("src") !== url) img.setAttribute("src", url);
    } else {
      // "original" (or custom chosen but nothing uploaded yet)
      img.dataset.ncpMode = "original";
      if (img.getAttribute("src") !== img.dataset.ncpOrig) img.setAttribute("src", img.dataset.ncpOrig);
      if (img.dataset.ncpOrigSrcset) img.setAttribute("srcset", img.dataset.ncpOrigSrcset);
    }
    applying = false;
  }

  function applyAll() {
    findImgs().forEach(applyTo);
    document.documentElement.setAttribute("data-ncp-ready", "");
  }

  // React/Next can re-render or reset src; re-apply when that happens.
  const observer = new MutationObserver((muts) => {
    if (applying) return;
    let hit = false;
    for (const m of muts) {
      if (m.type === "attributes") {
        const img = m.target;
        if (img.tagName === "IMG" && isPortalImg(img)) {
          // Site changed src itself: record the new original (e.g. new CDN hash).
          const src = img.getAttribute("src") || "";
          if (/\/landing\/portal-art\./.test(src)) img.dataset.ncpOrig = src;
          hit = true;
        }
      } else if (m.addedNodes.length) {
        hit = true;
      }
    }
    if (hit) applyAll();
  });

  function start() {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "srcset"],
    });
    applyAll();
  }

  // MV3 storage returns a Promise in both Chromium and Firefox.
  api.storage.local.get(DEFAULTS)
    .then((s) => { settings = { ...DEFAULTS, ...s }; })
    .catch(() => {})
    .finally(start);

  api.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const [k, v] of Object.entries(changes)) settings[k] = v.newValue ?? DEFAULTS[k];
    if (changes.mode || changes.custom || changes.noGirl || changes.randomExclude) randomPick = null;
    applyAll();
  });

  // Safety net: never leave the plate hidden if the portal section doesn't exist.
  setTimeout(() => document.documentElement.setAttribute("data-ncp-ready", ""), 4000);
})();
