/* Tievie fixes (v3.30) — enkel gevraagde functionaliteit, verder niets. */
(function(){
  const OMDB_KEY = '8a70a767';
  const norm = s => {
    if(!s) return '';
    s = (''+s).trim().toLowerCase();
    if(s.startsWith('appl')) return 'Apple TV+';
    if(s.startsWith('netf')) return 'Netflix';
    if(s.startsWith('prim')) return 'Prime Video';
    if(s.startsWith('vrt'))  return 'VRT MAX';
    if(s.startsWith('vtm'))  return 'VTM Go';
    if(s.includes('play'))   return 'Go Play';
    if(s.startsWith('np'))   return 'NPO';
    if(s.startsWith('strea'))return 'Streamz';
    if(s.startsWith('disn')) return 'Disney+';
    return '';
  };
  function ensureState(){ window.app = window.app || {}; app.state = app.state || {}; }
  document.addEventListener('DOMContentLoaded', ()=>{
    ensureState();
    app.state.filterStreaming = app.state.filterStreaming || '';
    const sel = document.getElementById('filterStreaming');
    if(sel){ /* legacy select no-op: UI moved to multi-select */ }
  
    // === IMDb overlay (ongewijzigd) ===
    if(!document.getElementById('imdbOverlay')){
      const overlay = document.createElement('div');
      overlay.id='imdbOverlay';
      Object.assign(overlay.style,{position:'fixed',left:0,top:0,right:0,bottom:0,display:'none',alignItems:'center',justifyContent:'center',background:'rgba(2,6,23,.55)',backdropFilter:'blur(3px)',zIndex:10002});
      overlay.innerHTML = `
      <div id="imdbPanel" style="width:min(840px,94vw);max-height:90vh;background:#0b1220;border:1px solid rgba(148,163,184,.25);border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.5);overflow:hidden">
        <div id="imdbBar" style="display:flex;align-items:center;justify-content:space-between;padding:.6rem .9rem;background:#111827;color:#e5e7eb">
          <strong>IMDb</strong><button id="imdbClose" style="background:transparent;border:0;color:#e5e7eb;font-size:18px">✕</button>
        </div>
        <iframe id="imdbFrame" src="about:blank" style="border:0;width:100%;height:min(70vh,620px);background:#0b1220"></iframe>
      </div>`;
      document.body.appendChild(overlay);
      const frame = overlay.querySelector('#imdbFrame');
      overlay.addEventListener('click', (e)=>{ if(e.target===overlay){ overlay.style.display='none'; frame.src='about:blank'; } });
      overlay.querySelector('#imdbClose').addEventListener('click', ()=>{ overlay.style.display='none'; frame.src='about:blank'; });
      window.openImdbOverlay = (imdbID, poster)=>{
        try{
          if(poster && poster!=='N/A'){
            const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  body{margin:0;background:#0b1220;color:#e5e7eb;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial}
  .w{padding:16px;display:flex;gap:16px;align-items:flex-start}
  img{width:210px;height:310px;object-fit:cover;border-radius:12px;border:1px solid rgba(148,163,184,.25)}
  h1{margin:.2rem 0 .25rem 0;font-size:22px}.m{opacity:.85;margin:.2rem 0 .6rem 0}
  a{color:#60a5fa;text-decoration:none}
</style></head><body>
<div class="w"><img src="${poster||'https://placehold.co/210x310/e2e8f0/94a3b8?text=%20'}"><div>
<h1>IMDb</h1>
<p>Detailpagina wordt geladen…</p>
</div></div></body></html>`;
            frame.setAttribute('srcdoc', html);
            overlay.style.display='flex';
          }else{
            frame.removeAttribute('srcdoc');
            frame.src = 'https://www.imdb.com/title/'+encodeURIComponent(imdbID)+'/';
            overlay.style.display='flex';
          }
        }catch(e){
          frame.removeAttribute('srcdoc');
          frame.src = 'https://www.imdb.com/title/'+encodeURIComponent(imdbID)+'/';
          overlay.style.display='flex';
        }
      };
    }

    // === Zoekresultaat modal "Toevoegen" (strikte anti-duplicaat; overlay verschijnt niet bij duplicaat) ===
    (function mountAddModal(){
      const container = document.getElementById('suggest-list') || document.body;
      const slist = document.getElementById('suggest-list') || document.createElement('div');
      let modal = document.getElementById('addModal');
      if(!modal){
        modal = document.createElement('div');
        modal.id = 'addModal';
        Object.assign(modal.style,{position:'fixed',left:0,top:0,right:0,bottom:0,display:'none',alignItems:'center',justifyContent:'center',background:'rgba(2,6,23,.55)',backdropFilter:'blur(3px)',zIndex:10002});
        modal.innerHTML = `<div style="width:min(520px,92vw);background:#0b1220;border:1px solid rgba(148,163,184,.25);border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.5);overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:.6rem .9rem;background:#111827;color:#e5e7eb">
      <strong>Toevoegen</strong><button id="addClose" style="background:transparent;border:0;color:#e5e7eb;font-size:18px">✕</button></div>
      <div style="padding:14px"><div id="addTitle" style="font-weight:700;margin-bottom:8px;color:#e5e7eb">—</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
      <label style="flex:1;min-width:200px;color:#cbd5e1">Categorie
      <select id="addType" style="width:100%;margin-top:6px;padding:8px;border-radius:8px;border:1px solid rgba(148,163,184,.25)">
      <option value="film">Film</option><option value="serie">Serie</option><option value="herman-film">H-Film</option><option value="herman-serie">H-Serie</option><option value="aan-het-kijken">Aan het kijken</option><option value="bekeken">Bekeken</option>
      </select></label>
      <label style="flex:1;min-width:200px;color:#cbd5e1">Streaming
      <select id="addStream" style="width:100%;margin-top:6px;padding:8px;border-radius:8px;border:1px solid rgba(148,163,184,.25)">
      <option value="">Onbekend</option><option>Streamz</option><option>Netflix</option><option>Prime Video</option><option>Apple TV+</option><option>VRT MAX</option><option>VTM Go</option><option>Go Play</option><option>NPO</option><option>Disney+</option>
      </select></label></div>
      <div style="text-align:right"><button id="addOk" style="background:#4f46e5;color:#fff;padding:.55rem 1rem;border:0;border-radius:.6rem">Toevoegen</button></div></div></div>`;
        document.body.appendChild(modal);
      }
      let pending=null;

      const predupCheck = async (info)=>{
        try{
          const all = await (window.dbGetAll && window.dbGetAll()) || [];
          const normTitle = (t)=> (window.normalizeTitle?window.normalizeTitle(t):(t||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim());
          const kFor = (it)=> (window.keyFor?window.keyFor(it):((it.imdbID&&('imdb:'+String(it.imdbID).toLowerCase())) || ('ty:'+normTitle(it.title)+'|'+String(it.year||'').trim())));
          const keySet = new Set(all.map(x=> (window.keyFor?window.keyFor(x):kFor(x))));
          const titleSet = new Set(all.map(x=> normTitle(x.title||'')));
          const isDup = keySet.has(kFor(info)) || (info.title && titleSet.has(normTitle(info.title)));
          return !!isDup;
        }catch(e){ return false; }
      };

      const open = async (info) => {
        pending = info;
        document.getElementById('addTitle').textContent = info.title || '—';
        modal.style.display='flex';
        try{
          const all = await (window.dbGetAll && window.dbGetAll()) || [];
          const normTitle = (t)=> (window.normalizeTitle?window.normalizeTitle(t):(t||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim());
          const kFor = (it)=> (window.keyFor?window.keyFor(it):((it.imdbID&&('imdb:'+String(it.imdbID).toLowerCase())) || ('ty:'+normTitle(it.title)+'|'+String(it.year||'').trim())));
          const keySet = new Set(all.map(x=> (window.keyFor?window.keyFor(x):kFor(x))));
          const titleSet = new Set(all.map(x=> normTitle(x.title||'')));
          const isDup = keySet.has(kFor(info)) || (info.title && titleSet.has(normTitle(info.title)));
          const btn = document.getElementById('addOk');
          if(btn){
            if(isDup){
              btn.disabled = true;
              btn.style.opacity = '0.5';
              btn.style.pointerEvents = 'none';
              btn.textContent = 'Reeds toegevoegd';
              btn.title = 'Deze titel staat al in de app';
            }else{
              btn.disabled = false;
              btn.style.opacity = '';
              btn.style.pointerEvents = '';
              btn.textContent = 'Toevoegen';
              btn.title = '';
            }
          }
        }catch(e){}
      };

      const close= ()=>{ modal.style.display='none'; pending=null; };
      document.getElementById('addClose').onclick = close;
      modal.addEventListener('click', (e)=>{ if(e.target===modal) close(); });

      // Haak in op de zoekresultaat-rows om het modal te openen.
      new MutationObserver(()=>{
        slist.querySelectorAll('.row').forEach(row=>{
          if(row.__hook) return; row.__hook = true;
          row.addEventListener('click', async (ev)=>{
            ev.preventDefault(); ev.stopPropagation();
            (window.hideSuggest && window.hideSuggest());
            const info = { imdbID: row.dataset.imdbid, title: row.dataset.title, year: row.dataset.year, poster: row.dataset.poster };
            // NIEUW: pre-check op duplicaat — als duplicaat, toon melding en open overlay NIET.
            const isDup = await predupCheck(info);
            if(isDup){
              alert('Deze titel staat al in de app.');
              return;
            }
            open(info);
          });
        });
      }).observe(container, {childList:true, subtree:true});

      // Strikte check vóór toevoegen (blijft als extra veiligheid)
      document.getElementById('addOk').onclick = async ()=>{
        // dubbele veiligheid: check nog eens
        try{
          const all = await (window.dbGetAll && window.dbGetAll()) || [];
          const normTitle = (t)=> (window.normalizeTitle?window.normalizeTitle(t):(t||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim());
          const kFor = (it)=> (window.keyFor?window.keyFor(it):((it.imdbID&&('imdb:'+String(it.imdbID).toLowerCase())) || ('ty:'+normTitle(it.title)+'|'+String(it.year||'').trim())));
          const keySet = new Set(all.map(x=> (window.keyFor?window.keyFor(x):kFor(x))));
          const titleSet = new Set(all.map(x=> normTitle(x.title||'')));
          const isDup = keySet.has(kFor(pending||{})) || ((pending&&pending.title) && titleSet.has(normTitle(pending.title)));
          if(isDup){ alert('Deze titel is al eerder toegevoegd.'); return; }
        }catch(e){}

        if(!pending) return;
        const tp = document.getElementById('addType').value;
        const st = document.getElementById('addStream').value;
        const now= Date.now();
        const item = { id:'id-'+now+'-'+Math.random().toString(36).slice(2,7),
          title: pending.title, year: pending.year, imdbID: pending.imdbID,
          poster: pending.poster, type: tp, streamingOn: st, createdAt: now };
        try{
          await (window.dbPut && window.dbPut(item));
          const all = await (window.dbGetAll && window.dbGetAll()) || [];
          if(window.app){ app.state.items = all; app.render && app.render(); }
          (window.syncPushDebounced && window.syncPushDebounced());
        }catch(e){}
        close();
      };
    })();

    // === Lotto / Willekeurige keuze (ongewijzigd) ===
    (function(){
      const container = document.querySelector('header .mb-3 .flex.gap-2');
      if(!container || document.getElementById('btn-random')) return;

      const btn = document.createElement('button');
      btn.id = 'btn-random';
      btn.className = 'px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow text-sm pill';
      btn.innerHTML = 'Willekeurige keuze';
      btn.title = 'Kies willekeurig uit huidige lijst (na filters/zoekterm)';
      container.appendChild(btn);

      const toast = (msg)=>{
        let t = document.getElementById('toast');
        if(!t){
          t = document.createElement('div');
          t.id='toast';
          Object.assign(t.style,{position:'fixed',left:'50%',bottom:'20px',transform:'translateX(-50%)',background:'#0b1220',color:'#e5e7eb',padding:'10px 14px',borderRadius:'10px',border:'1px solid rgba(148,163,184,.25)',boxShadow:'0 10px 40px rgba(0,0,0,.45)',zIndex:10005});
          document.body.appendChild(t);
        }
        t.textContent=msg; t.style.opacity='1';
        clearTimeout(t.__timer); t.__timer=setTimeout(()=>{t.style.opacity='0'}, 1800);
      };

      function parseImdb(x){x=(''+(x||'')).trim();if(x==='')return null;const n=parseFloat(x);return Number.isFinite(n)?n:null}
      function parseScore(x){x=(''+(x||'')).trim();if(x===''||x.toLowerCase()==='nan')return null;const n=parseFloat(x);return Number.isFinite(n)?n:null}

      btn.addEventListener('click', ()=>{
        const items = (app.filtered && app.filtered()) || [];
        if(!items.length){ toast('Geen items in de huidige selectie.'); return; }
        const pick = items[Math.floor(Math.random()*items.length)];
        toast('💡 '+(pick.title||'—'));
      });
    })();

    // === Meta refresher (ongewijzigd) ===
    (function(){
      let btn = document.getElementById('btn-refresh-meta');
      const bar = document.querySelector('header .mb-3 .flex.gap-2');
      async function handler(){
        if(!navigator.onLine){ alert('Online nodig.'); return; }
        const items = await (window.dbGetAll && window.dbGetAll()) || [];
        let changed = 0;
        for(const it of items){
          try{
            let j=null;
            if(it.imdbID){
              j = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${encodeURIComponent(it.imdbID)}`).then(r=>r.json());
            }else if(it.title){
              const url = `https://www.omdbapi.com/?apikey=${OMDB_KEY}&t=${encodeURIComponent(it.title)}${it.year?('&y='+it.year):''}`;
              j = await fetch(url).then(r=>r.json());
            }
            if(j && j.Response!=='False'){
              const r1 = (j.imdbRating||''); const r2 = (j.Year||''); const r3 = (j.Runtime||'');
              if((r1 && r1!==it.imdbRating) || (r2 && r2!==it.year) || (r3 && r3!==it.runtime)){
                it.imdbRating = r1 || it.imdbRating;
                it.year = r2 || it.year;
                it.runtime = r3 || it.runtime;
                await (window.dbPut && window.dbPut(it));
                changed++;
              }
            }
          }catch(e){}
        }
        if(changed){
          const all = await (window.dbGetAll && window.dbGetAll());
          if(window.app){ app.state.items = all || []; app.render && app.render(); }
          (window.syncPushDebounced && window.syncPushDebounced());
        }
        alert('Verversen klaar. Bijgewerkt: '+changed);
      }
      if(btn){
        if(!btn.__bind){ btn.addEventListener('click', handler); btn.__bind = true; }
      }else if(bar){
        btn = document.createElement('button');
        btn.id = 'btn-refresh-meta';
        btn.className = 'px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow text-sm pill';
        btn.innerHTML = 'Ververs IMDb-info';
        bar.appendChild(btn);
        btn.addEventListener('click', handler);
      }
    })();

    // === Stream badge init (ongewijzigd) ===
    (function(){
      const el = document.getElementById('streamBadge');
      if(el && !el.__init){
        el.__init = true;
        el.textContent = app.state.filterStreaming || 'Niet toegekend';
      }
    })();

    // === Kleine compat: random knop in oudere lay-outs (no-op als al aanwezig) ===
    (function ensureRandomInLegacyHeader(){
      const topBar = document.querySelector('header .mb-3 .flex.gap-2');
      if(!topBar || document.getElementById('btn-random')) return;

      const btn = document.createElement('button');
      btn.id = 'btn-random';
      btn.className = 'px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow text-sm pill';
      btn.innerHTML = 'Willekeurige keuze';
      btn.title = 'Kies willekeurig uit huidige lijst (na filters/zoekterm)';
      topBar.appendChild(btn);

      const toast = (msg)=>{
        let t = document.getElementById('toast');
        if(!t){
          t = document.createElement('div');
          t.id='toast';
          Object.assign(t.style,{position:'fixed',left:'50%',bottom:'20px',transform:'translateX(-50%)',background:'#0b1220',color:'#e5e7eb',padding:'10px 14px',borderRadius:'10px',border:'1px solid rgba(148,163,184,.25)',boxShadow:'0 10px 40px rgba(0,0,0,.45)',zIndex:10005});
          document.body.appendChild(t);
        }
        t.textContent=msg; t.style.opacity='1';
        clearTimeout(t.__timer); t.__timer=setTimeout(()=>{t.style.opacity='0'}, 1800);
      };

      function parseImdb(x){x=(''+(x||'')).trim();if(x==='')return null;const n=parseFloat(x);return Number.isFinite(n)?n:null}
      function parseScore(x){x=(''+(x||'')).trim();if(x===''||x.toLowerCase()==='nan')return null;const n=parseFloat(x);return Number.isFinite(n)?n:null}

      btn.addEventListener('click', ()=>{
        if(typeof app.filtered === 'function' && !app.__streamPatched){
          const orig = app.filtered.bind(app);
          app.filtered = function(){
            const arr = orig();
            return Array.isArray(arr)?arr.slice():arr;
          };
          app.__streamPatched = true;
        }
        const items = (app.filtered && app.filtered()) || [];
        if(!items.length){ toast('Geen items in de huidige selectie.'); return; }
        const pick = items[Math.floor(Math.random()*items.length)];
        toast('💡 '+(pick.title||'—'));
      });
    })();
  });
})();