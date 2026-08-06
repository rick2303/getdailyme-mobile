import type { SupabaseClient } from "@supabase/supabase-js";

// Solo se usa .storage, que no depende del esquema: asi sirve tanto el cliente
// tipado del navegador como el de servicio.
type StorageClient = Pick<SupabaseClient, "storage">;

const PAGE_SIZE = 100;

// Los buckets de la app anidan como mucho dos niveles bajo el prefijo
// (usuario/actividad/archivo, evento/usuario/archivo), asi que una recursion
// acotada basta y evita perderse ante una carpeta inesperada.
export async function listFilesUnder(
  client: StorageClient,
  bucket: string,
  prefix: string,
  depth = 2,
): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, { limit: PAGE_SIZE, offset });

    if (error || !data || data.length === 0) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) {
        files.push(path);
      } else if (depth > 0) {
        files.push(...(await listFilesUnder(client, bucket, path, depth - 1)));
      }
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return files;
}

export async function removeFolder(
  client: StorageClient,
  bucket: string,
  prefix: string,
): Promise<number> {
  const files = await listFilesUnder(client, bucket, prefix);
  if (files.length === 0) return 0;

  const { error } = await client.storage.from(bucket).remove(files);
  if (error) throw error;
  return files.length;
}
