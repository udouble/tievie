
/* tievie-fixes.js — drop-in (v3.38.1 hotfix)
   - Fix: filter only direct children of #list (prevents vanishing posters)
   - Fix: robust streaming detection (select value OR data attributes OR text hints)
   - Behavior: filtering happens only after pressing "Toepassen" (no auto-hide)
*/
(function(){
  const VERSION_BADGE = "v3.38.1 — multi-select + IMDb edit (hotfix)";
  const STORAGE_KEY = "tievie_stream_multi_v7";
  const SERVICES = ["Streamz","Netflix","Prime Video","Apple TV+","VRT MAX","Go Play","NPO","Disney+","Onbekend"];

  function ready(fn){ if(document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }

  function ensureBadge(){
    try {
      const old = document.getElementById("verBadge");
      if (old) old.remove();
      const b = document.createElement("div");
      b.id = "verBadge"; b.textContent = VERSION_BADGE;
      Object.assign(b.style, {position:"fixed",right:"12px",bottom:"12px",padding:"6px 10px",borderRadius:"10px",
        background:"rgba(20,60,120,.92)",color:"#fff",font:"12px/1.1 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial",zIndex:"999999"});
      document.body.appendChild(b);
    } catch(e){}
  }

  function normService(s){
    if(!s) return "Onbekend";
    const t = String(s).trim().toLowerCase();
    if(t.startsWith("appl")) return "Apple TV+";
    if(t.startsWith("netf")) return "Netflix";
    if(t.includes("play")) return "Go Play";
    if(t.startsWith("vrt")) return "VRT MAX";
    if(t.startsWith("prim")) return "Prime Video";
    if(t.startsWith("strea")) return "Streamz";
    if(t.startsWith("np")) return "NPO";
    if(t.startsWith("disn")) return "Disney+";
    return "Onbekend";
  }

  const store = {
    get(){ try{const a=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); return Array.isArray(a)?a:[];}catch{return []} },
    set(a){ localStorage.setItem(STORAGE_KEY, JSON.stringify(a||[])); }
  };

  function attachMultiDropdown(){
    if(document.getElementById("streaming-multi-wrap")) return;
    const host = document.querySelector('#filterControls') || document.querySelector('.filters') || document.querySelector('header') || document.body;

    const wrap = document.createElement('div');
    wrap.id="streaming-multi-wrap"; wrap.style.display="inline-block"; wrap.style.position="relative"; wrap.style.marginLeft="12px";

    const button = document.createElement('button');
    button.type="button"; button.id="streamBtn"; button.setAttribute("aria-haspopup","listbox"); button.setAttribute("aria-expanded","false");
    button.textContent="Streaming: Alle diensten";
    Object.assign(button.style,{padding:"8px 12px",borderRadius:"10px",border:"1px solid rgba(15,23,42,.15)",background:"rgba(255,255,255,.9)",color:"#0f172a"});

    const panel = document.createElement('div');
    panel.id="streamPanel";
    Object.assign(panel.style,{position:"absolute",left:"0",top:"100%",marginTop:"6px",minWidth:"240px",padding:"10px",
      borderRadius:"10px",border:"1px solid rgba(15,23,42,.12)",background:"#fff",color:"#0f172a",
      boxShadow:"0 14px 44px rgba(0,0,0,.25)",zIndex:"100000",display:"none"});

    const list = document.createElement('div'); list.style.maxHeight="260px"; list.style.overflow="auto"; list.style.padding="2px";
    SERVICES.forEach(s=>{
      const lab=document.createElement('label');
      Object.assign(lab.style,{display:"flex",alignItems:"center",gap:"8px",padding:"6px",borderRadius:"8px",cursor:"pointer"});
      lab.addEventListener('mouseenter',()=>lab.style.background="#f1f5f9");
      lab.addEventListener('mouseleave',()=>lab.style.background="");
      const cb=document.createElement('input'); cb.type="checkbox"; cb.value=s;
      const sp=document.createElement('span'); sp.textContent=s;
      lab.append(cb,sp); list.appendChild(lab);
    });

    const foot=document.createElement('div');
    Object.assign(foot.style,{display:"flex",justifyContent:"flex-end",gap:"8px",marginTop:"6px",borderTop:"1px dashed rgba(15,23,42,.15)",paddingTop:"6px"});
    const clear=document.createElement('button'); clear.type="button"; clear.textContent="Alles leeg";
    const apply=document.createElement('button'); apply.type="button"; apply.textContent="Toepassen";
    const btnLike=(el)=>Object.assign(el.style,{padding:"6px 10px",borderRadius:"8px",border:"1px solid rgba(15,23,42,.15)",background:"#f8fafc",color:"#0f172a"});
    btnLike(clear); Object.assign(apply.style,{padding:"6px 10px",borderRadius:"8px",border:"1px solid rgba(79,70,229,.3)",background:"#4f46e5",color:"#fff"});
    foot.append(clear,apply);

    panel.append(list,foot); wrap.append(button,panel);
    host.appendChild(wrap);

    // restore
    const selected=new Set(store.get());
    list.querySelectorAll('input[type=checkbox]').forEach(cb=>cb.checked=selected.has(cb.value));
    updateBtn(button,selected);

    button.addEventListener('click', (e)=>{
      e.stopPropagation();
      const open = panel.style.display==="block";
      panel.style.display = open? "none":"block";
      button.setAttribute("aria-expanded", String(!open));
    });
    document.addEventListener('click', (e)=>{
      if(!panel.contains(e.target) && !button.contains(e.target)){
        panel.style.display="none"; button.setAttribute("aria-expanded","false");
      }
    }, true);

    clear.addEventListener('click', ()=> list.querySelectorAll('input[type=checkbox]').forEach(c=>c.checked=false));
    apply.addEventListener('click', ()=>{
      const chosen = Array.from(list.querySelectorAll('input[type=checkbox]:checked')).map(cb=>cb.value);
      store.set(chosen);
      updateBtn(button,new Set(chosen));
      panel.style.display="none"; button.setAttribute("aria-expanded","false");
      applyStreamFilter(); // Only filter on apply
    });
  }

  function updateBtn(btn,set){ const arr=Array.from(set||[]); btn.textContent="Streaming: "+(arr.length?arr.join(", "):"Alle diensten"); }

  function detectStreamingForCard(el){
    // 1) explicit select
    const sel = el.querySelector('select.streaming-service-select');
    if (sel) return normService(sel.value);
    // 2) attribute
    const ds = el.getAttribute('data-streaming') || el.getAttribute('data-streaming-on');
    if (ds) return normService(ds);
    // 3) tag text nearby
    const txt = (el.textContent||"");
    const m = /(Streamz|Netflix|Prime Video|Apple TV\+|VRT MAX|Go Play|NPO|Disney\+)/i.exec(txt);
    if (m) return normService(m[1]);
    return "Onbekend";
  }

  function applyStreamFilter(){
    const chosen = new Set(store.get());
    const parent = document.getElementById('list');
    if (!parent) return;
    const rows = Array.from(parent.children); // only direct cards
    rows.forEach(card=>{
      const norm = detectStreamingForCard(card);
      const show = (chosen.size===0) ? true : chosen.has(norm);
      card.style.display = show ? "" : "none";
    });
    const cnt = document.getElementById('countBadge');
    if (cnt) cnt.textContent = rows.filter(n=>n.style.display!=='none').length + " items";
  }

  function enableImdbInlineEdit(){
    const parent = document.getElementById('list'); if(!parent) return;
    const rows = Array.from(parent.children);
    rows.forEach(card=>{
      if (card.dataset.imdbEnhanced==="1") return;
      const existing = card.querySelector('.imdb-rating-input');
      if (existing){ card.dataset.imdbEnhanced="1"; return; }

      const labelNode = Array.from(card.querySelectorAll('p,div,span,label'))
        .find(n => /imdb/i.test(n.textContent||"") && /score|imdb/i.test(n.textContent||""));
      if (!labelNode) return;

      const container=document.createElement('div');
      container.style.display="flex"; container.style.alignItems="center"; container.style.gap="8px";
      const lab=document.createElement('span'); lab.textContent="IMDb:"; lab.style.fontWeight="600";
      const inp=document.createElement('input'); inp.className="imdb-inline"; inp.placeholder="N/B";
      Object.assign(inp.style,{width:"70px",padding:"4px 6px",border:"1px solid rgba(15,23,42,.2)",borderRadius:"8px",background:"rgba(255,255,255,.9)",color:"#0f172a"});
      const m=(labelNode.textContent||"").match(/([0-9]+(?:\.[0-9]+)?)/); if(m) inp.value=m[1];
      container.append(lab,inp); labelNode.replaceWith(container); card.dataset.imdbEnhanced="1";

      function save(val){
        try{
          const id = card.getAttribute('data-item-id');
          if (window.app && app.state && Array.isArray(app.state.items)) {
            const it = app.state.items.find(x => (''+x.id) === (''+id));
            if (it) { it.imdbRating = val; if (app.persist) app.persist(); if (app.render) app.render(); }
          }
        }catch(e){}
      }
      inp.addEventListener('keydown',ev=>{ if(ev.key==='Enter'){ ev.preventDefault(); inp.blur(); } });
      inp.addEventListener('blur', ()=> save(inp.value.trim()) );
    });
  }

  function hookRender(){
    if (window.app && typeof app.render === "function" && !app.__patched_stream_fix_381){
      app.__patched_stream_fix_381 = true;
      const old = app.render.bind(app);
      app.render = function(){
        const r = old();
        setTimeout(()=>{ enableImdbInlineEdit(); /* no auto filtering here */ },0);
        return r;
      };
    } else {
      setInterval(()=>{ enableImdbInlineEdit(); }, 1500);
    }
  }

  ready(function(){
    ensureBadge();
    attachMultiDropdown();
    // do NOT auto filter on load to avoid flicker; only on Apply or first manual call:
    enableImdbInlineEdit();
    hookRender();
  });
})();
