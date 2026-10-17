import { useQuery } from "@tanstack/react-query";

import { fetchCircleAwards } from "@/lib/api/awards";
import { useCurrentUserId } from "@/lib/auth/provider";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function useCircleAwards(weekStart: string) {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.circleAwards(userId ?? "anonymous", weekStart),
    enabled: isSupabaseConfigured() && Boolean(userId),
    queryFn: () => fetchCircleAwards(getSupabaseBrowserClient(), weekStart),
    // Una semana cerrada no cambia; la del domingo, poco. Cinco minutos de
    // margen evitan pedirla en cada vuelta a la pestaña.
    staleTime: 5 * 60_000,
  });
}
