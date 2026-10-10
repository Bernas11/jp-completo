// node scripts/limpar-storage.mjs   (Node 18+)
// Env: SUPABASE_URL=<URL configurado fora do repositório>  SUPABASE_SERVICE_ROLE_KEY=...
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
for (const bucket of ["documentos-identificacao", "documentos-publicos"]) {
  const paths = [];
  const walk = async (prefix) => {
    const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error) throw error;
    for (const e of data) {
      const p = prefix ? `${prefix}/${e.name}` : e.name;
      e.id ? paths.push(p) : await walk(p);
    }
  };
  await walk("");
  if (paths.length) {
    const { error } = await sb.storage.from(bucket).remove(paths);
    if (error) throw error;
  }
  console.log(`${bucket}: ${paths.length} ficheiro(s) removido(s)`);
}
