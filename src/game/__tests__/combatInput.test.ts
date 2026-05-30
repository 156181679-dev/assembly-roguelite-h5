import { describe, expect, it } from "vitest";
import {
  combatInputToMultipliers,
  createCombatInputState,
  manualStrike,
  triggerBurst,
  triggerShield,
  updateCombatInput
} from "../systems/CombatInputSystem";

describe("combat input state", () => {
  it("charges energy and action score when the player clicks an enemy", () => {
    const state = createCombatInputState();

    const next = manualStrike(state, "enemy-1");

    expect(next.energy).toBeGreaterThan(state.energy);
    expect(next.actionScore).toBeGreaterThan(state.actionScore);
    expect(next.targetLock.targetId).toBe("enemy-1");
    expect(next.targetLock.remainingMs).toBeGreaterThan(0);
  });

  it("does not trigger burst when energy is too low", () => {
    const state = createCombatInputState({ energy: 10 });

    const next = triggerBurst(state, "enemy-2");

    expect(next.energy).toBe(10);
    expect(next.focus.remainingMs).toBe(0);
    expect(next.targetLock.targetId).toBeNull();
    expect(next.actionScore).toBe(state.actionScore);
  });

  it("spends energy and adds focus and action score when burst is triggered", () => {
    const state = createCombatInputState({ energy: 100 });

    const next = triggerBurst(state, "enemy-boss");
    const multipliers = combatInputToMultipliers(next);

    expect(next.energy).toBeLessThan(state.energy);
    expect(next.focus.remainingMs).toBeGreaterThan(0);
    expect(next.targetLock.targetId).toBe("enemy-boss");
    expect(next.actionScore).toBeGreaterThan(state.actionScore);
    expect(multipliers.damage).toBeGreaterThan(1);
  });

  it("spends energy and adds shield when shield is triggered", () => {
    const state = createCombatInputState({ energy: 100 });

    const next = triggerShield(state);
    const afterTick = updateCombatInput(next, 250);

    expect(next.energy).toBeLessThan(state.energy);
    expect(next.shield.remainingMs).toBeGreaterThan(0);
    expect(afterTick.shield.remainingMs).toBe(next.shield.remainingMs - 250);
    expect(combatInputToMultipliers(next).incomingDamage).toBeLessThan(1);
  });
});
