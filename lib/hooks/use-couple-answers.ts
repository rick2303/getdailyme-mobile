import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  coupleStreak,
  fetchCompletedDays,
  fetchRitual,
  fetchSavedDays,
  monthAlreadySpent,
  saveCoupleDay,
  submitAnswer,
} from "@/lib/api/couple-answers";
import { useCurrentUserId } from "@/lib/auth/provider";
import { requestPush } from "@/lib/push/client";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { shiftDateKey } from "@/lib/utils/dates";

// Un ano de historia basta y sobra para pintar la racha, y evita traerse toda
// la vida de la pareja cada vez que se abre la pantalla.
const STREAK_WINDOW_DAYS = 400;

export function useRitual(coupleId: string | null, dateKey: string) {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.coupleRitual(coupleId ?? "none", dateKey),
    enabled: isSupabaseConfigured() && Boolean(coupleId) && Boolean(userId),
    queryFn: () => fetchRitual(getSupabaseBrowserClient(), coupleId!, userId!, dateKey),
  });
}

export function useCoupleStreak(coupleId: string | null, today: string) {
  return useQuery({
    queryKey: queryKeys.coupleStreak(coupleId ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(coupleId),
    queryFn: async () => {
      const client = getSupabaseBrowserClient();
      const since = shiftDateKey(today, -STREAK_WINDOW_DAYS);

      const [answered, saved] = await Promise.all([
        fetchCompletedDays(client, coupleId!, since),
        fetchSavedDays(client, coupleId!, since),
      ]);

      // Un dia salvado cuenta igual que uno respondido: para eso se salva.
      const days = Array.from(new Set([...answered, ...saved]));

      // Ayer es el dia que rompe la racha, y por tanto el unico que tiene
      // sentido ofrecer. Rescatar un martes de hace dos semanas no salva nada
      // que siga vivo.
      const yesterday = shiftDateKey(today, -1);
      const savable =
        !days.includes(yesterday) && !monthAlreadySpent(saved, yesterday) ? yesterday : null;

      return { days, saved, current: coupleStreak(days, today), savable };
    },
  });
}

/**
 * Da un dia por cumplido para los dos.
 *
 * Convive con el dia de gracia automatico sin pisarlo, porque cubren dos cosas
 * distintas: la gracia es para cuando se os paso a los dos, y no la pide nadie;
 * esto es para cuando uno si respondio y el otro no, y lo usa quien si lo hizo
 * para que la racha no sea un dedo acusador. Un dia salvado deja de ser hueco,
 * asi que no consume ademas la gracia de ese mes.
 */
export function useSaveCoupleDay(coupleId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dateKey: string) => saveCoupleDay(getSupabaseBrowserClient(), dateKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coupleStreak(coupleId ?? "none") });
    },
  });
}

export function useAnswerToday() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      coupleId: string;
      promptKey: string;
      text: string;
      guess?: string;
      dateKey: string;
    }) =>
      submitAnswer(getSupabaseBrowserClient(), {
        ...input,
        userId: userId!,
      }),
    onSuccess: (_answer, input) => {
      // Al responder puede destaparse la ajena, asi que el dia entero se
      // vuelve a pedir en vez de parchear el cache con lo propio.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.coupleRitual(input.coupleId, input.dateKey),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.coupleStreak(input.coupleId) });

      // El aviso no lleva la respuesta, solo que ya la hay: el contenido se
      // revela en la app y solo cuando toca.
      requestPush({ type: "couple_answer", coupleId: input.coupleId }).catch(() => undefined);
    },
  });
}
