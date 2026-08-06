import { describe, expect, it } from "vitest";

import { countLogsByUser } from "@/lib/api/friends";

describe("countLogsByUser", () => {
  it("cuenta registros por persona", () => {
    expect(
      countLogsByUser([{ user_id: "ana" }, { user_id: "ana" }, { user_id: "luis" }]),
    ).toEqual({ ana: 2, luis: 1 });
  });

  it("devuelve vacío sin registros", () => {
    expect(countLogsByUser([])).toEqual({});
  });

  // La caché de TanStack Query se persiste en IndexedDB con JSON.stringify: un
  // Map se guarda como {} y al recargar pierde .get, que reventaba la pantalla
  // de Amigos. Lo que devuelve un queryFn tiene que sobrevivir a este viaje.
  it("sobrevive al ida y vuelta por JSON que hace el persistidor", () => {
    const counts = countLogsByUser([{ user_id: "ana" }, { user_id: "ana" }]);
    const restored = JSON.parse(JSON.stringify(counts)) as Record<string, number>;

    expect(restored).toEqual(counts);
    expect(restored.ana).toBe(2);
  });

  it("un Map en cambio no sobrevive, que es la razón de no usarlo", () => {
    const asMap = new Map([["ana", 2]]);
    expect(JSON.parse(JSON.stringify(asMap))).toEqual({});
  });
});
