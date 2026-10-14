import { db, json, limparNome, mascarar, igual, erroPublico } from "../_lib/util.js";

export async function onRequestGet({ request, env }) {
  try {
    const DB = await db(env);
    const { results } = await DB.prepare("SELECT id, nome, status FROM fila WHERE status IN ('esperando','chamado') ORDER BY pos ASC").all();
    const atual = results.find((r) => r.status === "chamado");
    const espera = results.filter((r) => r.status === "esperando").map((r) => ({ id: r.id, nome: mascarar(r.nome) }));
    let eu = null;
    const id = Number(request.headers.get("X-Fila-Id")), chave = request.headers.get("X-Fila-Chave") || "";
    if (id && chave) {
      const r = await DB.prepare("SELECT status, chave FROM fila WHERE id = ?").bind(id).first();
      if (r && igual(r.chave, chave)) eu = { id, status: r.status };
    }
    return json({ atendimento: atual ? { id: atual.id, nome: mascarar(atual.nome) } : null, espera, eu });
  } catch (e) { return erroPublico(e); }
}

export async function onRequestPost({ request, env }) {
  try {
    let b; try { b = await request.json(); } catch { return json({ erro: "Requisição inválida." }, 400); }
    if (b.site) return json({ erro: "Requisição inválida." }, 400); // honeypot anti-robô
    const nome = limparNome(b.nome);
    if (nome.length < 2) return json({ erro: "Digite seu nome (mínimo 2 letras)." }, 400);
    const DB = await db(env), agora = Date.now();
    await DB.prepare("DELETE FROM fila WHERE atualizado < ?").bind(agora - 3 * 864e5).run();
    const c = await DB.prepare("SELECT COUNT(*) n FROM fila WHERE status = 'esperando'").first();
    if (c.n >= 40) return json({ erro: "A fila está cheia no momento. Chame no WhatsApp." }, 409);
    const d = await DB.prepare("SELECT 1 x FROM fila WHERE status IN ('esperando','chamado') AND lower(nome) = lower(?)").bind(nome).first();
    if (d) return json({ erro: "Já existe alguém com esse nome na fila. Use nome e sobrenome." }, 409);
    const chave = crypto.randomUUID();
    const r = await DB.prepare("INSERT INTO fila (nome, chave, status, pos, criado, atualizado) VALUES (?, ?, 'esperando', (SELECT COALESCE(MAX(pos), 0) + 1 FROM fila), ?, ?)").bind(nome, chave, agora, agora).run();
    return json({ id: r.meta.last_row_id, chave });
  } catch (e) { return erroPublico(e); }
}
