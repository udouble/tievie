/* Tievie fixes (v3.27) — enkel gevraagde functionaliteit, verder niets. */
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
    if(sel){ sel.addEventListener('change', ()=>{ app.state.filterStreaming = sel.value||''; app.render && app.render(); }); }
    if(typeof app.filtered === 'function' && !app.__streamPatched){
      const orig = app.filtered.bind(app);
      app.filtered = function(){
        let arr = orig();
        const fs = (app.state && app.state.filterStreaming) || '';
        if(fs){
          arr = arr.filter(it => {
            const s = norm(it.streamingOn);
            if(fs === '__UNKNOWN__') return !s;
            return s === fs;
          });
        }
        return arr;
      };
      app.__streamPatched = true;
    }
    const iframe = document.getElementById('imdbFrame');
    const overlay= document.getElementById('imdbOverlay');
    const close  = document.getElementById('imdbClose');
    if(iframe && overlay && close){
      async function build(imdbID){
        try{
          const r = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${encodeURIComponent(imdbID)}`);
          const j = await r.json();
          if(j && j.Response!=='False'){
            const poster = (j.Poster && j.Poster!=='N/A') ? j.Poster : '';
            iframe.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <style>body{margin:0;padding:16px;background:#0b1020;color:#e5e7eb;font:16px/1.5 -apple-system,Segoe UI,Inter,Roboto,Helvetica,Arial}
            .w{max-width:920px;margin:0 auto;display:flex;gap:16px;align-items:flex-start}
            img{width:210px;height:310px;object-fit:cover;border-radius:12px;border:1px solid rgba(148,163,184,.25)}
            h1{margin:.2rem 0 .25rem 0;font-size:22px}.m{opacity:.85;margin:.2rem 0 .6rem 0}</style></head><body>
            <div class="w"><img src="${poster||'https://placehold.co/210x310/e2e8f0/94a3b8?text=%20'}"><div>
            <h1>${j.Title||'-'}</h1><div class="m">${(j.Year||'')} • ${(j.Runtime||'')} • ${(j.Genre||'')}</div>
            <div><b>IMDb:</b> ${j.imdbRating||'N/B'}</div><p>${j.Plot||''}</p></div></div></body></html>`;
            overlay.style.display='flex'; return;
          }
        }catch(e){}
        iframe.removeAttribute('srcdoc');
        iframe.src = 'https://www.imdb.com/title/'+encodeURIComponent(imdbID)+'/';
        overlay.style.display='flex';
      }
      window.openImdbOverlay = imdbID => imdbID ? build(imdbID) : alert('Geen IMDb ID');
      close.addEventListener('click', ()=>{ overlay.style.display='none'; iframe.src='about:blank'; iframe.removeAttribute('srcdoc'); });
      overlay.addEventListener('click', (e)=>{ if(e.target===overlay){ close.click(); } });
    }
    const list = document.getElementById('list');
    if(list){
      const hook = () => {
        list.querySelectorAll('[data-action="delete"]').forEach(btn=>{
          if(btn.__confirmHook) return;
          btn.__confirmHook = true;
          const old = btn.onclick;
          btn.onclick = (ev)=>{ ev?.preventDefault?.(); if(confirm('Weet je zeker dat je dit item wil verwijderen?')){ return old?.(ev); } };
        });
      };
      new MutationObserver(hook).observe(list, {childList:true, subtree:true});
      hook();
    }
    const container = document.getElementById('suggest');
    const slist = document.getElementById('suggest-list');
    if(container && slist && !document.getElementById('addModal')){
      const modal = document.createElement('div');
      modal.id='addModal';
      Object.assign(modal.style,{position:'fixed',inset:'0',display:'none',alignItems:'center',justifyContent:'center',background:'rgba(2,6,23,.55)',backdropFilter:'blur(3px)',zIndex:10002});
      modal.innerHTML = `<div style="width:min(520px,92vw);background:#0b1020;border:1px solid rgba(148,163,184,.25);border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.5);overflow:hidden">
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
      <option value="">Onbekend</option><option>Streamz</option><option>Netflix</option><option>Prime Video</option><option>Apple TV+</option><option>VRT MAX</option><option>Go Play</option><option>NPO</option><option>Disney+</option>
      </select></label></div>
      <div style="text-align:right"><button id="addOk" style="background:#4f46e5;color:white;padding:.5rem .9rem;border:0;border-radius:.6rem">Toevoegen</button></div></div></div>`;
      document.body.appendChild(modal);
      let pending=null;
      const open = info => { pending = info; document.getElementById('addTitle').textContent = info.title || '—'; modal.style.display='flex'; };
      const close= ()=>{ modal.style.display='none'; pending=null; };
      document.getElementById('addClose').onclick = close;
      modal.addEventListener('click', (e)=>{ if(e.target===modal) close(); });
      new MutationObserver(()=>{
        slist.querySelectorAll('.row').forEach(row=>{
          if(row.__hook) return; row.__hook = true;
          row.addEventListener('click', (ev)=>{
            ev.preventDefault(); ev.stopPropagation();
            (window.hideSuggest && window.hideSuggest());
            open({ imdbID: row.dataset.imdbid, title: row.dataset.title, year: row.dataset.year, poster: row.dataset.poster });
          });
        });
      }).observe(container, {childList:true, subtree:true});
      document.getElementById('addOk').onclick = async ()=>{
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
    }
    const bar = document.querySelector('header .mb-3 .flex.gap-2') || document.querySelector('header .flex.gap-2');
    if(bar && !document.getElementById('btn-refresh-meta')){
      const btn = document.createElement('button');
      btn.id = 'btn-refresh-meta';
      btn.className = 'px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow text-sm pill';
      btn.textContent = 'IMDb-gegevens verversen';
      btn.addEventListener('click', async ()=>{
        if(!navigator.onLine){ alert('Online nodig voor verversen.'); return; }
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
                it.year       = r2 || it.year;
                it.runtime    = r3 || it.runtime;
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
      });
      bar.appendChild(btn);
    }
  });
})();

/* Randomizer (Films/Series only), respects current search + streaming filter */
(function(){
  document.addEventListener('DOMContentLoaded', ()=>{
    try{
      const topBar = document.querySelector('#topbar-actions') || document.querySelector('header .flex.gap-2') || document.querySelector('header .mb-3 .flex.gap-2');
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
          t.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#111827;color:#fff;border:1px solid rgba(148,163,184,.25);padding:10px 14px;border-radius:10px;z-index:10004;box-shadow:0 10px 24px rgba(0,0,0,.35)';
          document.body.appendChild(t);
        }
        t.textContent = msg;
        t.style.opacity='1';
        clearTimeout(t._h);
        t._h=setTimeout(()=>{t.style.opacity='0';},1800);
      };

      const highlight = (el)=>{
        el.style.transition='box-shadow .25s ease';
        const old = el.style.boxShadow;
        el.style.boxShadow='0 0 0 3px rgba(16,185,129,.9)';
        setTimeout(()=>{ el.style.boxShadow=old || ''; },1200);
      };

      btn.addEventListener('click', ()=>{
        if(!window.app || !app.state){ toast('Geen data geladen.'); return; }
        const active = app.state.filter || 'alles';
        if(!(active==='film' || active==='serie')){
          toast('Willekeurig werkt in Films of Series.');
          return;
        }
        const items = (typeof app.filtered==='function') ? app.filtered() : (app.state.items||[]);
        const pool = items.filter(it => it.type===active);
        if(!pool.length){ toast('Geen items in huidige selectie.'); return; }
        const pick = pool[Math.floor(Math.random()*pool.length)];
        const card = document.querySelector(`[data-item-id="${pick.id}"]`) || document.querySelector(`[data-item-id="${pick.id}"]`);
        if(card){
          card.scrollIntoView({behavior:'smooth', block:'center'});
          highlight(card);
        }
        toast((pick.title||'—'));
      });
    }catch(e){}
  });
})();
