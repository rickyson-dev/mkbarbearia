import { db, json, senhaOk, criarToken, erroAdmin } from "../_lib/util.js";
export async function onRequestPost({ request, env }) {
  try {
    if (!env.ADMIN_PASSWORD) return json({ erro: "Senha do painel não configurada no servidor." }, 503);
    const DB = await db(env), ip = request.headers.get("CF-Connecting-IP") || "x", agora = Date.now();
    await DB.prepare("DELETE FROM login_falhas WHERE t < ?").bind(agora - 600000).run();
    const f = await DB.prepare("SELECT COUNT(*) n FROM login_falhas WHERE ip = ?").bind(ip).first();
    if (f.n >= 5) return json({ erro: "Muitas tentativas. Aguarde 10 minutos." }, 429);
    const b = await request.json().catch(() => ({}));
    if (!(await senhaOk(String(b.senha || ""), env.ADMIN_PASSWORD))) {
      await DB.prepare("INSERT INTO login_falhas (ip, t) VALUES (?, ?)").bind(ip, agora).run();
      await new Promise((r) => setTimeout(r, 600));
      return json({ erro: "Senha incorreta." }, 401);
    }
    await DB.prepare("DELETE FROM login_falhas WHERE ip = ?").bind(ip).run();
    return json({ token: await criarToken(env) });
  } catch (e) { return erroAdmin(e); }
}
