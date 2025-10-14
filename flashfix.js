// flashfix.js — voorkomt korte codeflits bij refresh
(function(){
  try{
    const d=document.documentElement;
    const oldVis=d.style.visibility, oldOp=d.style.opacity;
    d.style.visibility='hidden'; d.style.opacity='0';
    function show(){requestAnimationFrame(()=>{d.style.visibility=oldVis||'visible';d.style.opacity=oldOp||'1';});}
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',show,{once:true});
      setTimeout(show,3000);
    } else show();
  }catch(e){document.documentElement.style.visibility='visible';document.documentElement.style.opacity='1';}
})();