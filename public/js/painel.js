(() => {
  const $ = (id) => document.getElementById(id), T = "mk_painel_token";
  let token = null, timer = null, ocupado = false;
  try { token = sessionStorage.getItem(T); } catch (e) {}
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hora = (t) => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  function telas() { $("pnLogin").hidden = !!token; $("pnApp").hidden = !token; }
  function sair(m) {
    token = null; try { sessionStorage.removeItem(T); } catch (e) {}
    clearInterval(timer); telas(); if (m) { $("pnMsg").textContent = m; }
  }
  async function agir(acao, extra) {
    if (ocupado) return; ocupado = true; $("pnApp").style.opacity = ".7";
    try {
      const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ acao, ...extra }) });
      const d = await r.json();
      if (r.status === 401) return sair("Sessão expirada. Entre novamente.");
      $("pnErro").textContent = r.ok ? "" : d.erro || "Erro.";
      if (r.ok) render(d);
      return r.ok;
    } catch (e) { $("pnErro").textContent = "Sem conexão. Tentando de novo…"; }
    finally { ocupado = false; $("pnApp").style.opacity = ""; }
  }
  function render(d) {
    $("pnHoje").textContent = d.atendidosHoje + " atendido(s) hoje";
    const a = d.atendimento;
    $("pnAtual").innerHTML = a
      ? `<small>Em atendimento</small><b>${esc(a.nome)}</b><div class="pn-acoes"><button class="ok" data-a="atendido" data-id="${a.id}">Marcar como atendido</button><button data-a="remover" data-id="${a.id}">Não compareceu</button></div>`
      : `<small>Em atendimento</small><b>Ninguém</b>`;
    $("pnVazia").hidden = d.espera.length > 0;
    $("pnChamar").disabled = d.espera.length === 0;
    $("pnLista").innerHTML = d.espera.map((p, i) =>
      `<li><span class="n">${i + 1}</span><span class="nm">${esc(p.nome)} <small style="color:var(--mut)">· entrou ${hora(p.criado)}</small></span><span class="bt"><button data-a="subir" data-id="${p.id}" aria-label="Subir" ${i === 0 ? "disabled" : ""}>↑</button><button data-a="descer" data-id="${p.id}" aria-label="Descer" ${i === d.espera.length - 1 ? "disabled" : ""}>↓</button><button data-a="atendido" data-id="${p.id}">Atendido</button><button data-a="remover" data-id="${p.id}" aria-label="Remover">✕</button></span></li>`).join("");
  }
  const poll = async () => { if (token && !document.hidden) await agir("listar"); };
  function iniciar() { telas(); if (!token) return; agir("listar"); clearInterval(timer); timer = setInterval(poll, 4000); }

  $("pnForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const btn = e.target.querySelector("button"); btn.disabled = true; $("pnMsg").textContent = "";
    try {
      const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senha: $("pnSenha").value }) });
      const d = await r.json();
      if (!r.ok) return ($("pnMsg").textContent = d.erro || "Erro ao entrar.");
      token = d.token; try { sessionStorage.setItem(T, token); } catch (err) {}
      $("pnSenha").value = ""; iniciar();
    } catch (err) { $("pnMsg").textContent = "Sem conexão."; } finally { btn.disabled = false; }
  });
  $("pnChamar").addEventListener("click", () => agir("chamar"));
  $("pnSair").addEventListener("click", () => sair());
  $("pnAdd").addEventListener("submit", async (e) => { e.preventDefault(); if (await agir("adicionar", { nome: $("pnNome").value })) $("pnNome").value = ""; });
  $("pnApp").addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]"); if (!b) return;
    if (b.dataset.a === "remover" && !confirm("Remover este cliente da fila?")) return;
    agir(b.dataset.a, { id: Number(b.dataset.id) });
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });
  iniciar();
})();
