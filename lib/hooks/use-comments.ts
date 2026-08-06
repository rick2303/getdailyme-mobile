

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addComment,
  deleteComment,
  fetchComments,
  updateComment,
  type NewComment,
} from "@/lib/api/feed";
import { requestPush } from "@/lib/push/client";
import { useCurrentUserId } from "@/lib/auth/provider";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function useComments(logId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.comments(logId),
    enabled: isSupabaseConfigured() && enabled,
    queryFn: () => fetchComments(getSupabaseBrowserClient(), logId),
  });
}

function useRefreshAfterComment(logId: string) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.comments(logId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
  };
}

export type CommentDraft = Pick<NewComment, "body" | "parentId" | "replyToUserId">;

export function useAddComment(logId: string) {
  const userId = useCurrentUserId();
  const refresh = useRefreshAfterComment(logId);

  return useMutation({
    mutationFn: (draft: CommentDraft) =>
      addComment(getSupabaseBrowserClient(), { ...draft, logId, userId: userId! }),
    onSuccess: (commentId) => {
      refresh();
      if (commentId) {
        requestPush({ type: "comment", commentId }).catch(() => undefined);
      }
    },
  });
}

export function useEditComment(logId: string) {
  const refresh = useRefreshAfterComment(logId);

  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      updateComment(getSupabaseBrowserClient(), commentId, body),
    onSuccess: refresh,
  });
}

export function useDeleteComment(logId: string) {
  const refresh = useRefreshAfterComment(logId);

  return useMutation({
    mutationFn: (commentId: string) => deleteComment(getSupabaseBrowserClient(), commentId),
    onSuccess: refresh,
  });
}
