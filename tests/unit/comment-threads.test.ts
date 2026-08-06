import { describe, expect, it } from "vitest";

import type { FeedComment } from "@/lib/api/types";
import { buildThreads, countReplies } from "@/lib/feed/threads";

function makeComment(
  id: string,
  overrides: Partial<FeedComment> = {},
): FeedComment {
  return {
    id,
    log_id: "log-1",
    user_id: `user-${id}`,
    body: `cuerpo ${id}`,
    created_at: `2026-08-05T10:0${id}:00Z`,
    updated_at: `2026-08-05T10:0${id}:00Z`,
    parent_id: null,
    reply_to: null,
    author: {
      id: `user-${id}`,
      username: `u${id}`,
      display_name: `Persona ${id}`,
      avatar_url: null,
    },
    ...overrides,
  };
}

describe("buildThreads", () => {
  it("cuelga cada respuesta de su raíz y conserva el orden de llegada", () => {
    const threads = buildThreads([
      makeComment("1"),
      makeComment("2"),
      makeComment("3", { parent_id: "1" }),
      makeComment("4", { parent_id: "1" }),
      makeComment("5", { parent_id: "2" }),
    ]);

    expect(threads.map((thread) => thread.root.id)).toEqual(["1", "2"]);
    expect(threads[0].replies.map((reply) => reply.id)).toEqual(["3", "4"]);
    expect(threads[1].replies.map((reply) => reply.id)).toEqual(["5"]);
  });

  it("deja una lista plana cuando nadie ha respondido", () => {
    const threads = buildThreads([makeComment("1"), makeComment("2")]);

    expect(threads).toHaveLength(2);
    expect(countReplies(threads)).toBe(0);
  });

  it("sube a raíz la respuesta cuyo padre ya no está", () => {
    const threads = buildThreads([makeComment("9", { parent_id: "borrado" })]);

    expect(threads).toHaveLength(1);
    expect(threads[0].root.id).toBe("9");
    expect(threads[0].replies).toEqual([]);
  });

  it("no pierde respuestas que llegan antes que su raíz", () => {
    const threads = buildThreads([makeComment("3", { parent_id: "1" }), makeComment("1")]);

    expect(threads.map((thread) => thread.root.id)).toEqual(["1"]);
    expect(threads[0].replies.map((reply) => reply.id)).toEqual(["3"]);
  });

  it("cuenta todas las respuestas del conjunto", () => {
    const threads = buildThreads([
      makeComment("1"),
      makeComment("2", { parent_id: "1" }),
      makeComment("3", { parent_id: "1" }),
      makeComment("4"),
      makeComment("5", { parent_id: "4" }),
    ]);

    expect(countReplies(threads)).toBe(3);
  });
});
