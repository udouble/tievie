/* Tievie fixes (v3.41) — enkel gevraagde functionaliteit, verder niets. */
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
    
    // --- FIX: streaming dropdown always on top (overlay style)
    const dropdownMenu = document.getElementById('streamingDropdownMenu');
    if(dropdownMenu){
      dropdownMenu.style.position = 'absolute';
      dropdownMenu.style.zIndex = '999999';
      dropdownMenu.style.background = '#0b1020';
      dropdownMenu.style.border = '1px solid rgba(148,163,184,.25)';
      dropdownMenu.style.borderRadius = '12px';
      dropdownMenu.style.boxShadow = '0 10px 40px rgba(0,0,0,.5)';
    }

    app.state.filterStreaming = app.state.filterStreaming || [];
    const checkboxes = dropdownMenu ? dropdownMenu.querySelectorAll('input[type="checkbox"]') : [];
    const selectAll = document.getElementById('selectAllStreaming');
    const selectNone = document.getElementById('selectNoneStreaming');

    const updateSelectedStreams = () => {
        const selected = Array.from(checkboxes)
          .filter(cb => cb.checked && !['selectAllStreaming','selectNoneStreaming'].includes(cb.id))
          .map(cb => cb.value);
        app.state.filterStreaming = selected;
        app.render();
    };

    checkboxes.forEach(cb => {
        cb.addEventListener('change', (e) => {
            if(e.target === selectAll) {
                const isChecked = selectAll.checked;
                checkboxes.forEach(ocb => ocb.checked = isChecked);
                if(selectNone) selectNone.checked = false;
            } else if (e.target === selectNone) {
                const isChecked = selectNone.checked;
                checkboxes.forEach(ocb => ocb.checked = !isChecked);
                if(selectAll) selectAll.checked = false;
            } else {
                if(selectAll) selectAll.checked = false;
                if(selectNone) selectNone.checked = false;
            }
            updateSelectedStreams();
        });
    });

    if(typeof app.filtered === 'function' && !app.__streamPatched){
      const orig = app.filtered.bind(app);
      app.filtered = function(){
        let arr = orig();
        const fs = (app.state && app.state.filterStreaming) || [];
        if(fs.length>0){
          arr = arr.filter(it => {
            const s = norm(it.streamingOn);
            if(fs.includes('__UNKNOWN__') && !s) return true;
            return fs.includes(s);
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
  });
})();
