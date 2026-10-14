(() => {
  const $ = (id) => document.getElementById(id);
  if (!$("filaForm")) return;
  const K = "mk_fila", INTERVALO = 5000, TITULO = document.title;
  let eu = null, ultimo = null, timer = null, aviso = null;
  try { eu = JSON.parse(localStorage.getItem(K) || "null"); } catch (e) {}
  const guardar = (v) => { eu = v; try { v ? localStorage.setItem(K, JSON.stringify(v)) : localStorage.removeItem(K); } catch (e) {} };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const msg = (t, ok) => { const m = $("filaMsg"); m.textContent = t || ""; m.className = "fila-msg" + (ok ? " ok" : ""); };

  async function carregar() {
    try {
      const h = eu ? { "X-Fila-Id": eu.id, "X-Fila-Chave": eu.chave } : {};
      const r = await fetch("/api/fila", { headers: h, cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw d;
      render(d);
      $("filaStatus").textContent = "Atualiza sozinha · última: " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch (e) { $("filaStatus").textContent = (e && e.erro) || "Sem conexão. Tentando de novo…"; }
  }

  function render(d) {
    $("filaAtual").textContent = d.atendimento ? d.atendimento.nome : "—";
    $("filaVazia").hidden = d.espera.length > 0;
    $("filaLista").innerHTML = d.espera.map((p, i) =>
      `<li class="${eu && p.id === eu.id ? "voce" : ""}"><span class="n">${i + 1}</span><span>${esc(p.nome)}${eu && p.id === eu.id ? " <em>(você)</em>" : ""}</span>${i === 0 ? '<span class="prox">Próximo</span>' : ""}</li>`).join("");
    const box = $("filaMinha"), form = $("filaForm");
    let st = d.eu ? d.eu.status : null;
    if (eu && !st) { guardar(null); }
    if (eu && st === "esperando") {
      const pos = d.espera.findIndex((p) => p.id === eu.id) + 1;
      box.className = "fila-minha";
      box.innerHTML = `<small>Sua posição</small><strong>${pos}º</strong><p>${pos === 1 ? "Você é o próximo!" : "Faltam " + (pos - 1) + " antes de você."}</p><button type="button" id="filaSair">Sair da fila</button>`;
    } else if (eu && st === "chamado") {
      box.className = "fila-minha vez";
      box.innerHTML = `<strong>É a sua vez!</strong><p>Dirija-se à cadeira do barbeiro.</p><button type="button" id="filaSair">Cancelar</button>`;
    } else if (eu && (st === "atendido" || st === "removido")) {
      guardar(null);
      aviso = { txt: st === "atendido" ? "Atendimento concluído. Obrigado pela visita!" : "Você não está mais na fila.", ate: Date.now() + 8000 };
      st = null;
    }
    const ativo = !!eu;
    form.hidden = ativo;
    if (ativo) box.hidden = false;
    else if (aviso && aviso.ate > Date.now()) { box.className = "fila-minha"; box.innerHTML = `<p>${aviso.txt}</p>`; box.hidden = false; }
    else { box.innerHTML = ""; box.hidden = true; }
    if (st === "chamado" && ultimo !== "chamado") { navigator.vibrate && navigator.vibrate([300, 150, 300]); document.title = "🔔 É a sua vez! — MK Barbearia"; }
    if (st !== "chamado") document.title = TITULO;
    ultimo = st;
  }

  $("filaForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button"); btn.disabled = true; msg("");
    try {
      const r = await fetch("/api/fila", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: e.target.nome.value, site: e.target.site.value }) });
      const d = await r.json();
      if (!r.ok) return msg(d.erro || "Não foi possível entrar na fila.");
      guardar({ id: d.id, chave: d.chave }); e.target.reset(); $("filaMinha").innerHTML = ""; await carregar();
    } catch (err) { msg("Sem conexão. Tente de novo."); } finally { btn.disabled = false; }
  });

  document.addEventListener("click", async (e) => {
    if (e.target.id !== "filaSair" || !eu || !confirm("Deseja sair da fila?")) return;
    try { await fetch("/api/sair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eu) }); } catch (err) {}
    guardar(null); $("filaMinha").innerHTML = ""; carregar();
  });

  const iniciar = () => { clearInterval(timer); carregar(); timer = setInterval(carregar, INTERVALO); };
  document.addEventListener("visibilitychange", () => document.hidden ? clearInterval(timer) : iniciar());
  iniciar();
})();
