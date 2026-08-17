const NEWS_URL="https://noticias.stylocamion.com/";

function normalizeNewsLinks(){
  document.querySelectorAll("a[href]").forEach(link=>{
    const raw=(link.getAttribute("href")||"").trim();
    if(!raw) return;
    const normalized=raw.replace(/\/$/,"").toLowerCase();
    const legacyNewsPaths=new Set([
      "/noticias",
      "https://stylocamion.com/noticias",
      "http://stylocamion.com/noticias",
      "https://www.stylocamion.com/noticias",
      "http://www.stylocamion.com/noticias",
      "https://blog.stylocamion.com",
      "http://blog.stylocamion.com"
    ]);
    if(legacyNewsPaths.has(normalized)) link.setAttribute("href",NEWS_URL);
  });
}

normalizeNewsLinks();

const button=document.querySelector(".menu-button");
const menu=document.querySelector("#menu");
button?.addEventListener("click",()=>{
  const open=menu.classList.toggle("open");
  button.setAttribute("aria-expanded",String(open));
});
menu?.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{
  menu.classList.remove("open");
  button?.setAttribute("aria-expanded","false");
}));
const year=document.querySelector("#year");
if(year) year.textContent=new Date().getFullYear();
