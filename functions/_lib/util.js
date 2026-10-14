const enc = new TextEncoder();
export const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

let pronto = false;
export async function db(env) {
  if (!env.DB) throw new Error("Banco D1 não configurado (binding DB).");
  if (!pronto) {
    await env.DB.batch([
      env.DB.prepare("CREATE TABLE IF NOT EXISTS fila (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, chave TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'esperando', pos REAL NOT NULL, criado INTEGER NOT NULL, atualizado INTEGER NOT NULL)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_fila_status ON fila(status, pos)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS login_falhas (ip TEXT NOT NULL, t INTEGER NOT NULL)"),
    ]);
    pronto = true;
  }
  return env.DB;
}
export const erroPublico = (e) => { console.error(e); return json({ erro: "Fila indisponível no momento." }, 503); };
export const erroAdmin = (e) => { console.error(e); return json({ erro: "Erro no servidor: " + (e && e.message || e) }, 500); };

export function igual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const sha = async (s) => b64(await crypto.subtle.digest("SHA-256", enc.encode(s)));
export async function senhaOk(digitada, correta) { return igual(await sha(digitada), await sha(correta)); }

const segredo = (env) => { const s = env.SESSION_SECRET || env.ADMIN_PASSWORD; if (!s) throw new Error("ADMIN_PASSWORD não configurada."); return s; };
async function hmac(secret, data) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}
export async function criarToken(env) {
  const p = b64(enc.encode(JSON.stringify({ exp: Date.now() + 12 * 3600e3 })));
  return p + "." + (await hmac(segredo(env), p));
}
export async function validarToken(req, env) {
  try {
    const [p, s] = (req.headers.get("Authorization") || "").replace(/^Bearer /, "").split(".");
    if (!p || !s || !igual(s, await hmac(segredo(env), p))) return false;
    return JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/"))).exp > Date.now();
  } catch { return false; }
}
export const limparNome = (n) => String(n || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 30);
export const mascarar = (n) => { const p = n.split(" "); return p.length > 1 ? p[0] + " " + p[1][0].toUpperCase() + "." : p[0]; };
