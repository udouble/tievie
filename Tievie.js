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
      Object.assign(overlay.style,{position:'fixed',left:0,top:0,right:0,bottom:0,display:'none',alignItems:'center',justifyContent:'center',background:'rgba(2,6,23,55)',backdropFilter:'blur(3px)',zIndex:10002});
      overlay.innerHTML = `
      <div id="imdbPanel" style="width:min(840px,94vw);max-height:90vh;background:#0b1220;border:1px solid rgba(148,163,184,25);border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,5);overflow:hidden">
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
  img{width:210px;height:310px;object-fit:cover;border-radius:12px;border:1px solid rgba(148,163,184,25)}
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
  });
})();