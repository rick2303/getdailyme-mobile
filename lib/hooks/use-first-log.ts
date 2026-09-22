import { useCallback, useState } from "react";

import { isFirstLog } from "@/lib/activities/first-log";
import { fetchFirstLoggedAt } from "@/lib/api/profile";
import { useCurrentUserId } from "@/lib/auth/provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function useFirstLogCelebration() {
  const userId = useCurrentUserId();
  const [open, setOpen] = useState(false);

  const check = useCallback(
    (loggedAt: string) => {
      if (!userId) return;
      fetchFirstLoggedAt(getSupabaseBrowserClient(), userId)
        .then((first) => {
          if (isFirstLog(first, loggedAt)) setOpen(true);
        })
        .catch(() => undefined);
    },
    [userId],
  );

  const close = useCallback(() => setOpen(false), []);

  return { open, check, close };
}
