import type { TypedSupabaseClient } from "@/lib/supabase/types";

export const REPORT_REASONS = ["spam", "harassment", "inappropriate", "other"] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const MAX_REPORT_DETAILS = 500;

// Que se denuncia. El autor real y la copia del contenido los rellena la base;
// el id de usuario solo hace falta al denunciar un perfil.
export type ReportTarget =
  | { type: "log"; logId: string }
  | { type: "comment"; commentId: string }
  | { type: "profile"; userId: string };

const UNIQUE_VIOLATION = "23505";

export async function submitReport(
  client: TypedSupabaseClient,
  reporterId: string,
  target: ReportTarget,
  reason: ReportReason,
  details: string,
): Promise<void> {
  const { error } = await client.from("reports").insert({
    reporter_id: reporterId,
    target_type: target.type,
    log_id: target.type === "log" ? target.logId : null,
    comment_id: target.type === "comment" ? target.commentId : null,
    // Con log o comentario el trigger lo sobreescribe con el autor real; aqui
    // va el propio denunciante solo para pasar el not null hasta el trigger.
    reported_user_id: target.type === "profile" ? target.userId : reporterId,
    reason,
    details: details.trim() || null,
  });

  if (error) {
    // Denunciar lo mismo dos veces no es un fallo: la denuncia ya esta puesta.
    if (error.code === UNIQUE_VIOLATION) return;
    throw error;
  }
}
