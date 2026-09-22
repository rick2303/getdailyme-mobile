import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Image } from "react-native";

import { removeStoryMedia, uploadStoryMedia } from "@/lib/api/storage";
import {
  clearStoryReaction,
  deleteStory,
  fetchArchive,
  fetchLiveStories,
  fetchLiveStoriesByAuthor,
  fetchRing,
  fetchStoryActivity,
  firstUnseenIndex,
  markSeen,
  publishStory,
  reactToStory,
  type NewStory,
  type Story,
  type StoryRingEntry,
} from "@/lib/api/stories";
import type { ReactionType } from "@/lib/api/types";
import { useCurrentUserId } from "@/lib/auth/provider";
import { requestPush } from "@/lib/push/client";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// El anillo se mira mucho y cambia poco: medio minuto de frescura evita pedirlo
// en cada vuelta al muro sin que se note rancio.
const RING_STALE_MS = 30_000;
const STORIES_STALE_MS = 60_000;
const PRELOAD_AUTHORS = 4;
const PUBLISH_KEY = ["stories", "publish"] as const;

export function preloadStoryImage(url: string | null | undefined) {
  if (url) void Image.prefetch(url).catch(() => false);
}

export function useStoryRing() {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.storyRing(),
    enabled: isSupabaseConfigured() && Boolean(userId),
    staleTime: RING_STALE_MS,
    queryFn: () => fetchRing(getSupabaseBrowserClient()),
  });
}

export function useStories(authorId: string | null) {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.stories(authorId ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(authorId) && Boolean(userId),
    staleTime: STORIES_STALE_MS,
    queryFn: () => fetchLiveStories(getSupabaseBrowserClient(), authorId!, userId!),
  });
}

export function usePrefetchRingStories(ring: StoryRingEntry[] | undefined) {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const signature = (ring ?? []).map((entry) => `${entry.authorId}:${entry.total}`).join(",");

  useEffect(() => {
    if (!userId || !ring || ring.length === 0) return;
    let cancelled = false;

    void fetchLiveStoriesByAuthor(
      getSupabaseBrowserClient(),
      ring.map((entry) => entry.authorId),
      userId,
    )
      .then((byAuthor) => {
        if (cancelled) return;
        for (const [authorId, stories] of byAuthor) {
          queryClient.setQueryData(queryKeys.stories(authorId), stories);
        }

        ring
          .filter((entry) => entry.unseen > 0)
          .slice(0, PRELOAD_AUTHORS)
          .forEach((entry) => {
            const stories = byAuthor.get(entry.authorId) ?? [];
            preloadStoryImage(stories[firstUnseenIndex(stories)]?.url);
          });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, userId, queryClient]);
}

export function useStoryArchive(authorId: string | null) {
  return useQuery({
    queryKey: queryKeys.storyArchive(authorId ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(authorId),
    queryFn: () => fetchArchive(getSupabaseBrowserClient(), authorId!),
  });
}

export function useUploadStoryPhoto() {
  const userId = useCurrentUserId();

  return {
    start: (uri: string) => uploadStoryMedia(getSupabaseBrowserClient(), userId!, uri),
    discard: (path: string) => {
      void removeStoryMedia(getSupabaseBrowserClient(), path).catch(() => {});
    },
  };
}

export type PublishInput = Omit<NewStory, "mediaPath"> & {
  upload: Promise<string>;
};

export function usePublishStory() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: PUBLISH_KEY,
    networkMode: "always",
    mutationFn: async ({ upload, ...input }: PublishInput) =>
      publishStory(getSupabaseBrowserClient(), userId!, { ...input, mediaPath: await upload }),
    onSuccess: (story) => {
      queryClient.setQueryData<Story[]>(queryKeys.stories(userId ?? "none"), (current) =>
        current ? [...current, story] : [story],
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.storyRing() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.storyArchive(userId ?? "none") });
    },
  });
}

export function usePublishingStory(): boolean {
  return useIsMutating({ mutationKey: PUBLISH_KEY }) > 0;
}

export function useDeleteStory() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteStory(getSupabaseBrowserClient(), id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storyRing() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stories(userId ?? "none") });
      void queryClient.invalidateQueries({ queryKey: queryKeys.storyArchive(userId ?? "none") });
    },
  });
}

/**
 * Marcar como vista no es una mutacion con la que haya que esperar: se dispara
 * y se olvida. Si falla, lo peor que pasa es que el anillo siga marcado, y eso
 * no merece ni un error en pantalla ni un reintento.
 */
export function useMarkSeen() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return (story: Story) => {
    if (!userId || story.seen) return;
    queryClient.setQueryData<Story[]>(queryKeys.stories(story.authorId), (current) =>
      current?.map((item) => (item.id === story.id ? { ...item, seen: true } : item)),
    );
    void markSeen(getSupabaseBrowserClient(), story.id, userId).catch(() => {});
  };
}

export function useReactToStory() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ story, kind }: { story: Story; kind: ReactionType | null }) => {
      const client = getSupabaseBrowserClient();
      if (kind) await reactToStory(client, story.id, userId!, kind);
      else await clearStoryReaction(client, story.id, userId!);
    },
    onMutate: ({ story, kind }) => {
      const key = queryKeys.stories(story.authorId);
      const previous = queryClient.getQueryData<Story[]>(key);
      queryClient.setQueryData<Story[]>(key, (current) =>
        current?.map((item) => (item.id === story.id ? { ...item, myReaction: kind } : item)),
      );
      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
    },
    onSuccess: (_data, { story, kind }) => {
      if (kind) requestPush({ type: "story_reaction", storyId: story.id }).catch(() => undefined);
    },
  });
}

export function useStoryActivity(storyId: string | null) {
  return useQuery({
    queryKey: queryKeys.storyActivity(storyId ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(storyId),
    staleTime: 15_000,
    queryFn: () => fetchStoryActivity(getSupabaseBrowserClient(), storyId!),
  });
}

export function useRefreshRing() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: queryKeys.storyRing() });
}
