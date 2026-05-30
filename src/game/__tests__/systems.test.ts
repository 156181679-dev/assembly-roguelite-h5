import { describe, expect, it } from "vitest";
import { createInitialRunState, PART_DEFS, FUSION_RULES } from "../data";
import { drawLootRewards } from "../systems/LootSystem";
import { fuseParts } from "../systems/FusionSystem";
import { createMemoryStorage, MuseumSystem } from "../systems/MuseumSystem";

describe("loot rewards", () => {
  it("draws three unique rewards for a normal round", () => {
    const run = createInitialRunState();
    const rewards = drawLootRewards({
      round: 1,
      parts: PART_DEFS,
      ownedPartIds: run.ownedPartIds,
      random: () => 0.01
    });

    expect(rewards).toHaveLength(3);
    expect(new Set(rewards.map((part) => part.id)).size).toBe(3);
    expect(rewards.every((part) => part.category !== "catalyst")).toBe(true);
  });

  it("adds one catalyst reward on the third round", () => {
    const run = createInitialRunState();
    const rewards = drawLootRewards({
      round: 3,
      parts: PART_DEFS,
      ownedPartIds: run.ownedPartIds,
      random: () => 0.2
    });

    expect(rewards).toHaveLength(4);
    expect(rewards.some((part) => part.category === "catalyst")).toBe(true);
  });
});

describe("fusion rules", () => {
  it("uses exact recipes before tag recipes", () => {
    const blade = PART_DEFS.find((part) => part.id === "blade")!;
    const fireGem = PART_DEFS.find((part) => part.id === "fire_gem")!;

    const result = fuseParts(blade, fireGem, FUSION_RULES);

    expect(result.ruleType).toBe("exact");
    expect(result.weapon.name).toBe("火焰刀");
    expect(result.weapon.effects).toContain("burn");
  });

  it("uses tag recipes when no exact recipe exists", () => {
    const gear = PART_DEFS.find((part) => part.id === "gear")!;
    const lightning = PART_DEFS.find((part) => part.id === "lightning_coil")!;

    const result = fuseParts(gear, lightning, FUSION_RULES);

    expect(result.ruleType).toBe("tag");
    expect(result.weapon.name).toContain("电磁");
    expect(result.weapon.effects).toContain("shock");
  });

  it("always returns a chaos weapon for uncovered combinations", () => {
    const plunger = PART_DEFS.find((part) => part.id === "plunger")!;
    const procrastination = PART_DEFS.find((part) => part.id === "procrastination")!;

    const result = fuseParts(plunger, procrastination, FUSION_RULES);

    expect(result.ruleType).toBe("chaos");
    expect(result.weapon.name).toContain("混沌");
    expect(result.weapon.effects.length).toBeGreaterThanOrEqual(2);
  });
});

describe("museum storage", () => {
  it("keeps only the newest twenty records", () => {
    const storage = createMemoryStorage();
    const museum = new MuseumSystem(storage);

    for (let index = 0; index < 25; index += 1) {
      museum.save({
        id: `record-${index}`,
        timestamp: index,
        weaponName: `武器 ${index}`,
        parts: ["blade"],
        fusedWeapons: [],
        maxDps: index * 100,
        maxCombo: index,
        fusionCount: 1,
        result: "victory",
        shareImageDataUrl: "data:image/png;base64,test"
      });
    }

    const records = museum.list();
    expect(records).toHaveLength(20);
    expect(records[0].id).toBe("record-24");
    expect(records[records.length - 1].id).toBe("record-5");
  });

  it("recovers from corrupted persisted storage", () => {
    const storage = createMemoryStorage();
    storage.setItem("assembly-roguelite:museum", "{broken-json");

    const museum = new MuseumSystem(storage);

    expect(museum.list()).toEqual([]);
  });
});
