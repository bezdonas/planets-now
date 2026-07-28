import { describe, expect, it } from "vitest";
import { PLANETS } from "./planets.ts";

describe("PLANETS", () => {
  it("is an array (populated in Phase 2/3)", () => {
    expect(Array.isArray(PLANETS)).toBe(true);
  });
});
