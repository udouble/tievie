
/* Tievie fixes (v3.33) — Streaming multi-select as DROPDOWN (portal to <body>), no overlay underflow
   - Single "Streaming ▾" next to Sorteren
   - Panel is appended to <body> and positioned near button (no clipping/underlay)
   - Vinkjes + Alles/Geen/Omkeren + "Alles behalve"
   - Persists in localStorage (tievie_stream_multi_v2)
   - Filters via app.filtered(); retries until app is ready
   - Hides legacy streaming <select> and removes duplicate injected buttons
*/
(function(){
  const ORDER = ["Streamz","Netflix","Prime Video","Apple TV+","VRT MAX","Go Play","NPO","Disney+","Onbekend"];
  const STKEY = "tievie_stream_multi_v2";
  const LABEL = v => v || "Onbekend";
  const NORM = (s)=>{
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
  const getState = ()=>{ try{return JSON.parse(localStorage.getItem(STKEY)||"{}")}catch(e){return{}} };
  const saveState = (x)=>{ try{localStorage.setItem(STKEY, JSON.stringify(x||{}))}catch(e){} };

  function patchFilterOnce(){
    if(typeof window.app!=="object" || typeof app.filtered!=="function") return false;
    if(app.__streamFilterPatched) return true;
    const orig = app.filtered.bind(app);
    app.filtered = function(){
      const out = orig();
      const st = getState();
      const sel = Array.isArray(st.selected)? st.selected : [];
      if(sel.length===0) return out;
      const mode = st.mode==="exclude" ? "exclude" : "include";
      return out.filter(it=>{
        const lab = LABEL(NORM(it.streamingOn));
        const hit = sel.includes(lab);
        return mode==="exclude" ? !hit : hit;
      });
    };
    app.__streamFilterPatched = true;
    return true;
  }
  function ensureFilterPatched(){
    if(patchFilterOnce()) return;
    let tries=0; const t=setInterval(()=>{tries++; if(patchFilterOnce()||tries>50) clearInterval(t);},100);
  }

  function hideLegacyStreaming(){
    document.querySelectorAll("select").forEach(s=>{
      const txt = Array.from(s.options).map(o=>o.textContent.trim().toLowerCase()).join("|");
      const looks = txt.includes("alle diensten") && txt.includes("netflix") && txt.includes("apple tv");
      if(looks){ s.style.display="none"; s.classList.add("tv-old-streaming-hidden"); }
    });
    // remove duplicates from older injections
    const btns = document.querySelectorAll("#tvStreamBtn");
    btns.forEach((b,i)=>{ if(i>0) b.remove(); });
  }

  function findToolbar(){
    // Prefer the container that holds the sort select
    const sortSel = Array.from(document.querySelectorAll("select")).find(s=>{
      const val = Array.from(s.options).map(o=>o.textContent).join(" ").toLowerCase();
      return val.includes("nummer") || val.includes("imdb");
    });
    if(sortSel) return sortSel.closest("div") || sortSel.parentElement;
    // Fallback near the in-app search box
    const q = document.querySelector('input[placeholder*="Zoek"][placeholder*="app"], input[placeholder*="Zoeken"], input[type="search"]');
    return q ? (q.closest("div") || q.parentElement) : document.body;
  }

  function ensureStyles(){
    if(document.getElementById("tvStreamCSS")) return;
    const css = `
      .tv-chip{margin-left:8px;background:rgba(125,211,252,.12);border:1px solid rgba(125,211,252,.35);color:#7dd3fc;border-radius:10px;padding:2px 8px;font-size:.8rem;display:none}
      .tv-chip.show{display:inline-block}
      .tv-portal{position:fixed; z-index:100000; background:#0b1020; color:#e5e7eb; border:1px solid rgba(148,163,184,.25);
        border-radius:12px; box-shadow:0 12px 36px rgba(0,0,0,.45); padding:10px; min-width:280px; max-width:360px; max-height:60vh; overflow:auto; display:none}
      .tv-portal.show{display:block}
      .tv-actions{display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap}
      .tv-actions button{background:#111827; color:#e5e7eb; border:1px solid rgba(148,163,184,.25); padding:.25rem .55rem; border-radius:8px; font-size:.85rem}
      .tv-list{display:grid; gap:6px}
      .tv-list label{display:flex; align-items:center; gap:8px; background:rgba(255,255,255,.05); padding:.35rem .5rem; border-radius:8px; border:1px solid rgba(255,255,255,.08)}
      .tv-row-end{display:flex; justify-content:flex-end; gap:8px; margin-top:8px}
    `;
    const st = document.createElement("style"); st.id="tvStreamCSS"; st.textContent = css; document.head.appendChild(st);
  }

  function renderChip(){
    const chip = document.getElementById("tvStreamChip");
    if(!chip) return;
    const st = getState(); const sel = Array.isArray(st.selected)? st.selected : [];
    chip.textContent = sel.length? (st.mode==="exclude"?"Alles behalve: ":"Streaming: ")+sel.join(", ") : "";
    chip.classList.toggle("show", sel.length>0);
  }

  let portal, btnRef;
  function buildUI(){
    const zone = findToolbar(); if(!zone) return;
    if(document.getElementById("tvStreamBtn")) return;

    ensureStyles();

    const btn = document.createElement("button");
    btn.id="tvStreamBtn"; btn.type="button";
    btn.className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow text-sm ml-2";
    btn.textContent="Streaming ▾";
    zone.appendChild(btn);
    btnRef = btn;

    const chip = document.createElement("span"); chip.id="tvStreamChip"; chip.className="tv-chip"; zone.appendChild(chip);

    portal = document.createElement("div"); portal.className="tv-portal"; portal.setAttribute("role","dialog");
    portal.innerHTML = `
      <div class="tv-actions">
        <button type="button" data-act="all">Alles</button>
        <button type="button" data-act="none">Geen</button>
        <button type="button" data-act="invert">Omkeren</button>
        <label style="display:flex;align-items:center;gap:8px;margin-left:auto">
          <input type="checkbox" id="tvModeExclude"> Alles behalve
        </label>
      </div>
      <div class="tv-list" id="tvList"></div>
      <div class="tv-row-end">
        <button type="button" id="tvClose">Sluiten</button>
        <button type="button" id="tvApply" style="background:#4f46e5;color:#fff;border:0;padding:.45rem .8rem;border-radius:10px">Toepassen</button>
      </div>`;
    document.body.appendChild(portal);

    // Populate list
    const list = portal.querySelector("#tvList");
    const st = getState();
    ORDER.forEach(name=>{
      const row = document.createElement("label");
      row.innerHTML = `<input type="checkbox" ${Array.isArray(st.selected)&&st.selected.includes(name)?"checked":""}> <span>${name}</span>`;
      list.appendChild(row);
    });
    portal.querySelector("#tvModeExclude").checked = (st.mode==="exclude");

    function positionPortal(){
      const r = btn.getBoundingClientRect();
      const top = r.bottom + 8;
      const left = Math.min(r.left, window.innerWidth - 340);
      portal.style.top = `${top}px`;
      portal.style.left = `${left}px`;
    }

    btn.addEventListener("click", ()=>{
      if(portal.classList.contains("show")){ portal.classList.remove("show"); return; }
      positionPortal();
      portal.classList.add("show");
    });
    window.addEventListener("resize", ()=>{ if(portal.classList.contains("show")) positionPortal(); });
    window.addEventListener("scroll", ()=>{ if(portal.classList.contains("show")) positionPortal(); }, true);

    document.addEventListener("click",(e)=>{
      if(!portal.contains(e.target) && e.target!==btn && !btn.contains(e.target)){
        portal.classList.remove("show");
      }
    });

    portal.addEventListener("click",(e)=>{
      const act = e.target?.getAttribute?.("data-act");
      if(act){
        const checks = portal.querySelectorAll('#tvList input[type="checkbox"]');
        if(act==="all"){ checks.forEach(c=>c.checked=true); }
        if(act==="none"){ checks.forEach(c=>c.checked=false); }
        if(act==="invert"){ checks.forEach(c=>c.checked=!c.checked); }
      }
      if(e.target?.id==="tvClose"){ portal.classList.remove("show"); }
      if(e.target?.id==="tvApply"){
        const picked=[]; portal.querySelectorAll('#tvList input[type="checkbox"]').forEach(c=>{ if(c.checked) picked.push(c.nextElementSibling.textContent.trim()); });
        const mode = portal.querySelector("#tvModeExclude").checked ? "exclude" : "include";
        saveState({selected:picked,mode});
        ensureFilterPatched();
        if(typeof app?.render==="function") app.render();
        portal.classList.remove("show");
        renderChip();
      }
    }, true);

    renderChip();
  }

  function init(){
    ensureFilterPatched();
    hideLegacyStreaming();
    buildUI();
  }
  if(document.readyState==="loading"){ document.addEventListener("DOMContentLoaded", init); } else { init(); }
})();
