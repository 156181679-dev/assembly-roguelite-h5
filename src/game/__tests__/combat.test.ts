import { describe, expect, it } from "vitest";
import { PART_DEFS, FUSION_RULES } from "../data";
import { fuseParts } from "../systems/FusionSystem";
import {
  createEquippedPart,
  createEquippedWeapon,
  estimateBuildPower,
  simulateBattleWaves,
  simulateCombat
} from "../systems/CombatSystem";

describe("combat simulation", () => {
  it("kills an underbuilt loadout before the final wave", () => {
    const blade = PART_DEFS.find((part) => part.id === "blade")!;

    const summary = simulateBattleWaves([createEquippedPart(blade, "left_hand")]);

    expect(summary.result).toBe("death");
    expect(summary.overdriveTriggered).toBe(false);
    expect(summary.maxCombo).toBeLessThan(8);
    expect(summary.maxDps).toBeLessThan(45);
  });

  it("turns a fused high-frequency build into a victory with overdrive", () => {
    const blade = PART_DEFS.find((part) => part.id === "blade")!;
    const fireGem = PART_DEFS.find((part) => part.id === "fire_gem")!;
    const rocket = PART_DEFS.find((part) => part.id === "rocket")!;
    const fusion = fuseParts(blade, fireGem, FUSION_RULES);

    const summary = simulateBattleWaves([
      createEquippedWeapon(fusion.weapon, "left_hand", [blade.id, fireGem.id]),
      createEquippedPart(rocket, "back")
    ]);

    expect(summary.result).toBe("victory");
    expect(summary.overdriveTriggered).toBe(true);
    expect(summary.maxCombo).toBeGreaterThanOrEqual(12);
    expect(summary.maxDps).toBeGreaterThan(180);
  });

  it("rates fused weapons higher than their unfused parts", () => {
    const barrel = PART_DEFS.find((part) => part.id === "barrel")!;
    const lightningCoil = PART_DEFS.find((part) => part.id === "lightning_coil")!;
    const fusion = fuseParts(barrel, lightningCoil, FUSION_RULES);
    const rawParts = [
      createEquippedPart(barrel, "left_hand"),
      createEquippedPart(lightningCoil, "right_hand")
    ];
    const fusedWeapon = createEquippedWeapon(fusion.weapon, "left_hand", [barrel.id, lightningCoil.id]);

    const rawPower = estimateBuildPower(rawParts);
    const fusedPower = estimateBuildPower([fusedWeapon]);
    const rawSummary = simulateCombat(rawParts);
    const fusedSummary = simulateCombat([fusedWeapon]);

    expect(fusedPower).toBeGreaterThan(rawPower * 1.35);
    expect(fusedSummary.maxDps).toBeGreaterThan(rawSummary.maxDps);
    expect(fusedSummary.maxCombo).toBeGreaterThan(rawSummary.maxCombo);
  });
});
