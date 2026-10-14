import { db, json, erroPublico } from "../_lib/util.js";
export async function onRequestPost({ request, env }) {
  try {
    const b = await request.json().catch(() => ({}));
    const DB = await db(env);
    await DB.prepare("UPDATE fila SET status = 'removido', atualizado = ? WHERE id = ? AND chave = ? AND status IN ('esperando','chamado')").bind(Date.now(), Number(b.id) || 0, String(b.chave || "")).run();
    return json({ ok: true });
  } catch (e) { return erroPublico(e); }
}
