import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * `storage_path` guardava até agora um caminho relativo dentro de um bucket
 * do Supabase Storage. Os novos uploads (via UploadThing) guardam antes o
 * URL completo do ficheiro. Esta função aceita as duas formas.
 */
export function resolveFileUrl(supabase: SupabaseClient, bucket: string, path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
