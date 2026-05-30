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

interface BattleWave {
  durationMs: number;
  enemyCount: number;
  enemyHp: number;
  armor: number;
}

const BATTLE_WAVES: BattleWave[] = [
  { durationMs: 6_000, enemyCount: 3, enemyHp: 72, armor: 0 },
  { durationMs: 7_000, enemyCount: 4, enemyHp: 104, armor: 0.04 },
  { durationMs: 8_000, enemyCount: 5, enemyHp: 128, armor: 0.08 },
  { durationMs: 9_000, enemyCount: 3, enemyHp: 185, armor: 0.12 }
];

const effectDamageBonus: Record<string, number> = {
  burn: 0.2,
  freeze: 0.06,
  shock: 0.24,
  poison: 0.18,
  pierce: 0.16,
  homing: 0.12,
  knockback: 0.08,
  glitch: 0.22,
  buff: 0.1,
  burst: 0.28
};

const targetPressure = {
  nearest: 1,
  random: 0.92,
  front: 1.08,
  area: 1.34
};

const countEffects = (items: EquippedItem[], effect: string): number =>
  items.reduce((sum, item) => sum + item.effects.filter((itemEffect) => itemEffect === effect).length, 0);

const estimateItemDps = (item: EquippedItem, teamMultiplier: number): number => {
  const attacksPerSecond = 1000 / item.trigger.cooldownMs;
  const effectMultiplier = item.effects.reduce((multiplier, effect) => multiplier + (effectDamageBonus[effect] ?? 0.1), 1);
  const fusedMultiplier = item.fused ? 1.45 : 1;
  const sourceMultiplier = item.fused ? 1 + Math.max(0, item.sourcePartIds.length - 1) * 0.08 : 1;
  const cooldownPressure = 1 + Math.min(0.32, attacksPerSecond * 0.08);

  return (
    item.trigger.damage *
    attacksPerSecond *
    effectMultiplier *
    targetPressure[item.trigger.target] *
    fusedMultiplier *
    sourceMultiplier *
    cooldownPressure *
    teamMultiplier
  );
};

export const estimateBuildPower = (items: EquippedItem[]): number => {
  if (items.length === 0) {
    return 0;
  }

  const buffMultiplier = 1 + countEffects(items, "buff") * 0.1;
  const fusionMultiplier = 1 + items.filter((item) => item.fused).length * 0.16;
  const weaponPressure = 1 + Math.min(0.18, Math.max(0, items.length - 1) * 0.04);
  const dps = items.reduce((sum, item) => sum + estimateItemDps(item, buffMultiplier), 0);
  const controlScore = (countEffects(items, "freeze") + countEffects(items, "knockback") + countEffects(items, "homing")) * 9;
  const burstScore = (countEffects(items, "burst") + countEffects(items, "shock") + countEffects(items, "glitch")) * 12;

  return Math.round((dps * 10 + controlScore + burstScore) * fusionMultiplier * weaponPressure);
};

export const simulateBattleWaves = (items: EquippedItem[]): BattleSummary => {
  const durationMs = BATTLE_WAVES.reduce((sum, wave) => sum + wave.durationMs, 0);
  const buildPower = estimateBuildPower(items);
  const baseCombo = items.reduce((sum, item) => {
    const attacksPerSecond = 1000 / item.trigger.cooldownMs;
    const effectCombo = item.effects.length * (item.fused ? 4 : 2);
    const frequencyCombo = attacksPerSecond * (item.fused ? 2.2 : 1.4);
    const areaCombo = item.trigger.target === "area" ? 2 : 0;
    return sum + effectCombo + frequencyCombo + areaCombo;
  }, 0);
  const maxCombo = Math.max(1, Math.round(baseCombo + Math.min(5, items.length - 1)));
  const overdriveTriggered = maxCombo >= 12 || buildPower >= 820;
  const overdriveMultiplier = overdriveTriggered ? 1.35 : 1;
  const controlMitigation =
    1 +
    countEffects(items, "freeze") * 0.04 +
    countEffects(items, "knockback") * 0.035 +
    countEffects(items, "homing") * 0.025;
  let defeatedWaves = 0;
  let peakDps = 0;

  for (const wave of BATTLE_WAVES) {
    const waveHp = wave.enemyCount * wave.enemyHp * (1 + wave.armor);
    const waveBudget = (buildPower / 10) * (wave.durationMs / 1000) * controlMitigation * overdriveMultiplier;
    const waveDps = waveBudget / (wave.durationMs / 1000);
    peakDps = Math.max(peakDps, waveDps);

    if (waveBudget < waveHp) {
      break;
    }

    defeatedWaves += 1;
  }

  return {
    result: defeatedWaves === BATTLE_WAVES.length ? "victory" : "death",
    maxDps: Math.round(peakDps),
    maxCombo,
    durationMs,
    overdriveTriggered
  };
};

export const simulateCombat = (items: EquippedItem[]): BattleSummary => simulateBattleWaves(items);
