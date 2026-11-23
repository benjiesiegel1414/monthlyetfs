/* Article side rails: outline, ETFs mentioned, related reading, top funds.
   Rails stay fixed and never scroll on their own; only what fits on screen is shown. */
(function(){
  if(window.__artRails)return; window.__artRails=1;
  var C={brand:'#1f5148',accent:'#30776C',font:"Lato,-apple-system,'Segoe UI',sans-serif",skip:/^(index|blog|advertise|etf|privacy|terms|faq|methodology)$/,blog:'/blog.html',cardSel:'a.post-card',titleSel:'h2',
   csv:'https://docs.google.com/spreadsheets/d/e/2PACX-1vSscSF78pEGxi9Lcx2YHZjHHAkyy75b5Icb6A8nK2aehtmEq-xgpFPA7sQdkmZYKjkUdrtPL1SdMm62/pub?output=csv',nameCol:'Name',valCol:'Dividend Yield',
   fund:function(s){return '/etf.html?symbol='+encodeURIComponent(s);},topTitle:'Top yields, no price decay',bottomGap:24,
   top:function(rows){var y=function(r){return parseFloat(r['Dividend Yield'])||0;};return rows.filter(function(r){return /^no$/i.test(r['Price Decay']||'');}).sort(function(a,b){return y(b)-y(a);});},
   tools:[['All monthly ETFs ranked','/'],['All monthly dividend ETFs','/all-monthly-dividend-etfs.html'],['Best ETFs for monthly income','/best-etfs-for-monthly-income-2026.html'],['Monthly dividend calendar','/monthly-dividend-etf-calendar-2026.html'],['How we rate funds','/methodology.html'],['All articles','/blog.html']]};
  var path=location.pathname.replace(/\/$/,'').replace(/\.html$/,''),slug=path.split('/').pop();
  if(!slug||path.split('/').length>2||C.skip.test(slug))return;
  var hsAll=[].slice.call(document.querySelectorAll('h2')).filter(function(h){return !h.closest('header,footer,nav,aside')&&h.offsetParent;});
  if(hsAll.length<3)return;
  var col=hsAll[0].parentNode;
  while(col&&col!==document.body){var n=hsAll.filter(function(h){return col.contains(h);}).length;if(n>=hsAll.length*0.7)break;col=col.parentNode;}
  if(!col||col===document.body)return;
  var hs=hsAll.filter(function(h){return col.contains(h)&&!/related|sources|disclaimer|more from|keep reading/i.test(h.textContent);});
  if(hs.length<2)return;
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  var B=C.brand,A=C.accent,W=214;
  var CSS='.arr-r{position:fixed;width:'+W+'px;overflow:hidden;z-index:40;font-family:'+C.font+';opacity:0;pointer-events:none;transform:translateY(8px);transition:opacity .25s,transform .25s}.arr-r.show{opacity:1;pointer-events:auto;transform:none}.arr-r *,.arr-in *{box-sizing:border-box}.arr-b{background:#fff;border:1px solid #e2e8ee;border-radius:14px;margin-bottom:14px;overflow:hidden;box-shadow:0 6px 22px rgba(15,35,55,.07)}.arr-b h5{margin:0;padding:11px 14px;font-size:10.5px;font-weight:900;letter-spacing:1.4px;text-transform:uppercase;color:'+B+';border-bottom:1px solid #e2e8ee;background:#f6f9fb;display:flex;justify-content:space-between;align-items:center;line-height:1.3}.arr-b h5 a{font-size:11px;letter-spacing:0;text-transform:none;color:'+B+';text-decoration:none;font-weight:700;opacity:.8}.arr-p{height:3px;background:#e2e8ee}.arr-p i{display:block;height:100%;width:0;background:linear-gradient(90deg,'+B+','+A+')}.arr-t{padding:6px 0}.arr-t a{display:block;padding:6px 14px 6px 12px;border-left:2px solid transparent;color:#5d6b7a;font-size:12.5px;line-height:1.4;text-decoration:none}.arr-t a:hover{color:'+B+'}.arr-t a.on{color:'+B+';font-weight:700;border-left-color:'+A+';background:rgba(0,0,0,.035)}.arr-b a.row{display:flex;align-items:center;gap:8px;padding:9px 14px;border-bottom:1px solid #eef2f6;text-decoration:none;color:#222;font-size:12.5px}.arr-b a.row:last-child{border-bottom:0}.arr-b a.row:hover{background:#f6f9fb}.arr-b a.row b{font-weight:900;color:'+B+';min-width:48px}.arr-b a.row span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#6b7785;font-size:11.5px}.arr-b a.row em{font-style:normal;font-weight:800;color:'+B+';font-size:12px;white-space:nowrap}.arr-b a.art{display:block;padding:10px 14px;border-bottom:1px solid #eef2f6;text-decoration:none;color:'+B+';font-size:13px;font-weight:700;line-height:1.38}.arr-b a.art:last-child{border-bottom:0}.arr-b a.art:hover{background:#f6f9fb}.arr-b a.lnk{display:flex;justify-content:space-between;gap:8px;padding:9px 14px;border-bottom:1px solid #eef2f6;text-decoration:none;color:#222;font-size:12.5px;font-weight:600}.arr-b a.lnk:last-child{border-bottom:0}.arr-b a.lnk:hover{background:#f6f9fb}.arr-b a.lnk::after{content:"\\2192";color:'+B+'}.arr-in{margin:34px 0;font-family:'+C.font+'}.arr-in .g{display:grid;grid-template-columns:1fr 1fr;gap:16px}.arr-in .arr-b{margin:0}@media(max-width:640px){.arr-in .g{grid-template-columns:1fr}}';
  var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  hs.forEach(function(h,i){if(!h.id)h.id='section-'+(i+1);});
  var L=document.createElement('aside');L.className='arr-r';L.setAttribute('aria-label','Article outline');
  L.innerHTML='<div class="arr-b"><h5>On this page</h5><div class="arr-p"><i></i></div><div class="arr-t">'+hs.slice(0,12).map(function(h){return '<a href="#'+h.id+'">'+esc(h.textContent.trim().replace(/\s+/g,' '))+'</a>';}).join('')+'</div></div><div class="arr-b" data-k="etf" hidden><h5>ETFs in this article</h5><div></div></div>';
  var R=document.createElement('aside');R.className='arr-r';R.setAttribute('aria-label','Related reading');
  R.innerHTML='<div class="arr-b" data-k="rel" hidden><h5>Keep reading <a href="'+C.blog+'">All</a></h5><div></div></div><div class="arr-b" data-k="top" hidden><h5>'+C.topTitle+' <a href="/">All</a></h5><div></div></div><div class="arr-b"><h5>Explore</h5>'+C.tools.map(function(t){return '<a class="lnk" href="'+t[1]+'">'+t[0]+'</a>';}).join('')+'</div>';
  document.body.appendChild(L);document.body.appendChild(R);
  var inl=document.createElement('div');inl.className='arr-in';inl.innerHTML='<div class="g"><div class="arr-b" data-k="rel" hidden><h5>Keep reading <a href="'+C.blog+'">All</a></h5><div></div></div><div class="arr-b" data-k="etf" hidden><h5>ETFs in this article</h5><div></div></div></div>';
  var anchor=hs[Math.min(3,hs.length-1)];if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(inl,anchor);
  var links=[].slice.call(L.querySelectorAll('.arr-t a')),prog=L.querySelector('.arr-p i'),wide=false;
  function topOffset(){var t=16;[].slice.call(document.querySelectorAll('header,nav,#wxs,.site-network-bar,.tde-head')).forEach(function(e){var cs=getComputedStyle(e);if(cs.position==='fixed'||cs.position==='sticky'){var r=e.getBoundingClientRect();if(r.top<=2&&r.bottom<220&&r.width>innerWidth*0.6)t=Math.max(t,r.bottom+16);}});return t;}
  /* keep the rails static: trim rows, then whole boxes, until everything fits on screen */
  function fit(rail,top){
    var avail=window.innerHeight-top-C.bottomGap,boxes=[].slice.call(rail.querySelectorAll('.arr-b'));
    boxes.forEach(function(b){b.style.display='';[].slice.call(b.querySelectorAll('a.row,a.art,a.lnk,.arr-t a')).forEach(function(a){a.style.display='';});});
    var guard=0;
    while(rail.scrollHeight>avail&&guard++<80){
      var vis=boxes.filter(function(b){return !b.hidden&&b.style.display!=='none';});if(!vis.length)break;
      var last=vis[vis.length-1],rows=[].slice.call(last.querySelectorAll('a.row,a.art,a.lnk,.arr-t a')).filter(function(a){return a.style.display!=='none';});
      if(rows.length>3)rows[rows.length-1].style.display='none';else if(vis.length>1)last.style.display='none';else if(rows.length>1)rows[rows.length-1].style.display='none';else break;
    }
    rail.style.maxHeight=avail+'px';
  }
  function place(){var rc=col.getBoundingClientRect(),top=topOffset();wide=rc.left>=W+30&&(window.innerWidth-rc.right)>=W+30;
    L.style.display=R.style.display=wide?'':'none';inl.style.display=wide?'none':'';
    L.style.top=R.style.top=top+'px';L.style.left=Math.max(10,rc.left-W-24)+'px';R.style.left=(rc.right+24)+'px';
    if(wide){fit(L,top);fit(R,top);}}
  function onScroll(){
    var a=hs[0].getBoundingClientRect().top,rc=col.getBoundingClientRect(),vh=window.innerHeight,show=wide&&a<vh*0.5&&rc.bottom>vh*0.75;
    L.classList.toggle('show',show);R.classList.toggle('show',show);
    prog.style.width=(Math.max(0,Math.min(1,(-rc.top+vh*0.3)/Math.max(1,rc.height)))*100).toFixed(1)+'%';
    var cur=0;hs.forEach(function(h,i){if(h.getBoundingClientRect().top<160)cur=i;});
    links.forEach(function(x,i){x.classList.toggle('on',i===cur);});
  }
  place();onScroll();window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',function(){place();onScroll();});
  function fill(k,html){if(!html)return;[].slice.call(document.querySelectorAll('.arr-b[data-k="'+k+'"]')).forEach(function(b){b.lastElementChild.innerHTML=html;b.hidden=false;});place();}
  var txt=col.textContent||'',cnt={},m,re=/\$([A-Z]{2,5})\b/g;while((m=re.exec(txt)))cnt[m[1]]=(cnt[m[1]]||0)+1;
  var h1=(document.querySelector('h1')||{}).textContent||'';(h1.match(/\b[A-Z]{3,5}\b/g)||[]).forEach(function(t){cnt[t]=(cnt[t]||0)+5;});
  var mine=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];});
  function csv(t){var L=t.trim().split(/\r?\n/),sp=function(l){var o=[],c='',q=false;for(var i=0;i<l.length;i++){var ch=l[i];if(ch==='"'){q=!q;continue;}if(ch===','&&!q){o.push(c);c='';continue;}c+=ch;}o.push(c);return o;},H=sp(L[0]).map(function(h){return h.trim();});
    return L.slice(1).map(function(l){var v=sp(l),o={};H.forEach(function(h,i){o[h]=(v[i]||'').trim();});return o;}).filter(function(r){return r.Symbol;});}
  function row(r){var nm=r[C.nameCol]||'';return '<a class="row" href="'+C.fund(r.Symbol)+'" title="'+esc(nm)+'"><b>$'+esc(r.Symbol)+'</b><span>'+esc(nm.replace(/[®™]/g,''))+'</span><em>'+esc(r[C.valCol]||'')+'</em></a>';}
  fetch(C.csv).then(function(r){return r.text();}).then(function(t){
    var rows=csv(t),E={};rows.forEach(function(r){E[r.Symbol.toUpperCase()]=r;});
    fill('etf',mine.filter(function(s){return E[s];}).slice(0,7).map(function(s){return row(E[s]);}).join(''));
    fill('top',C.top(rows).slice(0,6).map(row).join(''));
  }).catch(function(){});
  fetch(C.blog).then(function(r){return r.text();}).then(function(h){
    var doc=new DOMParser().parseFromString(h,'text/html'),list=[],seen={};
    [].slice.call(doc.querySelectorAll(C.cardSel)).forEach(function(c){var a=c.matches('a')?c:c.querySelector('a');if(!a)return;var u=new URL(a.getAttribute('href'),location.origin).pathname.replace(/\.html$/,'');var s=u.replace(/\/$/,'').split('/').pop();
      var te=c.querySelector(C.titleSel)||a,t=te.textContent.replace(/\bNEW\b\s*$/,'').trim();if(!t||seen[s]||s===slug)return;seen[s]=1;
      var tk=((t+' '+c.textContent).match(/\$[A-Z]{2,5}\b/g)||[]).map(function(x){return x.slice(1);});
      list.push({u:u,t:t,tk:tk,i:list.length});});
    var myT=mine.slice(0,4);
    list.forEach(function(o){o.s=o.tk.filter(function(t){return myT.indexOf(t)>-1;}).length*10-(o.i>12?1:0);});
    list.sort(function(a,b){return b.s-a.s||a.i-b.i;});
    fill('rel',list.slice(0,5).map(function(o){return '<a class="art" href="'+o.u+'">'+esc(o.t)+'</a>';}).join(''));
  }).catch(function(){});
})();
