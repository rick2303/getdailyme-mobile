import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/storage", () => ({ resolveStoryUrls: async () => new Map() }));

import { firstUnseenIndex, storyQueue } from "@/lib/api/stories";

describe("firstUnseenIndex", () => {
  it("empieza por la primera sin ver", () => {
    expect(firstUnseenIndex([{ seen: true }, { seen: true }, { seen: false }])).toBe(2);
  });

  it("vuelve al principio si ya se vio todo", () => {
    expect(firstUnseenIndex([{ seen: true }, { seen: true }])).toBe(0);
  });

  it("no revienta con una lista vacia", () => {
    expect(firstUnseenIndex([])).toBe(0);
  });
});

describe("storyQueue", () => {
  const ring = [{ authorId: "ana" }, { authorId: "yo" }, { authorId: "luis" }, { authorId: "eva" }];

  it("sigue el orden del anillo desde quien se toca", () => {
    expect(storyQueue(ring, "yo", "luis")).toEqual(["luis", "eva"]);
  });

  it("lo propio va primero y encadena con el resto", () => {
    expect(storyQueue(ring, "yo", "yo")).toEqual(["yo", "ana", "luis", "eva"]);
  });

  it("quien no esta en el anillo se ve sola", () => {
    expect(storyQueue(ring, "yo", "nadie")).toEqual(["nadie"]);
  });
});
