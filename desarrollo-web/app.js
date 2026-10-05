const PRICES={
  esencial:{name:"Esencial",price:490000,detail:"Sitio profesional, responsive, hasta 5 secciones, botón de WhatsApp, datos de contacto y configuración inicial."},
  profesional:{name:"Profesional",price:790000,detail:"Hasta 8 secciones, formularios comerciales, SEO inicial, integración de redes, analítica y dominio."},
  premium:{name:"Premium",price:1190000,detail:"Experiencia avanzada, arquitectura personalizada, automatizaciones, integraciones y acompañamiento de lanzamiento."}
};
const STYLO_WA="5493435343413";
const money=n=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n);
const form=document.getElementById("quoteForm");
const result=document.getElementById("result");
form.addEventListener("submit",e=>{
  e.preventDefault();
  const d=Object.fromEntries(new FormData(form).entries());
  const p=PRICES[d.plan]||PRICES.esencial;
  document.getElementById("resultCompany").textContent=d.empresa;
  document.getElementById("resultPlan").textContent=p.name;
  document.getElementById("resultPrice").textContent=money(p.price)+" + IVA";
  document.getElementById("resultDetail").textContent=p.detail;
  const msg=[
    "Hola Lic. Francisco Spoturno, te contacto por STYLO DESARROLLO WEB.",
    "Quiero avanzar con la propuesta de mi empresa:",
    "",
    "Empresa: "+d.empresa,
    "Actividad: "+d.actividad,
    "Ubicación: "+d.ubicacion,
    "Objetivo: "+d.objetivo,
    "Plan: "+p.name,
    "Presupuesto preliminar: "+money(p.price)+" + IVA",
    "Mi WhatsApp: "+d.telefono
  ].join("\n");
  document.getElementById("waLink").href="https://wa.me/"+STYLO_WA+"?text="+encodeURIComponent(msg);
  form.hidden=true;
  result.hidden=false;
  result.scrollIntoView({behavior:"smooth",block:"start"});
});
document.getElementById("editBtn").addEventListener("click",()=>{
  result.hidden=true;form.hidden=false;form.scrollIntoView({behavior:"smooth",block:"start"});
});
document.querySelectorAll(".plan-select").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const value=btn.dataset.plan;
    const radio=document.querySelector('input[name="plan"][value="'+value+'"]');
    if(radio) radio.checked=true;
    document.getElementById("cotizador").scrollIntoView({behavior:"smooth",block:"start"});
  });
});

(() => {
  const root=document.querySelector("[data-carousel]");
  if(!root) return;
  const viewport=root.querySelector(".carousel-viewport");
  const track=root.querySelector(".carousel-track");
  const dotsWrap=root.querySelector(".carousel-dots");
  const prev=root.querySelector(".carousel-arrow.prev");
  const next=root.querySelector(".carousel-arrow.next");
  const originals=[...track.children];
  if(originals.length<2) return;

  const first=originals[0].cloneNode(true);
  const last=originals[originals.length-1].cloneNode(true);
  track.insertBefore(last, originals[0]);
  track.appendChild(first);

  let index=1;
  let timer=null;
  let startX=0;
  let dragging=false;

  const dots=originals.map((_,i)=>{
    const b=document.createElement("button");
    b.type="button";
    b.setAttribute("aria-label","Ir al slide "+(i+1));
    b.addEventListener("click",()=>goTo(i+1,true));
    dotsWrap.appendChild(b);
    return b;
  });

  function width(){ return viewport.getBoundingClientRect().width; }
  function render(animate=true){
    track.style.transition=animate?"transform .75s cubic-bezier(.22,.61,.36,1)":"none";
    track.style.transform="translate3d("+(-index*width())+"px,0,0)";
    const real=(index-1+originals.length)%originals.length;
    dots.forEach((d,i)=>d.classList.toggle("active",i===real));
  }
  function goTo(i,user=false){
    index=i; render(true);
    if(user) restart();
  }
  function nextSlide(){ index+=1; render(true); }
  function prevSlide(){ index-=1; render(true); }
  function restart(){
    clearInterval(timer);
    timer=setInterval(nextSlide,4500);
  }

  track.addEventListener("transitionend",()=>{
    if(index===0){ index=originals.length; render(false); }
    else if(index===originals.length+1){ index=1; render(false); }
  });
  next.addEventListener("click",()=>{nextSlide();restart();});
  prev.addEventListener("click",()=>{prevSlide();restart();});
  viewport.addEventListener("touchstart",e=>{startX=e.touches[0].clientX;dragging=true;},{passive:true});
  viewport.addEventListener("touchend",e=>{
    if(!dragging) return;
    const dx=e.changedTouches[0].clientX-startX;
    if(Math.abs(dx)>45){ dx<0?nextSlide():prevSlide(); restart(); }
    dragging=false;
  },{passive:true});
  window.addEventListener("resize",()=>render(false));
  render(false);
  restart();
})();
