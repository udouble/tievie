
/* tievie-fixes-v3_31.js */
(function(){
  const SERVICES = ["Streamz","Netflix","Prime Video","Apple TV+","VRT MAX","Go Play","NPO","Disney+","Onbekend"];
  const STORAGE_KEY='tievie_stream_multi_v3';
  function norm(s){
    if(!s) return "Onbekend";
    s=(''+s).trim(); const u=s.toLowerCase();
    if(u.startsWith('appl')) return'Apple TV+';
    if(u.startsWith('netf')) return'Netflix';
    if(u.startsWith('vrt')) return'VRT MAX';
    if(u.includes('play')) return'Go Play';
    if(u.startsWith('prim')) return'Prime Video';
    if(u.startsWith('np')) return'NPO';
    if(u.startsWith('strea')) return'Streamz';
    if(u.startsWith('disn')) return'Disney+';
    return s;
  }
  function getSel(){try{const a=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
  function setSel(a){localStorage.setItem(STORAGE_KEY,JSON.stringify(a||[]))}
  function createMulti(){
    const host=document.querySelector('.filters')||document.querySelector('main')||document.body;
    const wrap=document.createElement('div');wrap.style.display='inline-block';wrap.style.position='relative';wrap.style.marginLeft='12px';
    const btn=document.createElement('button');btn.type='button';btn.textContent='Streaming';btn.style.padding='6px 10px';btn.style.borderRadius='8px';btn.style.border='1px solid rgba(255,255,255,.15)';btn.style.background='rgba(255,255,255,.08)';btn.style.color='inherit';
    const panel=document.createElement('div');panel.style.position='absolute';panel.style.top='100%';panel.style.left='0';panel.style.minWidth='220px';panel.style.padding='10px';panel.style.borderRadius='12px';panel.style.border='1px solid rgba(255,255,255,.12)';panel.style.background='rgba(20,24,32,.98)';panel.style.boxShadow='0 12px 40px rgba(0,0,0,.35)';panel.style.zIndex='999999';panel.style.display='none';
    const list=document.createElement('div');list.style.maxHeight='240px';list.style.overflow='auto';list.style.marginBottom='8px';
    SERVICES.forEach(s=>{const id='svc_'+s.replace(/\W+/g,'_');const row=document.createElement('label');row.style.display='flex';row.style.alignItems='center';row.style.gap='8px';row.style.padding='4px 2px';const cb=document.createElement('input');cb.type='checkbox';cb.value=s;cb.id=id;const sp=document.createElement('span');sp.textContent=s;sp.style.fontSize='14px';row.appendChild(cb);row.appendChild(sp);list.appendChild(row);});
    const actions=document.createElement('div');actions.style.display='flex';actions.style.justifyContent='space-between';actions.style.gap='8px';
    const clear=document.createElement('button');clear.type='button';clear.textContent='Leegmaken';
    const apply=document.createElement('button');apply.type='button';apply.textContent='Toepassen';
    [clear,apply].forEach(b=>{b.style.padding='6px 10px';b.style.borderRadius='8px';b.style.border='1px solid rgba(255,255,255,.15)';b.style.background='rgba(255,255,255,.08)';b.style.color='inherit';});
    panel.append(list,actions);wrap.append(btn,panel);host.insertBefore(wrap,host.firstChild.nextSibling);
    const sel=getSel();[...list.querySelectorAll('input')].forEach(cb=>cb.checked=sel.includes(cb.value));
    btn.addEventListener('click',e=>{e.stopPropagation();panel.style.display=panel.style.display==='none'?'block':'none'});
    document.addEventListener('click',e=>{if(!wrap.contains(e.target)) panel.style.display='none'});
    clear.addEventListener('click',()=>{[...list.querySelectorAll('input')].forEach(cb=>cb.checked=false)});
    apply.addEventListener('click',()=>{const chosen=[...list.querySelectorAll('input:checked')].map(cb=>cb.value);setSel(chosen);panel.style.display='none';filter()});
  }
  function filter(){
    const chosen=getSel(); const cards=document.querySelectorAll('.glass-card'); if(!cards.length) return;
    cards.forEach(card=>{const svcEl=card.querySelector('select.streaming-service-select'); const val=svcEl?svcEl.value:(card.getAttribute('data-streaming')||''); const show=(chosen.length===0) ? true : chosen.includes(norm(val)); card.style.display=show?'':'none';});
  }
  function imdbEdit(){
    const cards=document.querySelectorAll('.glass-card');
    cards.forEach(card=>{
      if(card.dataset.imdbEnhanced) return;
      const p=[...card.querySelectorAll('p')].find(x=>/^\s*IMDB\s*:/.test(x.textContent));
      if(!p) return;
      card.dataset.imdbEnhanced='1';
      const txt=p.textContent; const m=txt.match(/IMDB\s*:\s*([0-9.]+|N\/[AB])/i); const cur=m?m[1]:'N/B';
      p.innerHTML='<label style="font-weight:600;margin-right:6px">IMDB:</label><input class="imdb-inline" value="'+(cur||'')+'" style="width:64px;padding:4px 6px;border:1px solid rgba(0,0,0,.2);border-radius:6px" />';
      const input=p.querySelector('input.imdb-inline');
      input.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault(); input.blur();}});
      input.addEventListener('blur',()=>{
        const val=input.value.trim();
        // save into app state if possible
        try{
          const id=card.dataset.itemId;
          if(window.app && app.state && Array.isArray(app.state.items)){
            const it=app.state.items.find(x=> (''+x.id)==(''+id));
            if(it){ it.imdbRating=val; if(app.persist) app.persist(); }
          }
        }catch(e){}
      });
    });
  }
  function ready(fn){if(document.readyState!=='loading')fn();else document.addEventListener('DOMContentLoaded',fn)}
  ready(function(){ createMulti(); setTimeout(filter,50); imdbEdit(); if(window.app&&typeof app.render==='function'){const old=app.render.bind(app); app.render=function(){const r=old(); try{setTimeout(()=>{filter(); imdbEdit();},10);}catch(e){} return r;};}});
})();