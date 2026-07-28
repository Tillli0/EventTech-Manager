import { describe, it, expect } from "vitest";
import { diffAssigneeIds } from "./jobAssignees";

describe("diffAssigneeIds", () => {
  it("liefert nichts, wenn sich nichts ändert", () => {
    expect(diffAssigneeIds(["a", "b"], ["a", "b"])).toEqual({ toAdd: [], toRemove: [] });
  });

  it("erkennt eine neu hinzugefügte Person", () => {
    expect(diffAssigneeIds(["a"], ["a", "b"])).toEqual({ toAdd: ["b"], toRemove: [] });
  });

  it("erkennt eine entfernte Person", () => {
    expect(diffAssigneeIds(["a", "b"], ["a"])).toEqual({ toAdd: [], toRemove: ["b"] });
  });

  it("erkennt gleichzeitiges Hinzufügen und Entfernen — bestehende Person bleibt unberührt", () => {
    expect(diffAssigneeIds(["a", "b"], ["a", "c"])).toEqual({ toAdd: ["c"], toRemove: ["b"] });
  });

  it("von leer auf mehrere", () => {
    expect(diffAssigneeIds([], ["a", "b"])).toEqual({ toAdd: ["a", "b"], toRemove: [] });
  });

  it("von mehreren auf leer", () => {
    expect(diffAssigneeIds(["a", "b"], [])).toEqual({ toAdd: [], toRemove: ["a", "b"] });
  });
});
