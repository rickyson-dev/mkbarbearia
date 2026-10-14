/* ===== CONFIGURAÇÃO — edite aqui ===== */
const WHATS = "5563991164898";
const MSG = "Olá! Vim pelo site da MK Barbearia e gostaria de agendar um horário.";
/* ===================================== */
const wa = "https://wa.me/"+WHATS+"?text="+encodeURIComponent(MSG);
document.querySelectorAll(".wa-link").forEach(a=>{a.href=wa;a.target="_blank";a.rel="noopener"});
document.getElementById("ano").textContent=new Date().getFullYear();
const brl=v=>"R$ "+Number(v).toFixed(2).replace(".",",");
document.getElementById("svGrid").innerHTML=SERVICOS.map(s=>`<article class="card"><svg viewBox="0 0 24 24" aria-hidden="true">${s.i}</svg><h3>${s.n}</h3><p>${s.d}</p><div class="price">${s.p?brl(s.p):"Consulte nossos preços"}</div><a class="btn ghost wa-link" href="${wa}" target="_blank" rel="noopener" style="min-height:42px">Agendar</a></article>`).join("");
const bg=document.getElementById("burger"),lk=document.getElementById("links");
bg.onclick=()=>{const o=lk.classList.toggle("open");bg.setAttribute("aria-expanded",o)};
lk.onclick=e=>{if(e.target.tagName==="A"){lk.classList.remove("open");bg.setAttribute("aria-expanded",false)}};
