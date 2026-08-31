import { describe, expect, it } from "vitest";

import type { FeedEntry } from "@/lib/api/types";
import { groupFeedEntries } from "@/lib/feed/grouping";

// El feed llega ordenado de mas nuevo a mas viejo, que es como agrupa la
// funcion: mira siempre contra el ultimo grupo abierto.
function makeEntry(id: string, minutesAgo: number, overrides: Partial<FeedEntry> = {}): FeedEntry {
  const loggedAt = new Date(Date.UTC(2026, 7, 31, 12, 0, 0) - minutesAgo * 60_000);
  return {
    id,
    user_id: "alex",
    amount: 1,
    note: null,
    photo_url: null,
    logged_at: loggedAt.toISOString(),
    author: { username: "alex", display_name: "Alex Rivera", avatar_url: null },
    activity: { id: "comida", name: "Comida", icon: "utensils", color: "amber", unit: "serving" },
    reactions: [],
    comment_count: 0,
    ...overrides,
  };
}

describe("groupFeedEntries", () => {
  it("junta registros repetidos de la misma actividad", () => {
    const groups = groupFeedEntries([makeEntry("a", 0), makeEntry("b", 10), makeEntry("c", 20)]);

    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(3);
    expect(groups[0].amount).toBe(3);
  });

  it("no junta lo que cae fuera de la ventana", () => {
    const groups = groupFeedEntries([makeEntry("a", 0), makeEntry("b", 45)]);

    expect(groups).toHaveLength(2);
  });

  // El fallo que motivo todo esto: registrar Comida con foto y otra vez Comida
  // diez minutos despues hacia desaparecer la foto del muro, porque el grupo se
  // queda con una entrada y del resto solo suma el total.
  it("deja fuera del grupo el registro que lleva foto", () => {
    const groups = groupFeedEntries([
      makeEntry("sin-foto", 0),
      makeEntry("con-foto", 10, { photo_url: "alex/comida/bowl.jpg" }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.entry.id)).toEqual(["sin-foto", "con-foto"]);
    expect(groups[1].entry.photo_url).toBe("alex/comida/bowl.jpg");
  });

  it("tampoco absorbe cuando la foto la lleva el representante del grupo", () => {
    const groups = groupFeedEntries([
      makeEntry("con-foto", 0, { photo_url: "alex/comida/bowl.jpg" }),
      makeEntry("sin-foto", 10),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].entry.photo_url).toBe("alex/comida/bowl.jpg");
    expect(groups[0].count).toBe(1);
  });

  it("respeta las notas, los comentarios y las reacciones", () => {
    const conNota = makeEntry("nota", 10, { note: "Bowl de casa" });
    const conComentarios = makeEntry("comentarios", 20, { comment_count: 3 });
    const conReaccion = makeEntry("reaccion", 30, {
      reactions: [{ type: "fire", user_id: "sofia" }] as FeedEntry["reactions"],
    });

    const groups = groupFeedEntries([makeEntry("plano", 0), conNota, conComentarios, conReaccion]);

    expect(groups).toHaveLength(4);
  });

  it("una nota en blanco no cuenta como contenido", () => {
    const groups = groupFeedEntries([makeEntry("a", 0), makeEntry("b", 10, { note: "   " })]);

    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(2);
  });

  it("separa por persona y por actividad", () => {
    const groups = groupFeedEntries([
      makeEntry("a", 0),
      makeEntry("b", 5, { user_id: "sofia" }),
      makeEntry("c", 10, {
        activity: { id: "agua", name: "Agua", icon: "glass-water", color: "cyan", unit: "glass" },
      }),
    ]);

    expect(groups).toHaveLength(3);
  });
});
