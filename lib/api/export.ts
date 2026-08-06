import type { TypedSupabaseClient } from "@/lib/supabase/types";

import { fetchActivities } from "./activities";
import { fetchLogsSince } from "./logs";
import { fetchProfile } from "./profile";

// Anterior a cualquier registro posible: trae el historial entero, no los 180
// dias que maneja la app en caliente.
const BEGINNING_OF_TIME = "2000-01-01";

export type DataExport = {
  exported_at: string;
  app: "getdailyme";
  profile: unknown;
  activities: unknown[];
  logs: unknown[];
  note: string;
};

// Todo lo que es tuyo, en un JSON legible. Las fotos no van dentro (seria un
// archivo enorme); van sus rutas, que identifican cada una.
export async function buildDataExport(
  client: TypedSupabaseClient,
  userId: string,
): Promise<DataExport> {
  const [profile, activities, logs] = await Promise.all([
    fetchProfile(client, userId),
    fetchActivities(client, userId),
    fetchLogsSince(client, userId, BEGINNING_OF_TIME),
  ]);

  return {
    exported_at: new Date().toISOString(),
    app: "getdailyme",
    profile,
    activities,
    logs,
    note: "Las fotos no se incluyen; photo_url identifica cada una en tu cuenta.",
  };
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
