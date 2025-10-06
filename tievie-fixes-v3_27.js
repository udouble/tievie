
/* === Tievie fixes (v3.27 -> upgraded body, multi-select streaming inline) ===
   v3.31d logic: Streaming multi-select with checkboxes (inline dropdown next to “Sorteren”).
   Safe drop-in: you may upload this as tievie-fixes-v3_27.js (no index.html edits needed).
*/
(function(){
  const ORDER = ["Streamz","Netflix","Prime Video","Apple TV+","VRT MAX","Go Play","NPO","Disney+","Onbekend"];
  const normalize = (s) => {
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
  const toLabel = v => v || "Onbekend";

  const css = `
    .tv-stream-wrap{position:relative;display:inline-block;margin-left:.5rem}
    .tv-stream-panel{
      position:absolute; left:0; top:calc(100% + 6px);
      min-width:280px; max-width:360px; max-height:300px;
      overflow:auto;
      background:#0b1020; color:#e5e7eb;
      border:1px solid rgba(148,163,184,.25);
      border-radius:12px; box-shadow:0 12px 36px rgba(0,0,0,.45);
      padding:10px; z-index:10060; display:none;
    }
    .tv-stream-panel.show{display:block}
    .tv-stream-panel h4{margin:.2rem 0 .5rem 0;font-size:.95rem}
    .tv-stream-actions{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap}
    .tv-stream-actions button{
      background:#111827; color:#e5e7eb; border:1px solid rgba(148,163,184,.25);
      padding:.25rem .55rem; border-radius:8px; font-size:.85rem;
    }
    .tv-stream-list{display:grid; gap:6px}
    .tv-stream-list label{
      display:flex; align-items:center; gap:8px;
      background:rgba(255,255,255,.04);
      padding:.35rem .5rem; border-radius:8px;
      border:1px solid rgba(255,255,255,.06);
    }
    .tv-chip{margin-left:8px; background:rgba(125,211,252,.12); border:1px solid rgba(125,211,252,.35);
      color:#7dd3fc; border-radius:10px; padding:2px 8px; font-size:.8rem; display:none}
    .tv-chip.show{display:inline-block}
    .tv-row-end{display:flex; justify-content:flex-end; gap:8px; margin-top:8px}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  function ensureState(){
    window.app = window.app || {};
    app.state = app.state || {};
    try{
      const raw = localStorage.getItem("tievie_stream_multi");
      if(raw) app.state.streamSel = JSON.parse(raw);
    }catch(e){}
    if(!app.state.streamSel) app.state.streamSel = { mode:"include", selected:[] };
  }
  function saveState(){ try{ localStorage.setItem("tievie_stream_multi", JSON.stringify(app.state.streamSel)); }catch(e){} }

  function patchFilter(){
    if(typeof app.filtered === "function" && !app.__streamMultiPatched){
      const orig = app.filtered.bind(app);
      app.filtered = function(){
        let arr = orig();
        const sel = app.state.streamSel || {mode:"include", selected:[]};
        const picked = sel.selected || [];
        if(picked.length===0) return arr; // no filter
        if(sel.mode==="exclude"){
          return arr.filter(it => !picked.includes(toLabel(normalize(it.streamingOn))));
        }else{
          return arr.filter(it => picked.includes(toLabel(normalize(it.streamingOn))));
        }
      };
      app.__streamMultiPatched = true;
    }
  }

  function findStreamingSelect(){
    const selects = Array.from(document.querySelectorAll("select"));
    for(const s of selects){
      const txt = Array.from(s.options).map(o=>o.textContent.trim()).join("|").toLowerCase();
      if(txt.includes("alle diensten") && txt.includes("netflix") && txt.includes("apple tv")) return s;
    }
    return null;
  }

  function buildInlineDropdown(anchor){
    const parent = anchor?.parentElement;
    if(!parent) return;

    // Hide original select
    anchor.style.display = "none";

    const wrap = document.createElement("span");
    wrap.className = "tv-stream-wrap";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow text-sm";
    btn.textContent = "Streaming ▾";
    wrap.appendChild(btn);

    const panel = document.createElement("div");
    panel.className = "tv-stream-panel";
    panel.innerHTML = `
      <h4>Filter op streaming</h4>
      <div class="tv-stream-actions">
        <button type="button" data-act="all">Alles</button>
        <button type="button" data-act="none">Geen</button>
        <button type="button" data-act="invert">Omkeren</button>
        <label style="display:flex;align-items:center;gap:8px;margin-left:auto">
          <input type="checkbox" id="modeExclude"> Alles behalve
        </label>
      </div>
      <div class="tv-stream-list" id="streamList"></div>
      <div class="tv-row-end">
        <button type="button" id="streamClose">Sluiten</button>
        <button type="button" id="streamApply" style="background:#4f46e5;color:#fff;border:0;padding:.45rem .8rem;border-radius:10px">Toepassen</button>
      </div>
    `;
    wrap.appendChild(panel);

    if(anchor.nextSibling){
      parent.insertBefore(wrap, anchor.nextSibling);
    } else {
      parent.appendChild(wrap);
    }

    let chip = document.getElementById("streamingChip");
    if(!chip){
      chip = document.createElement("span");
      chip.id = "streamingChip";
      chip.className = "tv-chip";
      wrap.appendChild(chip);
    }

    const list = panel.querySelector("#streamList");
    const modeExclude = panel.querySelector("#modeExclude");

    function labelText(sel){
      if(!sel || !sel.selected || sel.selected.length===0) return "";
      const prefix = (sel.mode==="exclude") ? "Alles behalve: " : "Streaming: ";
      return prefix + sel.selected.join(", ");
    }
    function rebuild(){
      list.innerHTML = "";
      ORDER.forEach(name=>{
        const row = document.createElement("label");
        const id = "chk_"+name.replace(/\W+/g,"");
        row.innerHTML = `<input type="checkbox" id="${id}"> <span>${name}</span>`;
        const inp = row.querySelector("input");
        inp.checked = (app.state.streamSel.selected||[]).includes(name);
        list.appendChild(row);
      });
      modeExclude.checked = (app.state.streamSel.mode==="exclude");
      const txt = labelText(app.state.streamSel);
      chip.textContent = txt;
      chip.classList.toggle("show", !!txt);
    }
    rebuild();

    btn.addEventListener("click", ()=> panel.classList.toggle("show"));
    document.addEventListener("click", (e)=>{ if(!wrap.contains(e.target)) panel.classList.remove("show"); });
    panel.querySelector("#streamClose").addEventListener("click", ()=> panel.classList.remove("show"));

    panel.addEventListener("click", (e)=>{
      const act = e.target?.getAttribute?.("data-act");
      if(!act) return;
      let cur = new Set(app.state.streamSel.selected || []);
      if(act==="all"){ ORDER.forEach(n=>cur.add(n)); }
      if(act==="none"){ cur.clear(); }
      if(act==="invert"){
        const next = new Set();
        ORDER.forEach(n=>{ if(!cur.has(n)) next.add(n); });
        cur = next;
      }
      app.state.streamSel.selected = Array.from(cur);
      rebuild();
    });

    panel.querySelector("#streamApply").addEventListener("click", ()=>{
      const picked = [];
      list.querySelectorAll('input[type="checkbox"]').forEach(inp=>{
        if(inp.checked){
          const label = inp.nextElementSibling?.textContent?.trim();
          if(label) picked.push(label);
        }
      });
      app.state.streamSel.selected = picked;
      app.state.streamSel.mode = modeExclude.checked ? "exclude" : "include";
      saveState();
      panel.classList.remove("show");
      if(typeof app.render==="function") app.render();
      rebuild();
    });
  }

  function init(){
    ensureState();
    patchFilter();
    const anchor = findStreamingSelect();
    if(anchor && !window.__tvStreamDropdownMounted){
      buildInlineDropdown(anchor);
      window.__tvStreamDropdownMounted = true;
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
/* === end inline multi-select === */
