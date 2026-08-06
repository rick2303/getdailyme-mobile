import type { CommentThread, FeedComment } from "@/lib/api/types";

// La base garantiza un solo nivel, pero el cliente tiene que aguantar lo que le
// llegue: una respuesta cuya raiz no viene en la pagina (borrada entre la carga
// y ahora) se pinta como raiz en vez de desaparecer del hilo.
export function buildThreads(comments: FeedComment[]): CommentThread[] {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const threads = new Map<string, CommentThread>();
  const order: string[] = [];

  for (const comment of comments) {
    if (comment.parent_id && byId.has(comment.parent_id)) continue;
    threads.set(comment.id, { root: comment, replies: [] });
    order.push(comment.id);
  }

  for (const comment of comments) {
    if (!comment.parent_id) continue;
    threads.get(comment.parent_id)?.replies.push(comment);
  }

  return order.map((id) => threads.get(id)!);
}

export function countReplies(threads: CommentThread[]): number {
  return threads.reduce((total, thread) => total + thread.replies.length, 0);
}

// A quien va dirigida una respuesta. Contestar a la raiz no necesita mencion
// (ya se ve de quien cuelga); contestar a otra respuesta si, porque las dos
// quedan al mismo nivel.
export function mentionFor(
  target: FeedComment,
  root: FeedComment,
): Pick<FeedComment, "user_id"> | null {
  if (target.id === root.id) return null;
  return { user_id: target.user_id };
}
