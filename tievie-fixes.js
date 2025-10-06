/* tievie-fixes.js — v3.37 (nocache) */
(function(){
  const VERSION = "v3.37 — nocache + streaming multi-select + IMDb edit";
  function ready(fn){ if(document.readyState!=="loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  const SERVICES=["Streamz","Netflix","Prime Video","Apple TV+","VRT MAX","Go Play","NPO","Disney+","Onbekend"];
  const KEY="tievie_stream_multi_v5";
  function norm(s){ if(!s) return "Onbekend"; s=String(s).trim().toLowerCase();
    if(s.startsWith("appl"))return"Apple TV+";
    if(s.startsWith("netf"))return"Netflix";
    if(s.includes("play"))return"Go Play";
    if(s.startsWith("vrt"))return"VRT MAX";
    if(s.startsWith("prim"))return"Prime Video";
    if(s.startsWith("strea"))return"Streamz";
    if(s.startsWith("np"))return"NPO";
    if(s.startsWith("disn"))return"Disney+";
    return "Onbekend";
  }
  const getSel=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v:[]}catch(e){return[]}};
  const setSel=(a)=>localStorage.setItem(KEY,JSON.stringify(a||[]));

  function badge(){
    document.querySelectorAll('#verBadge').forEach(n=>n.remove());
    const b=document.createElement('div'); b.id='verBadge'; b.textContent=VERSION;
    Object.assign(b.style,{position:'fixed',right:'12px',bottom:'12px',padding:'6px 10px',borderRadius:'10px',
      background:'rgba(20,60,120,.9)',color:'#fff',font:'12px/1.1 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial',zIndex:'999999'});
    document.body.appendChild(b);
  }
  function createFilter(){
    const host=document.querySelector('.filters')||document.querySelector('.toolbar')||document.querySelector('main')||document.body;
    if(document.getElementById('streaming-multi-wrap'))return;
    const wrap=document.createElement('div'); wrap.id='streaming-multi-wrap'; wrap.style.display='inline-block'; wrap.style.position='relative'; wrap.style.marginLeft='12px';
    const btn=document.createElement('button'); btn.type='button'; btn.textContent='Streaming';
    Object.assign(btn.style,{padding:'8px 12px',borderRadius:'10px',border:'1px solid rgba(255,255,255,.15)',background:'rgba(255,255,255,.08)',color:'inherit'});
    const panel=document.createElement('div'); panel.id='streaming-multi-panel';
    Object.assign(panel.style,{position:'absolute',top:'calc(100% + 6px)',left:'0',minWidth:'240px',padding:'12px',borderRadius:'12px',
      border:'1px solid rgba(255,255,255,.12)',background:'rgba(15,20,32,.98)',boxShadow:'0 14px 44px rgba(0,0,0,.35)',zIndex:'999999',display:'none'});
    const list=document.createElement('div'); list.style.maxHeight='260px'; list.style.overflow='auto'; list.style.marginBottom='10px';
    SERVICES.forEach(s=>{const r=document.createElement('label');
      Object.assign(r.style,{display:'flex',alignItems:'center',gap:'8px',padding:'6px 2px'});
      const cb=document.createElement('input'); cb.type='checkbox'; cb.value=s;
      const sp=document.createElement('span'); sp.textContent=s; sp.style.fontSize='14px';
      r.append(cb,sp); list.appendChild(r);
    });
    const bar=document.createElement('div'); Object.assign(bar.style,{display:'flex',justifyContent:'space-between',gap:'8px'});
    function styleBtn(b){Object.assign(b.style,{padding:'8px 12px',borderRadius:'10px',border:'1px solid rgba(255,255,255,.15)',background:'rgba(255,255,255,.08)',color:'inherit'})}
    const clear=document.createElement('button'); clear.type='button'; clear.textContent='Leegmaken'; styleBtn(clear);
    const apply=document.createElement('button'); apply.type='button'; apply.textContent='Toepassen'; styleBtn(apply);
    bar.append(clear,apply);
    panel.append(list,bar);
    wrap.append(btn,panel);
    host.insertBefore(wrap, host.firstChild ? host.firstChild.nextSibling : host.firstChild);
    const sel=getSel();[...list.querySelectorAll('input[type=checkbox]')].forEach(cb=>cb.checked=sel.includes(cb.value));
    btn.addEventListener('click',e=>{e.stopPropagation();panel.style.display=panel.style.display==='none'?'block':'none'});
    document.addEventListener('click',e=>{if(!wrap.contains(e.target))panel.style.display='none'});
    clear.addEventListener('click',()=>{[...list.querySelectorAll('input[type=checkbox]')].forEach(cb=>cb.checked=false)});
    apply.addEventListener('click',()=>{const chosen=[...list.querySelectorAll('input:checked')].map(cb=>cb.value);setSel(chosen);panel.style.display='none';applyFilter()});
  }
  function applyFilter(){
    const chosen=getSel();
    const cards=document.querySelectorAll('.glass-card,[data-item-id]');
    cards.forEach(card=>{
      let val=""; const sel=card.querySelector('select.streaming-service-select');
      if(sel){val=sel.value}else{val=card.getAttribute('data-streaming')||""}
      const show=(chosen.length===0)?true:chosen.includes(norm(val));
      card.style.display=show?"":"none";
    });
  }
  function imdbEdit(){
    const cards=document.querySelectorAll('.glass-card,[data-item-id]');
    cards.forEach(card=>{
      if(card.dataset.imdbEnhanced==='1')return;
      const row=[...card.querySelectorAll('p,div,span')].find(n=>/^\s*IMDB\s*:/.test((n.textContent||"").trim()));
      if(!row)return;
      card.dataset.imdbEnhanced='1';
      const m=(row.textContent||"").match(/IMDB\s*:\s*([0-9.]+|N\/[AB])/i); const cur=m?m[1]:'N/B';
      row.innerHTML='<label style="font-weight:600;margin-right:6px">IMDB:</label><input class="imdb-inline" value="'+(cur||'')+'" style="width:68px;padding:4px 6px;border:1px solid rgba(255,255,255,.25);border-radius:8px;background:rgba(255,255,255,.06);color:inherit"/>';
      const input=row.querySelector('.imdb-inline');
      input.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();input.blur();}});
      input.addEventListener('blur',()=>{
        const val=input.value.trim();
        try{
          const id=card.getAttribute('data-item-id');
          if(window.app&&app.state&&Array.isArray(app.state.items)){
            const it=app.state.items.find(x=>(''+x.id)==(''+id));
            if(it){ it.imdbRating=val; if(app.persist) app.persist(); if(app.render) app.render(); }
          }
        }catch(e){}
      });
    });
  }
  function patchRender(){
    if(window.app&&typeof app.render==='function'&&!app.__patched37){
      app.__patched37=true;
      const old=app.render.bind(app);
      app.render=function(){const r=old(); try{setTimeout(()=>{imdbEdit();applyFilter();},0)}catch(e){} return r;};
    }else{
      setInterval(()=>{imdbEdit();},1200);
    }
  }
  ready(function(){ badge(); createFilter(); applyFilter(); imdbEdit(); patchRender(); });
})();