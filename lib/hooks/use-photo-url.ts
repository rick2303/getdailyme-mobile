

import { useQuery } from "@tanstack/react-query";

import { resolveActivityPhotoUrl } from "@/lib/api/storage";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Las URLs firmadas caducan a la hora, asi que se refrescan antes de eso.
const SIGNED_URL_STALE_MS = 50 * 60 * 1000;

export function useActivityPhotoUrl(path: string | null) {
  return useQuery({
    queryKey: queryKeys.activityPhotoUrl(path ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(path),
    staleTime: SIGNED_URL_STALE_MS,
    gcTime: SIGNED_URL_STALE_MS,
    queryFn: () => resolveActivityPhotoUrl(getSupabaseBrowserClient(), path!),
  });
}
