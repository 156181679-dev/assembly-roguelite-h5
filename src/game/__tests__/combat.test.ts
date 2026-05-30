import { describe, expect, it } from "vitest";
import { PART_DEFS, FUSION_RULES } from "../data";
import { fuseParts } from "../systems/FusionSystem";
import { createEquippedPart, createEquippedWeapon, simulateCombat } from "../systems/CombatSystem";

describe("combat simulation", () => {
  it("turns a fused build into a victory with overdrive", () => {
    const blade = PART_DEFS.find((part) => part.id === "blade")!;
    const fireGem = PART_DEFS.find((part) => part.id === "fire_gem")!;
    const rocket = PART_DEFS.find((part) => part.id === "rocket")!;
    const fusion = fuseParts(blade, fireGem, FUSION_RULES);

    const summary = simulateCombat([
      createEquippedWeapon(fusion.weapon, "left_hand", [blade.id, fireGem.id]),
      createEquippedPart(rocket, "back")
    ]);

    expect(summary.result).toBe("victory");
    expect(summary.overdriveTriggered).toBe(true);
    expect(summary.maxCombo).toBeGreaterThanOrEqual(12);
    expect(summary.maxDps).toBeGreaterThan(100);
  });
});
