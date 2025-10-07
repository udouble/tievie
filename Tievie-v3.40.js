/* Tievie-v3.40.js — fixes:
   - Streaming multi-select (checkboxen) als echte overlay (z-index hoog)
   - IMDb-overlay (werkt via OMDb en valt terug op imdb.com)
   - Bevestigen bij verwijderen (X)
   - Add-modal blijft zoals eerder: categorie/streaming kiezen
   - "IMDb-gegevens verversen" knop
   - Willekeurige keuze + popup (werkt op actieve Films/Series, respecteert filters)
   - Geen rommel met service worker; geen caching-trucs hier
*/
(function(){
  const OMDB_KEY = '8a70a767';

  // --- Helpers --------------------------------------------------------------
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

  document.addEventListener('DOMContentLoaded', () => {
    ensureState();

    // ======================================================================
    // STREAMING MULTI-SELECT (CHECKBOX OVERLAY MET HOGE Z-INDEX)
    // ======================================================================
    // We plaatsen één vaste knop "Streaming" (links in de balk, naast Sorteren)
    // en tonen een overlay met vinkjes. Selectie wordt in app.state gezet en
    // via app.filtered() toegepast. Z-index is extra hoog zodat het nooit
    // "underlay" kan worden.
    (function streamingMulti(){
      // UITLIJNING: zoek de rij waar ook "Sorteren" staat
      const controlRow = document.querySelector('header') || document.body;
      if(!controlRow || document.getElementById('btn-streaming-multi')) return;

      const btn = document.createElement('button');
      btn.id = 'btn-streaming-multi';
      btn.textContent = 'Streaming';
      btn.style.cssText = 'margin:4px 8px 8px 0;padding:.45rem .75rem;border-radius:.6rem;border:1px solid rgba(148,163,184,.25);background:#0b1020;color:#e5e7eb;cursor:pointer';
      (document.querySelector('header .mb-3') || document.querySelector('header') || document.body).appendChild(btn);

      // OVERLAY
      const ov = document.createElement('div');
      ov.id = 'streamingOverlay';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,.55);backdrop-filter:blur(2px);display:none;align-items:center;justify-content:center;z-index:10050';
      ov.innerHTML = `
        <div style="width:min(520px,92vw);background:#0b1020;border:1px solid rgba(148,163,184,.25);border-radius:14px;box-shadow:0 12px 42px rgba(0,0,0,.5);overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#111827;color:#e5e7eb">
            <strong>Filter op streamingdienst</strong>
            <button id="streamClose" style="background:transparent;border:0;color:#e5e7eb;font-size:18px">✕</button>
          </div>
          <div style="padding:14px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;color:#cbd5e1">
              ${['Streamz','Netflix','Prime Video','Apple TV+','VRT MAX','Go Play','NPO','Disney+','Onbekend'].map(v=>`
                <label style="display:flex;align-items:center;gap:8px">
                  <input type="checkbox" class="streamChk" value="${v}"> ${v}
                </label>`).join('')}
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end">
              <button id="streamNone"  style="padding:.45rem .8rem;border-radius:.6rem;border:1px solid rgba(148,163,184,.25);background:#0b1020;color:#e5e7eb">Niets</button>
              <button id="streamAll"   style="padding:.45rem .8rem;border-radius:.6rem;border:1px solid rgba(148,163,184,.25);background:#0b1020;color:#e5e7eb">Alles</button>
              <button id="streamApply" style="padding:.45rem .9rem;border:0;border-radius:.6rem;background:#4f46e5;color:#fff">Toepassen</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(ov);

      const chk = () => Array.from(ov.querySelectorAll('.streamChk'));
      const show = ()=>{
        // zet huidige selectie
        const sel = app.state.filterStreaming || [];
        chk().forEach(c => { c.checked = sel.includes(c.value); });
        ov.style.display='flex';
      };
      const hide = ()=>{ ov.style.display='none'; };

      btn.onclick = show;
      ov.onclick = (e)=>{ if(e.target===ov) hide(); };
      ov.querySelector('#streamClose').onclick = hide;
      ov.querySelector('#streamAll').onclick   = ()=>{ chk().forEach(c => c.checked = true); };
      ov.querySelector('#streamNone').onclick  = ()=>{ chk().forEach(c => c.checked = false); };
      ov.querySelector('#streamApply').onclick = ()=>{
        app.state.filterStreaming = chk().filter(c=>c.checked).map(c=>c.value);
        hide();
        app.render && app.render();
      };

      // Patch filter
      if(typeof app.filtered === 'function' && !app.__streamPatched){
        const orig = app.filtered.bind(app);
        app.filtered = function(){
          let arr = orig();
          const fs = (app.state && app.state.filterStreaming) || [];
          if(fs.length>0){
            arr = arr.filter(it => {
              const s = norm(it.streamingOn);
              if(fs.includes('Onbekend') && !s) return true;
              return fs.includes(s);
            });
          }
          return arr;
        };
        app.__streamPatched = true;
      }
    })();

    // ======================================================================
    // IMDb OVERLAY (blijft zoals eerder)
    // ======================================================================
    (function imdbOverlay(){
      if(document.getElementById('imdbOverlay')) return;
      const overlay= document.createElement('div');
      overlay.id='imdbOverlay';
      overlay.style.cssText='position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(2,6,23,.55);backdrop-filter:blur(3px);z-index:10040';
      overlay.innerHTML = `
        <div style="width:min(920px,94vw);background:#0b1020;border:1px solid rgba(148,163,184,.25);border-radius:14px;box-shadow:0 12px 42px rgba(0,0,0,.5);overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#111827;color:#e5e7eb">
            <strong>IMDb</strong>
            <button id="imdbClose" style="background:transparent;border:0;color:#e5e7eb;font-size:18px">✕</button>
          </div>
          <iframe id="imdbFrame" src="about:blank" style="width:100%;height:min(70vh,680px);border:0;background:#0b1020"></iframe>
        </div>`;
      document.body.appendChild(overlay);

      const iframe = overlay.querySelector('#imdbFrame');
      const close  = overlay.querySelector('#imdbClose');

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
    })();

    // ======================================================================
    // VERWIJDEREN met bevestiging
    // ======================================================================
    (function confirmDelete(){
      const list = document.getElementById('list') || document;
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
    })();

    // ======================================================================
    // IMDb-gegevens verversen
    // ======================================================================
    (function refreshMeta(){
      const bar = document.querySelector('#topbar-actions') || document.querySelector('header .flex.gap-2') || document.querySelector('header .mb-3 .flex.gap-2') || document.querySelector('header');
      if(!bar || document.getElementById('btn-refresh-meta')) return;
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
              j = await fetch(url).then(r=>j.json());
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
    })();

    // ======================================================================
    // Willekeurige keuze + popup
    // ======================================================================
    (function randomPick(){
      if(document.getElementById('randomModal')) return;
      const modal = document.createElement('div');
      modal.id = 'randomModal';
      modal.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(2,6,23,.55);backdrop-filter:blur(3px);z-index:10020';
      modal.innerHTML = `
        <div style="width:min(640px,94vw);background:#0b1020;color:#e5e7eb;border-radius:16px;border:1px solid rgba(148,163,184,.25);box-shadow:0 16px 60px rgba(0,0,0,.55);overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#111827">
            <strong id="rndTitle">Willekeurige keuze</strong>
            <button id="rndClose" style="background:transparent;border:0;color:#e5e7eb;font-size:18px">✕</button>
          </div>
          <div style="display:flex;gap:14px;padding:16px;flex-wrap:wrap">
            <img id="rndPoster" src="" alt="" style="width:150px;height:225px;object-fit:cover;border-radius:12px;border:1px solid rgba(148,163,184,.25)">
            <div style="flex:1;min-width:220px">
              <div id="rndMeta" style="opacity:.9;margin-bottom:10px">—</div>
              <div id="rndStream" style="opacity:.85;margin-bottom:12px">—</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button id="rndOpenCard" class="pill" style="background:#4f46e5;color:#fff;border:0;padding:8px 12px;border-radius:10px">Open kaart</button>
                <button id="rndImdb" class="pill" style="background:#fbbf24;color:#111827;border:0;padding:8px 12px;border-radius:10px">IMDb-info</button>
                <button id="rndReroll" class="pill" style="background:#10b981;color:#0b1020;border:0;padding:8px 12px;border-radius:10px">Nog een</button>
              </div>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);

      const rndTitle = modal.querySelector('#rndTitle');
      const rndPoster= modal.querySelector('#rndPoster');
      const rndMeta  = modal.querySelector('#rndMeta');
      const rndStream= modal.querySelector('#rndStream');
      const btnClose = modal.querySelector('#rndClose');
      const btnOpen  = modal.querySelector('#rndOpenCard');
      const btnImdb  = modal.querySelector('#rndImdb');
      const btnReroll= modal.querySelector('#rndReroll');

      let currentPick = null;

      const pickOne = ()=>{
        try{
          if(!window.app || !app.state) return null;
          const active = app.state.filter || 'alles';
          if(!(active==='film' || active==='serie')) return null;
          const items = (typeof app.filtered==='function') ? app.filtered() : (app.state.items||[]);
          const pool = items.filter(it => it.type===active);
          if(!pool.length) return null;
          return pool[Math.floor(Math.random()*pool.length)];
        }catch(e){ return null; }
      };

      const show = (it)=>{
        if(!it) return;
        currentPick = it;
        rndTitle.textContent = it.title || '—';
        rndPoster.src = (it.poster && it.poster!=='N/A') ? it.poster : 'https://placehold.co/300x450/e2e8f0/94a3b8?text=%20';
        rndMeta.textContent = `${it.year||'—'} • ${it.runtime||'—'} • ${it.imdbRating ? ('IMDb '+it.imdbRating) : 'IMDb N/B'}`;
        rndStream.textContent = it.streamingOn ? it.streamingOn : 'Onbekende dienst';
        modal.style.display='flex';
      };

      const openCard = ()=>{
        if(!currentPick) return;
        const card = document.querySelector(`[data-item-id="${currentPick.id}"]`);
        if(card){
          modal.style.display='none';
          card.scrollIntoView({behavior:'smooth', block:'center'});
          card.style.transition='box-shadow .25s ease';
          const old = card.style.boxShadow;
          card.style.boxShadow='0 0 0 3px rgba(16,185,129,.9)';
          setTimeout(()=>{ card.style.boxShadow=old||''; },1200);
        }
      };

      btnOpen.addEventListener('click', openCard);
      btnImdb.addEventListener('click', ()=>{ if(currentPick && currentPick.imdbID){ modal.style.display='none'; window.openImdbOverlay && window.openImdbOverlay(currentPick.imdbID); } });
      btnReroll.addEventListener('click', ()=>{ const nxt = pickOne(); if(nxt) show(nxt); });
      btnClose.addEventListener('click', ()=>{ modal.style.display='none'; });
      modal.addEventListener('click', (e)=>{ if(e.target===modal) modal.style.display='none'; });

      // Hook bestaande knop (als die bestaat)
      const hook = ()=>{
        const btn = document.getElementById('btn-random');
        if(!btn || btn._rndHooked) return;
        btn._rndHooked = true;
        btn.onclick = (e)=>{
          e?.preventDefault?.();
          const it = pickOne();
          if(!it){ alert('Geen items (of verkeerde categorie). Kies Films of Series.'); return; }
          show(it);
        };
      };
      hook();
      new MutationObserver(hook).observe(document.body, {childList:true, subtree:true});
    })();
  });
})();
