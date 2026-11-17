(function(){
  document.querySelectorAll('.chart-box svg[data-tips]').forEach(function(svg){
    var tips; try{tips=JSON.parse(svg.getAttribute('data-tips'))}catch(e){return}
    if(!tips||!tips.length)return;
    var box=svg.parentNode, tip=document.createElement('div'); tip.className='chart-tip'; box.appendChild(tip);
    var vb=svg.viewBox.baseVal, NS='http://www.w3.org/2000/svg', ln=document.createElementNS(NS,'line');
    ln.setAttribute('y1',14); ln.setAttribute('y2',vb.height-30); ln.setAttribute('stroke','#1f5148'); ln.setAttribute('stroke-opacity','.3'); ln.setAttribute('stroke-width','1.5'); ln.style.display='none'; svg.appendChild(ln);
    function show(e){
      var r=svg.getBoundingClientRect(), p=e.touches?e.touches[0]:e, f=(p.clientX-r.left)/r.width*100, best=tips[0];
      for(var i=1;i<tips.length;i++) if(Math.abs(tips[i][0]-f)<Math.abs(best[0]-f)) best=tips[i];
      ln.setAttribute('x1',best[0]/100*vb.width); ln.setAttribute('x2',best[0]/100*vb.width); ln.style.display='';
      tip.innerHTML=best[1]; tip.style.display='block';
      var x=best[0]/100*r.width, w=tip.offsetWidth/2; x=Math.max(w+2,Math.min(r.width-w-2,x));
      tip.style.left=x+'px'; tip.style.top=Math.max(34,(p.clientY-r.top))+'px';
    }
    function hide(){tip.style.display='none'; ln.style.display='none'}
    svg.addEventListener('mousemove',show); svg.addEventListener('touchstart',show,{passive:true}); svg.addEventListener('touchmove',show,{passive:true});
    svg.addEventListener('mouseleave',hide); svg.addEventListener('touchend',function(){setTimeout(hide,1500)});
  });
  document.querySelectorAll('.bd-calc').forEach(function(c){
    var px=+c.getAttribute('data-px'), dv=+c.getAttribute('data-div'), r=c.querySelector('input[type=range]');
    var f=function(v,d){return '$'+v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})};
    function upd(){var a=+r.value, sh=a/px, m=sh*dv;
      c.querySelector('.amt').textContent=f(a,0); c.querySelector('.shares').textContent='About '+sh.toLocaleString('en-US',{maximumFractionDigits:1})+' shares at '+f(px,2);
      c.querySelector('[data-o=m]').textContent=f(m,2); c.querySelector('[data-o=y]').textContent=f(m*12,0); c.querySelector('[data-o=d]').textContent=f(m*12/365,2);}
    r.addEventListener('input',upd); upd();
  });
  document.querySelectorAll('[data-more]').forEach(function(b){
    var t=document.getElementById(b.getAttribute('data-more')), lab=b.textContent;
    b.addEventListener('click',function(){t.classList.toggle('open'); b.textContent=t.classList.contains('open')?'Show less':lab;});
  });
})();