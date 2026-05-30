import { describe, expect, it } from "vitest";
import {
  activateEncounterShield,
  aimEncounterTarget,
  burstEncounterTarget,
  createCombatEncounter,
  tapEncounterTarget,
  tickCombatEncounter
} from "../systems/CombatEncounterSystem";

describe("combat encounter state", () => {
  it("emits a hit event and hp snapshot when the player taps an enemy", () => {
    const encounter = createCombatEncounter({
      boss: { id: "boss", maxHp: 240, weakness: "burst" },
      minions: [{ id: "minion-1", maxHp: 60, weakness: "tap" }]
    });

    const result = tapEncounterTarget(encounter, "minion-1");

    expect(result.snapshot.minions[0].hp).toBeLessThan(60);
    expect(result.snapshot.nextCounterMs).toBeGreaterThan(0);
    expect(result.snapshot.counterIntervalMs).toBeGreaterThan(0);
    expect(result.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "hit", targetId: "minion-1", source: "tap" })
      ])
    );
    expect(result.comboGain).toBeGreaterThan(0);
    expect(result.dpsBonus).toBeGreaterThan(0);
  });

  it("deals more damage with burst than tap against the same target", () => {
    const tapEncounter = createCombatEncounter({
      boss: { id: "boss", maxHp: 300, weakness: "burst" },
      minions: []
    });
    const burstEncounter = createCombatEncounter({
      boss: { id: "boss", maxHp: 300, weakness: "burst" },
      minions: []
    });

    const tapped = tapEncounterTarget(tapEncounter, "boss");
    const burst = burstEncounterTarget(burstEncounter, "boss");

    expect(burst.damageDealt).toBeGreaterThan(tapped.damageDealt);
    expect(burst.snapshot.boss.hp).toBeLessThan(tapped.snapshot.boss.hp);
  });

  it("does not keep a defeated minion as the target", () => {
    const encounter = createCombatEncounter({
      boss: { id: "boss", maxHp: 300, weakness: "aim" },
      minions: [
        { id: "minion-1", maxHp: 20, weakness: "burst" },
        { id: "minion-2", maxHp: 80, weakness: "tap" }
      ]
    });

    const killed = burstEncounterTarget(encounter, "minion-1");
    const next = tapEncounterTarget(killed.state, "minion-1");

    expect(killed.snapshot.minions.find((minion) => minion.id === "minion-1")?.hp).toBe(0);
    expect(killed.events).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "death", targetId: "minion-1" })])
    );
    expect(next.targetId).not.toBe("minion-1");
    expect(next.snapshot.minions.find((minion) => minion.id === "minion-1")?.hp).toBe(0);
  });

  it("reduces incoming counter damage while shield is active", () => {
    const unshielded = createCombatEncounter({
      boss: { id: "boss", maxHp: 300, weakness: "tap", counterDamage: 40, counterIntervalMs: 500 },
      minions: []
    });
    const shielded = activateEncounterShield(
      createCombatEncounter({
        boss: { id: "boss", maxHp: 300, weakness: "tap", counterDamage: 40, counterIntervalMs: 500 },
        minions: []
      })
    ).state;

    const unshieldedTick = tickCombatEncounter(unshielded, 500);
    const shieldedTick = tickCombatEncounter(shielded, 500);

    expect(shieldedTick.incomingDamage).toBeLessThan(unshieldedTick.incomingDamage);
    expect(shieldedTick.events).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "counter", mitigated: true })])
    );
  });

  it("aim increases the next tick damage against the aimed target", () => {
    const encounter = createCombatEncounter({
      boss: { id: "boss", maxHp: 300, weakness: "aim" },
      minions: []
    });

    const aimed = aimEncounterTarget(encounter, "boss");
    const ticked = tickCombatEncounter(aimed.state, 1000);

    expect(aimed.snapshot.boss.hp).toBeLessThan(300);
    expect(ticked.snapshot.boss.hp).toBeLessThan(aimed.snapshot.boss.hp);
    expect(ticked.dpsBonus).toBeGreaterThan(0);
  });
});
