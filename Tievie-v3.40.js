/* Tievie fixes (v3.43, safe) — enkel gevraagde functionaliteit, met harde guards tegen witte pagina. */
(function(){
  const OMDB_KEY = '8a70a767';

  // Veilig loggen zonder crash
  const log = (...a)=>{ try{ console.log('[Tievie v3.43]', ...a);}catch(_){} };
  const warn = (...a)=>{ try{ console.warn('[Tievie v3.43]', ...a);}catch(_){} };

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

  function ensureState(){
    try{
      window.app = window.app || {};
      app.state = app.state || {};
    }catch(e){ /* laat nooit crashen */ }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    try{
      ensureState();

      // --- FIX: streaming multi-select altijd als overlay boven alles (Safari-proof) ---
      let dropdownMenu = null;
      try{
        dropdownMenu = document.getElementById('streamingDropdownMenu') || null;
        if (dropdownMenu) {
          // verplaats naar body om stacking/overflow issues te vermijden
          if (dropdownMenu.parentElement !== document.body) {
            document.body.appendChild(dropdownMenu);
          }
          Object.assign(dropdownMenu.style, {
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: '999999',
            background: '#0b1020',
            border: '1px solid rgba(148,163,184,.25)',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,.5)',
            padding: '12px'
          });
        } else {
          warn('streamingDropdownMenu niet gevonden (OK als UI dit nog niet rendert).');
        }
      }catch(e){
        warn('Overlay-fix error:', e);
      }

      // Vinkjes → filter toepassen (met guards)
      try{
        app.state.filterStreaming = app.state.filterStreaming || [];
        const checkboxes = dropdownMenu ? dropdownMenu.querySelectorAll('input[type="checkbox"]') : [];
        const selectAll  = document.getElementById('selectAllStreaming') || null;
        const selectNone = document.getElementById('selectNoneStreaming') || null;

        const updateSelectedStreams = () => {
          try{
            const selected = Array.from(checkboxes || [])
              .filter(cb => cb && cb.checked && !['selectAllStreaming','selectNoneStreaming'].includes(cb.id))
              .map(cb => cb.value);
            app.state.filterStreaming = selected;
            if (typeof app.render === 'function') app.render();
          }catch(e){ warn('updateSelectedStreams error:', e); }
        };

        (checkboxes || []).forEach(cb => {
          try{
            cb.addEventListener('change', (e) => {
              try{
                if(selectAll && e.target === selectAll) {
                  const isChecked = !!selectAll.checked;
                  (checkboxes || []).forEach(ocb => ocb && (ocb.checked = isChecked));
                  if(selectNone) selectNone.checked = false;
                } else if (selectNone && e.target === selectNone) {
                  const isChecked = !!selectNone.checked;
                  (checkboxes || []).forEach(ocb => ocb && (ocb.checked = !isChecked));
                  if(selectAll) selectAll.checked = false;
                } else {
                  if(selectAll)  selectAll.checked = false;
                  if(selectNone) selectNone.checked = false;
                }
                updateSelectedStreams();
              }catch(err){ warn('checkbox change handler error:', err); }
            });
          }catch(err){ warn('attach listener error:', err); }
        });

        // Filter in app.filtered injecteren (met guard)
        if(typeof app.filtered === 'function' && !app.__streamPatched){
          const orig = app.filtered.bind(app);
          app.filtered = function(){
            try{
              let arr = [];
              try{ arr = orig() || []; }catch(_){ arr = []; }
              const fs = (app.state && app.state.filterStreaming) || [];
              if(fs.length>0){
                arr = arr.filter(it => {
                  const s = norm(it && it.streamingOn);
                  if(fs.includes('__UNKNOWN__') && !s) return true;
                  return fs.includes(s);
                });
              }
              return arr;
            }catch(e){
              warn('app.filtered wrapper error:', e);
              try{ return orig() || []; }catch(_){ return []; }
            }
          };
          app.__streamPatched = true;
        }
      }catch(e){
        warn('Streaming selectie/filer init error:', e);
      }

      // IMDb overlay — idem als voorheen, met guards
      try{
        const iframe = document.getElementById('imdbFrame') || null;
        const overlay= document.getElementById('imdbOverlay') || null;
        const close  = document.getElementById('imdbClose') || null;
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
            try{
              iframe.removeAttribute('srcdoc');
              iframe.src = 'https://www.imdb.com/title/'+encodeURIComponent(imdbID)+'/';
              overlay.style.display='flex';
            }catch(_){}
          }
          window.openImdbOverlay = imdbID => imdbID ? build(imdbID) : alert('Geen IMDb ID');
          try{
            close.addEventListener('click', ()=>{ 
              try{ overlay.style.display='none'; }catch(_){}
              try{ iframe.src='about:blank'; iframe.removeAttribute('srcdoc'); }catch(_){}
            });
            overlay.addEventListener('click', (e)=>{ try{ if(e.target===overlay){ close.click(); } }catch(_){ } });
          }catch(_){}
        } else {
          // Geen overlay elementen? Dan doen we niets; geen crash.
        }
      }catch(e){
        warn('IMDb overlay init error:', e);
      }

      log('geladen + safe guards actief');
    }catch(e){
      // Laat nooit de app crashen
      warn('Top-level init error:', e);
    }
  });
})();
