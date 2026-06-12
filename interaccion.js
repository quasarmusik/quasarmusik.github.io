/* ════════════ ✏️ CONFIGURACIÓN ════════════ */
const WA_NUMBER = "34680124466";  // WhatsApp con prefijo país, sin + ni espacios
const WA_TEXT = "Hola Quasar 👋 Quiero contaros mi proyecto."; // mensaje único para todos los botones
/* ═══════════════════════════════════════════ */

const waUrl = ()=>`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_TEXT)}`;
document.querySelectorAll(".wa-link").forEach(el=>{
  el.href = waUrl();
  if(el.tagName==="A" && !el.target) el.target="_blank";
});

const nav=document.getElementById("nav");
addEventListener("scroll",()=>nav.classList.toggle("scrolled",scrollY>10));

const toggle=document.getElementById("navToggle"),links=document.getElementById("navLinks");
toggle.addEventListener("click",()=>{links.classList.toggle("show");toggle.classList.toggle("x")});
links.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{links.classList.remove("show");toggle.classList.remove("x")}));

const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>io.observe(el));

document.getElementById("year").textContent=new Date().getFullYear();

/* Respeta "reducir movimiento": muestra el póster en vez del vídeo */
if(matchMedia("(prefers-reduced-motion: reduce)").matches){
  document.querySelectorAll(".room-video").forEach(v=>{ v.removeAttribute("autoplay"); try{v.pause();}catch(e){} });
}

/* ════════════ CARRUSEL DE TRABAJOS ════════════ */
(function(){
  const root=document.getElementById("works-carousel");
  if(!root) return;
  const viewport=root.querySelector(".viewport");
  const track=document.getElementById("works-track");
  const slides=Array.from(track.children);
  const N=slides.length;
  const dotsWrap=document.getElementById("works-dots");
  const controls=document.getElementById("works-controls");
  const prevBtn=document.getElementById("works-prev");
  const nextBtn=document.getElementById("works-next");
  const GAP=18, DELAY=4500;
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  let visible=3, step=0, index=0, maxIndex=0, timer=null, paused=false;

  const visCount=()=> innerWidth<640 ? 1 : innerWidth<1000 ? 2 : 3;

  function build(){
    visible=Math.min(visCount(), N);
    maxIndex=Math.max(0, N - visible);
    const scroll = N>visible;
    layout();
    buildDots(scroll);
    controls.classList.toggle("hidden", !scroll);
    index=Math.min(index, maxIndex);
    move(false);
    restart();
  }
  function layout(){
    const vpw=viewport.clientWidth;
    const slideW=(vpw-GAP*(visible-1))/visible;
    step=slideW+GAP;
    slides.forEach(s=> s.style.width=slideW+"px");
    move(false);
  }
  function buildDots(scroll){
    dotsWrap.innerHTML="";
    if(!scroll) return;
    for(let i=0;i<=maxIndex;i++){
      const b=document.createElement("button");
      b.className="dot"+(i===0?" active":"");
      b.setAttribute("aria-label","Ir al trabajo "+(i+1));
      b.addEventListener("click",()=>{ goTo(i); restart(); });
      dotsWrap.appendChild(b);
    }
  }
  function setDots(){
    const ds=dotsWrap.children; if(!ds.length) return;
    for(let i=0;i<ds.length;i++) ds[i].classList.toggle("active", i===index);
  }
  function move(anim){
    track.style.transition=(anim&&!reduce)?"transform .6s cubic-bezier(.4,0,.2,1)":"none";
    track.style.transform="translateX("+(-index*step)+"px)";
    setDots();
  }
  function goTo(i,anim){ index=Math.max(0,Math.min(i,maxIndex)); move(anim!==false); }
  function next(){ if(N<=visible) return; if(index>=maxIndex){ index=0; move(false); } else { index++; move(true); } }
  function prev(){ if(N<=visible) return; if(index<=0){ index=maxIndex; move(false); } else { index--; move(true); } }
  function autoTick(){ if(!paused) next(); }
  function start(){ if(reduce||N<=visible||paused) return; stop(); timer=setInterval(autoTick,DELAY); }
  function stop(){ if(timer){ clearInterval(timer); timer=null; } }
  function restart(){ stop(); start(); }

  nextBtn.addEventListener("click",()=>{ next(); restart(); });
  prevBtn.addEventListener("click",()=>{ prev(); restart(); });
  root.addEventListener("mouseenter",stop);
  root.addEventListener("mouseleave",()=>{ if(!paused) start(); });
  document.addEventListener("visibilitychange",()=>{ document.hidden?stop():(!paused&&start()); });

  let curVis=visCount();
  addEventListener("resize",()=>{ if(visCount()!==curVis){ curVis=visCount(); build(); } else layout(); });

  build();

  /* Enganches para coordinar con los reproductores de Spotify */
  window.QuasarWorks = {
    holdOn(i){ paused=true; stop(); goTo(Math.min(i,maxIndex), true); }, /* suena una canción: fija el carrusel */
    release(advance){ paused=false; if(advance) next(); start(); }       /* pausada/terminada: reanuda (y avanza si terminó) */
  };
})();

/* ════════════ COORDINACIÓN DE REPRODUCCIÓN (API de Spotify) ════════════ */
window.onSpotifyIframeApiReady = (IFrameAPI) => {
  const nodes = Array.from(document.querySelectorAll(".spotify-embed"));
  const players = nodes.map(()=>({ctrl:null, lastPos:0, duration:0}));
  let active = -1; /* índice de la canción que está sonando, -1 = ninguna */

  nodes.forEach((node, i) => {
    IFrameAPI.createController(node, { uri: node.dataset.uri, width:"100%", height:"352" }, (controller) => {
      players[i].ctrl = controller;
      controller.addListener("playback_update", (e) => {
        const d = e.data, p = players[i];
        p.duration = d.duration;
        const isPlaying = !d.isPaused;
        if (isPlaying) {
          p.lastPos = d.position;
          if (active !== i) {
            if (active >= 0 && players[active] && players[active].ctrl) {
              try { players[active].ctrl.pause(); } catch(err){}   /* nunca dos a la vez */
            }
            active = i;
            if (window.QuasarWorks) window.QuasarWorks.holdOn(i);   /* detén el carrusel en esta canción */
          }
        } else if (active === i) {
          const finished = p.duration > 0 && p.lastPos >= p.duration - 1500;
          active = -1;
          if (window.QuasarWorks) window.QuasarWorks.release(finished); /* si terminó, pasa a la siguiente */
        }
      });
    });
  });
};
/* ═══════════════════════════════════════════ */
