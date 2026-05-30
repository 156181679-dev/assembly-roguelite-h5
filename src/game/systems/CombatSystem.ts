import type { BattleSummary, EquippedItem, PartDef, SlotId, WeaponDef } from "../types";

const uid = (prefix: string): string => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const createEquippedPart = (part: PartDef, slotId: SlotId): EquippedItem => {
  if (!part.baseTrigger) {
    throw new Error(`Part ${part.id} has no combat trigger`);
  }

  return {
    uid: uid(part.id),
    sourcePartIds: [part.id],
    name: part.name,
    slotId,
    color: part.color,
    icon: part.icon,
    tags: part.tags,
    effects: part.baseTrigger.effects,
    trigger: part.baseTrigger,
    fused: false
  };
};

export const createEquippedWeapon = (weapon: WeaponDef, slotId: SlotId, sourcePartIds: string[]): EquippedItem => ({
  uid: uid(weapon.id),
  weaponId: weapon.id,
  sourcePartIds,
  name: weapon.name,
  slotId,
  color: weapon.color,
  icon: weapon.icon,
  tags: weapon.tags,
  effects: weapon.effects,
  trigger: weapon.trigger,
  fused: true
});

export const simulateCombat = (items: EquippedItem[]): BattleSummary => {
  const durationMs = 30_000;
  const totalDamage = items.reduce((sum, item) => {
    const activations = durationMs / item.trigger.cooldownMs;
    const effectMultiplier = 1 + item.effects.length * 0.22;
    const fusedMultiplier = item.fused ? 1.7 : 1;
    return sum + item.trigger.damage * activations * effectMultiplier * fusedMultiplier;
  }, 0);

  const maxCombo = Math.max(1, Math.round(items.reduce((sum, item) => sum + item.effects.length * (item.fused ? 4 : 2), 0)));
  const overdriveTriggered = maxCombo >= 12 || totalDamage > 900;
  const overdriveMultiplier = overdriveTriggered ? 1.8 : 1;
  const finalDamage = totalDamage * overdriveMultiplier;

  return {
    result: finalDamage >= 800 ? "victory" : "death",
    maxDps: Math.round(finalDamage / (durationMs / 1000)),
    maxCombo,
    durationMs,
    overdriveTriggered
  };
};
