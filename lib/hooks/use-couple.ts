import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { breakUp, fetchCouple, redeemCoupleInvite, updateStartedOn } from "@/lib/api/couple";
import { useCurrentUserId } from "@/lib/auth/provider";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function useCouple() {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.couple(userId ?? "anonymous"),
    enabled: isSupabaseConfigured() && Boolean(userId),
    queryFn: () => fetchCouple(getSupabaseBrowserClient(), userId!),
  });
}

/**
 * El espejo de useRedeemInvite, para cuando el enlace llega con el destino de
 * pareja. No se activa solo: la pantalla ensena primero de quien es el enlace y
 * esto sale al confirmar, que emparejarse no es algo que deba pasar por abrir
 * una direccion.
 */
export function useRedeemCoupleInvite() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => redeemCoupleInvite(getSupabaseBrowserClient(), token),
    onSuccess: (result) => {
      if (result.outcome !== "paired") return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.couple(userId ?? "anonymous") });
      // Emparejarse crea tambien la amistad, asi que la lista de amigos cambia.
      void queryClient.invalidateQueries({ queryKey: queryKeys.friends(userId ?? "anonymous") });
    },
  });
}

export function useUpdateAnniversary() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ coupleId, startedOn }: { coupleId: string; startedOn: string }) =>
      updateStartedOn(getSupabaseBrowserClient(), coupleId, startedOn),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.couple(userId ?? "anonymous") });
    },
  });
}

export function useBreakUp() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (coupleId: string) => breakUp(getSupabaseBrowserClient(), coupleId),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.couple(userId ?? "anonymous"), null);
    },
  });
}
