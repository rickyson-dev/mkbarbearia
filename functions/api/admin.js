import { db, json, validarToken, limparNome, erroAdmin } from "../_lib/util.js";

async function estado(DB, agora) {
  const { results } = await DB.prepare("SELECT id, nome, status, criado FROM fila WHERE status IN ('esperando','chamado') ORDER BY pos ASC").all();
  const off = 3 * 3600e3, inicio = Math.floor((agora - off) / 864e5) * 864e5 + off; // dia em UTC-3
  const h = await DB.prepare("SELECT COUNT(*) n FROM fila WHERE status = 'atendido' AND atualizado >= ?").bind(inicio).first();
  return { atendimento: results.find((r) => r.status === "chamado") || null, espera: results.filter((r) => r.status === "esperando"), atendidosHoje: h.n };
}

export async function onRequestPost({ request, env }) {
  try {
    if (!(await validarToken(request, env))) return json({ erro: "Sessão expirada." }, 401);
    const b = await request.json().catch(() => null);
    if (!b) return json({ erro: "Requisição inválida." }, 400);
    const DB = await db(env), agora = Date.now(), id = Number(b.id) || 0;
    switch (b.acao) {
      case "listar": break;
      case "chamar": {
        const p = await DB.prepare("SELECT id FROM fila WHERE status = 'esperando' ORDER BY pos ASC LIMIT 1").first();
        if (!p) return json({ erro: "Não há ninguém esperando." }, 409);
        await DB.batch([
          DB.prepare("UPDATE fila SET status = 'atendido', atualizado = ? WHERE status = 'chamado'").bind(agora),
          DB.prepare("UPDATE fila SET status = 'chamado', atualizado = ? WHERE id = ?").bind(agora, p.id),
        ]);
        break;
      }
      case "atendido":
        await DB.prepare("UPDATE fila SET status = 'atendido', atualizado = ? WHERE id = ? AND status IN ('chamado','esperando')").bind(agora, id).run(); break;
      case "remover":
        await DB.prepare("UPDATE fila SET status = 'removido', atualizado = ? WHERE id = ? AND status IN ('chamado','esperando')").bind(agora, id).run(); break;
      case "subir": case "descer": {
        const x = await DB.prepare("SELECT id, pos FROM fila WHERE id = ? AND status = 'esperando'").bind(id).first();
        if (!x) break;
        const sobe = b.acao === "subir";
        const v = await DB.prepare(`SELECT id, pos FROM fila WHERE status = 'esperando' AND pos ${sobe ? "<" : ">"} ? ORDER BY pos ${sobe ? "DESC" : "ASC"} LIMIT 1`).bind(x.pos).first();
        if (v) await DB.batch([DB.prepare("UPDATE fila SET pos = ? WHERE id = ?").bind(v.pos, x.id), DB.prepare("UPDATE fila SET pos = ? WHERE id = ?").bind(x.pos, v.id)]);
        break;
      }
      case "adicionar": {
        const nome = limparNome(b.nome);
        if (nome.length < 2) return json({ erro: "Digite o nome do cliente." }, 400);
        await DB.prepare("INSERT INTO fila (nome, chave, status, pos, criado, atualizado) VALUES (?, ?, 'esperando', (SELECT COALESCE(MAX(pos), 0) + 1 FROM fila), ?, ?)").bind(nome, crypto.randomUUID(), agora, agora).run();
        break;
      }
      default: return json({ erro: "Ação inválida." }, 400);
    }
    return json(await estado(DB, agora));
  } catch (e) { return erroAdmin(e); }
}
