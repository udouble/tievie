
/* Tievie fixes (overlay multi-select) — single Streaming control as true overlay
   - z-index 999999
   - persists selection in localStorage("tievie_stream_multi_v2")
   - filters via app.filtered() wrapper; rest untouched
*/
(function(){
  const VERSION_LABEL = "overlay-checked";
  // show a tiny watermark in the version pill if the app exposes it
  try {
    const tag = document.createElement("span");
    tag.textContent = " • overlay";
    tag.style.fontStyle = "italic";
    tag.style.opacity = "0.75";
    setTimeout(()=>{
      const pill = document.querySelector('[data-version-pill], .version-pill, .fixed.bottom-4.right-4, .version-badge');
      if(pill && !pill.__overlayTagged){ pill.appendChild(tag); pill.__overlayTagged = true; }
    }, 1200);
  } catch(e){}

  const ORDER = ["Streamz","Netflix","Prime Video","Apple TV+","VRT MAX","Go Play","NPO","Disney+","Onbekend"];
  const NORMALIZE = (s) => {
    if(!s) return "";
    s = (""+s).trim().toLowerCase();
    if(s.startsWith("appl")) return "Apple TV+";
    if(s.startsWith("netf")) return "Netflix";
    if(s.startsWith("prim")) return "Prime Video";
    if(s.startsWith("vrt"))  return "VRT MAX";
    if(s.startsWith("vtm"))  return "VTM Go";
    if(s.includes("play"))   return "Go Play";
    if(s.startsWith("np"))   return "NPO";
    if(s.startsWith("strea"))return "Streamz";
    if(s.startsWith("disn")) return "Disney+";
    return "";
  };
  const LABEL = v => v || "Onbekend";
  const STKEY = "tievie_stream_multi_v2";

  function getState(){
    try{ return JSON.parse(localStorage.getItem(STKEY) || "{}"); }catch(e){}
    return {};
  }
  function saveState(st){
    try{ localStorage.setItem(STKEY, JSON.stringify(st || {})); }catch(e){}
  }

  function ensureFilterPatch(){
    if(typeof window.app!=="object") return;
    if(app.__streamFilterPatched) return;
    if(typeof app.filtered!=="function") return;

    const orig = app.filtered.bind(app);
    app.filtered = function(){
      let arr = orig();
      const st = getState();
      const mode = st.mode || "include";
      const sel = Array.isArray(st.selected)? st.selected : [];
      if(sel.length===0) return arr;
      if(mode==="exclude"){
        return arr.filter(it => !sel.includes(LABEL(NORMALIZE(it.streamingOn))));
      }else{
        return arr.filter(it => sel.includes(LABEL(NORMALIZE(it.streamingOn))));
      }
    };
    app.__streamFilterPatched = true;
  }

  function hideOldStreamingSelects(){
    const selects = Array.from(document.querySelectorAll("select"));
    selects.forEach(s=>{
      const txt = Array.from(s.options).map(o=>o.textContent.trim().toLowerCase()).join("|");
      const looksLikeStreaming = txt.includes("alle diensten") && txt.includes("netflix") && txt.includes("apple tv");
      if(looksLikeStreaming){ s.style.display = "none"; s.classList.add("tv-old-streaming-hidden"); }
    });
  }

  function findToolbar(){
    // Heuristiek: zoek de buurt van de ‘Sorteren’-select of de eerste grote rij boven de zoek-balk
    let el = Array.from(document.querySelectorAll("select")).find(s=>{
      const val = Array.from(s.options).map(o=>o.textContent).join(" ").toLowerCase();
      return val.includes("nummer") || val.includes("imdb");
    });
    if(el) return el.closest("div");
    // fallback: eerste container boven de globale zoek input
    const search = document.querySelector('input[placeholder*="Zoek"][placeholder*="app"], input[placeholder*="Zoeken"], input[type="search"]');
    return search ? search.closest("div") : document.body;
  }

  function renderChip(){
    const chip = document.getElementById("tvStreamChip");
    if(!chip) return;
    const st = getState();
    const sel = Array.isArray(st.selected)? st.selected : [];
    if(sel.length===0){ chip.textContent = ""; return; }
    chip.textContent = (st.mode==="exclude" ? "Alles behalve: " : "Streaming: ") + sel.join(", ");
  }

  function buildOverlayButton(){
    const zone = findToolbar();
    if(!zone) return;
    if(document.getElementById("tvStreamBtn")) return;

    const btn = document.createElement("button");
    btn.id = "tvStreamBtn";
    btn.type = "button";
    btn.className = "px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow text-sm ml-2";
    btn.textContent = "Streaming ▾";
    zone.appendChild(btn);

    const chip = document.createElement("span");
    chip.id = "tvStreamChip";
    chip.className = "ml-2 text-sky-300 text-sm italic";
    zone.appendChild(chip);

    btn.addEventListener("click", openOverlay);
    renderChip();
  }

  function openOverlay(){
    if(document.getElementById("tvStreamModal")) return;

    const st = getState();
    const selected = new Set(Array.isArray(st.selected)? st.selected : []);

    const wrap = document.createElement("div");
    wrap.id = "tvStreamModal";
    wrap.innerHTML = `
      <div class="tv-modal-backdrop"></div>
      <div class="tv-modal" role="dialog" aria-modal="true" aria-label="Filter op streaming">
        <div class="tv-modal-head">
          <h3>Filter op streaming</h3>
          <button type="button" id="tvClose" aria-label="Sluiten">×</button>
        </div>
        <div class="tv-modal-body">
          <div class="tv-actions">
            <button type="button" data-act="all">Alles</button>
            <button type="button" data-act="none">Geen</button>
            <button type="button" data-act="invert">Omkeren</button>
            <label class="tv-ex">
              <input type="checkbox" id="tvModeExclude"> Alles behalve
            </label>
          </div>
          <div class="tv-grid" id="tvList"></div>
        </div>
        <div class="tv-modal-foot">
          <button type="button" id="tvCancel">Annuleer</button>
          <button type="button" id="tvApply" class="tv-apply">Toepassen</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    const css = `
    #tvStreamModal{position:fixed; inset:0; z-index:999999; display:flex; align-items:center; justify-content:center}
    .tv-modal-backdrop{position:absolute; inset:0; background:rgba(0,0,0,.55); backdrop-filter:saturate(120%) blur(2px)}
    .tv-modal{
      position:relative; width:min(560px, 92vw); max-height:82vh;
      background:#0b1020; color:#e5e7eb; border:1px solid rgba(148,163,184,.25);
      border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,.6); overflow:hidden; display:flex; flex-direction:column;
    }
    .tv-modal-head{display:flex; align-items:center; justify-content:space-between; padding:14px 16px; background:linear-gradient(180deg,#111827,#0b1020)}
    .tv-modal-head h3{margin:0; font-size:1rem}
    .tv-modal-head button{background:transparent; border:0; color:#e5e7eb; font-size:1.25rem; line-height:1}
    .tv-modal-body{padding:12px 16px; overflow:auto}
    .tv-actions{display:flex; gap:8px; align-items:center; margin-bottom:10px; flex-wrap:wrap}
    .tv-actions button{background:#111827; color:#e5e7eb; border:1px solid rgba(148,163,184,.25); padding:.35rem .6rem; border-radius:10px; font-size:.9rem}
    .tv-ex{margin-left:auto; display:flex; align-items:center; gap:8px; font-size:.9rem}
    .tv-grid{display:grid; grid-template-columns:1fr 1fr; gap:8px}
    .tv-grid label{display:flex; align-items:center; gap:10px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); border-radius:10px; padding:.45rem .6rem}
    .tv-modal-foot{padding:12px 16px; display:flex; justify-content:flex-end; gap:10px; background:linear-gradient(180deg,#0b1020,#0a0f1a)}
    .tv-modal-foot .tv-apply{background:#4f46e5; color:#fff; border:0; padding:.5rem .9rem; border-radius:10px}
    `;
    const stl = document.createElement("style"); stl.textContent = css; document.head.appendChild(stl);

    const list = wrap.querySelector("#tvList");
    ORDER.forEach(name=>{
      const row = document.createElement("label");
      row.innerHTML = `<input type="checkbox" ${selected.has(name)?"checked":""}> <span>${name}</span>`;
      list.appendChild(row);
    });
    wrap.querySelector("#tvModeExclude").checked = (st.mode==="exclude");

    wrap.addEventListener("click", (e)=>{
      if(e.target.id==="tvClose" || e.target.id==="tvCancel" || e.target.classList.contains("tv-modal-backdrop")){
        wrap.remove();
      }
      const act = e.target?.getAttribute?.("data-act");
      if(act){
        const checks = wrap.querySelectorAll('#tvList input[type="checkbox"]');
        if(act==="all"){ checks.forEach(c=>c.checked=true); }
        if(act==="none"){ checks.forEach(c=>c.checked=false); }
        if(act==="invert"){ checks.forEach(c=>c.checked=!c.checked); }
      }
      if(e.target?.id==="tvApply"){
        const picked = [];
        wrap.querySelectorAll('#tvList input[type="checkbox"]').forEach(c=>{
          if(c.checked){ picked.push(c.nextElementSibling.textContent.trim()); }
        });
        const mode = wrap.querySelector("#tvModeExclude").checked ? "exclude" : "include";
        saveState({ selected:picked, mode });
        wrap.remove();
        renderChip();
        if(typeof app?.render==="function") app.render();
      }
    }, true);
  }

  function init(){
    ensureFilterPatch();
    hideOldStreamingSelects();
    buildOverlayButton();
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
