const PRICES={
  esencial:{name:"Esencial",price:490000,detail:"Sitio profesional, responsive, hasta 5 secciones, botón de WhatsApp, datos de contacto y configuración inicial."},
  profesional:{name:"Profesional",price:790000,detail:"Hasta 8 secciones, formularios comerciales, SEO inicial, integración de redes, analítica y dominio."},
  premium:{name:"Premium",price:1190000,detail:"Experiencia avanzada, arquitectura personalizada, automatizaciones, integraciones y acompañamiento de lanzamiento."}
};
const STYLO_WA="5493435343413";
const money=n=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n);
const form=document.getElementById("quoteForm");
const result=document.getElementById("result");\nlet currentQuote=null;
form.addEventListener("submit",e=>{
  e.preventDefault();
  const d=Object.fromEntries(new FormData(form).entries());
  const p=PRICES[d.plan]||PRICES.esencial;\n  currentQuote={...d,plan:d.plan};
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

const mpPayBtn=document.getElementById("mpPayBtn");
if(mpPayBtn){
  mpPayBtn.addEventListener("click",async()=>{
    if(!currentQuote) return;
    const original=mpPayBtn.textContent;
    mpPayBtn.disabled=true;
    mpPayBtn.textContent="ABRIENDO MERCADO PAGO…";
    try{
      const response=await fetch("/api/desarrollo-web/create-order",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(currentQuote)
      });
      const data=await response.json();
      if(!response.ok||!data.ok||!data.checkout_url) throw new Error(data.error||"No se pudo iniciar el pago.");
      location.href=data.checkout_url;
    }catch(error){
      alert(error.message||"No se pudo iniciar Mercado Pago.");
      mpPayBtn.disabled=false;
      mpPayBtn.textContent=original;
    }
  });
}
