// Customizable Nous Portal — popup
const api = globalThis.browser ?? globalThis.chrome;
const ART = globalThis.NCP_ART;
const DEFAULTS = globalThis.NCP_DEFAULTS;
const girlIds = new Set(ART.filter((a) => a.girl).map((a) => a.id));
const OUT_W = 2304, OUT_H = 768; // 3:1, sharp on 2x screens

const $ = (s) => document.querySelector(s);
const status = (msg, err = false) => { const el = $("#status"); el.textContent = msg; el.classList.toggle("err", err); };
async function load() { return { ...DEFAULTS, ...(await api.storage.local.get(DEFAULTS)) }; }

// Build built-in art tiles from the catalog.
for (const a of ART) {
  const d = document.createElement("div");
  d.className = "choice"; d.dataset.mode = a.id; d.setAttribute("role", "button"); d.tabIndex = 0;
  const img = document.createElement("img"); img.src = `art/${a.id}_thumb.webp`; img.alt = "";
  const label = document.createElement("span"); label.textContent = a.label;
  const dice = document.createElement("button"); dice.className = "dice"; dice.title = "Include in Random"; dice.textContent = "🎲"; dice.dataset.id = a.id;
  d.append(img, label, dice);
  $("#art").appendChild(d);
}

function render(s) {
  $("#noGirl").checked = !!s.noGirl;
  const ex = new Set(s.randomExclude || []);
  document.querySelectorAll(".choice").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === s.mode);
    b.hidden = !!s.noGirl && girlIds.has(b.dataset.mode);
  });
  document.querySelectorAll(".dice").forEach((d) => d.classList.toggle("on", !ex.has(d.dataset.id)));
  const t = $("#customThumb");
  if (s.custom) { t.textContent = ""; t.style.backgroundImage = `url("${s.custom}")`; t.style.backgroundPosition = s.customPos; }
  else { t.textContent = "No image yet"; t.style.backgroundImage = ""; }
  $("#pos").value = s.customPos || "center";
}

// Scale + crop an uploaded image to a 3:1 WebP so storage stays small.
function toBanner(file, pos) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = OUT_W; c.height = OUT_H;
      const ctx = c.getContext("2d");
      const scale = Math.max(OUT_W / img.width, OUT_H / img.height);
      const w = img.width * scale, h = img.height * scale;
      let x = (OUT_W - w) / 2, y = (OUT_H - h) / 2;
      if (pos === "top") y = 0; if (pos === "bottom") y = OUT_H - h;
      if (pos === "left") x = 0; if (pos === "right") x = OUT_W - w;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, x, y, w, h);
      URL.revokeObjectURL(url);
      let data = c.toDataURL("image/webp", 0.9);
      if (!data.startsWith("data:image/webp")) data = c.toDataURL("image/jpeg", 0.9);
      resolve(data);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that image.")); };
    img.src = url;
  });
}

let lastFile = null;

document.addEventListener("DOMContentLoaded", async () => {
  let s = await load(); render(s);
  const save = async (patch, msg) => { await api.storage.local.set(patch); s = await load(); render(s); if (msg) status(msg); };

  document.body.addEventListener("click", async (e) => {
    const dice = e.target.closest(".dice");
    if (dice) {
      e.stopPropagation();
      const ex = new Set(s.randomExclude || []);
      ex.has(dice.dataset.id) ? ex.delete(dice.dataset.id) : ex.add(dice.dataset.id);
      await save({ randomExclude: [...ex] }, ex.has(dice.dataset.id) ? "Left out of Random." : "Included in Random.");
      return;
    }
    const b = e.target.closest(".choice"); if (!b) return;
    const mode = b.dataset.mode;
    if (mode === "custom" && !s.custom) { $("#file").click(); return; }
    await save({ mode }, mode === "random" ? "Random: a new pick from your 🎲 tiles every page load." : "Applied.");
  });

  $("#noGirl").addEventListener("change", async (e) => {
    const noGirl = e.target.checked;
    const patch = { noGirl };
    if (noGirl && girlIds.has(s.mode)) patch.mode = ART.find((a) => !a.girl).id;
    await save(patch, noGirl ? "Nous Girl art hidden." : "Nous Girl art is back.");
  });

  $("#file").addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) return;
    lastFile = f;
    try {
      status("Processing…");
      const custom = await toBanner(f, $("#pos").value);
      await save({ custom, mode: "custom", customPos: "center" }, "Your image is live on the portal.");
    } catch (err) { status(err.message, true); }
    e.target.value = "";
  });

  // Re-crop the last uploaded file this session; otherwise shift the stored banner's focus.
  $("#pos").addEventListener("change", async (e) => {
    const pos = e.target.value;
    if (lastFile) await save({ custom: await toBanner(lastFile, pos), customPos: "center" });
    else await save({ customPos: pos });
    $("#pos").value = pos; status("Crop updated.");
  });

  $("#clear").addEventListener("click", async () => {
    lastFile = null;
    await save({ custom: null, mode: s.mode === "custom" ? DEFAULTS.mode : s.mode }, "Custom image removed.");
  });
});
