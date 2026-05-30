export type EncounterActionSource = "tap" | "aim" | "burst" | "auto";
export type EncounterWeakness = Exclude<EncounterActionSource, "auto">;

export interface EncounterTargetOptions {
  id: string;
  maxHp: number;
  weakness?: EncounterWeakness;
  counterDamage?: number;
  counterIntervalMs?: number;
}

export interface EncounterOptions {
  boss: EncounterTargetOptions;
  minions?: EncounterTargetOptions[];
  autoDps?: number;
}

export interface EncounterTargetState extends Required<EncounterTargetOptions> {
  hp: number;
}

export interface CombatEncounterState {
  elapsedMs: number;
  boss: EncounterTargetState;
  minions: EncounterTargetState[];
  targetId: string;
  combo: number;
  dpsBonus: number;
  shieldRemainingMs: number;
  aim: {
    targetId: string | null;
    remainingMs: number;
  };
  nextCounterMs: number;
  autoDps: number;
}

export type EncounterEvent =
  | {
      type: "hit";
      targetId: string;
      source: EncounterActionSource;
      damage: number;
      weakness: boolean;
      hp: number;
    }
  | {
      type: "death";
      targetId: string;
      source: EncounterActionSource;
    }
  | {
      type: "counter";
      sourceId: string;
      damage: number;
      mitigated: boolean;
    }
  | {
      type: "shield";
      remainingMs: number;
    };

export interface EncounterSnapshotTarget {
  id: string;
  hp: number;
  maxHp: number;
  weakness: EncounterWeakness;
  alive: boolean;
}

export interface EncounterSnapshot {
  elapsedMs: number;
  boss: EncounterSnapshotTarget;
  minions: EncounterSnapshotTarget[];
  targetId: string;
  combo: number;
  dpsBonus: number;
  shieldRemainingMs: number;
}

export interface EncounterResult {
  state: CombatEncounterState;
  snapshot: EncounterSnapshot;
  events: EncounterEvent[];
  targetId: string;
  damageDealt: number;
  incomingDamage: number;
  comboGain: number;
  dpsBonus: number;
}

const DEFAULT_AUTO_DPS = 18;
const DEFAULT_COUNTER_DAMAGE = 18;
const DEFAULT_COUNTER_INTERVAL_MS = 1_800;
const SHIELD_DURATION_MS = 3_000;
const SHIELD_INCOMING_MULTIPLIER = 0.45;
const AIM_DURATION_MS = 2_400;
const AIM_TICK_MULTIPLIER = 1.45;

const ACTION_DAMAGE: Record<EncounterActionSource, number> = {
  tap: 18,
  aim: 28,
  burst: 62,
  auto: 0
};

const ACTION_COMBO_GAIN: Record<EncounterActionSource, number> = {
  tap: 1,
  aim: 2,
  burst: 5,
  auto: 0
};

const ACTION_DPS_BONUS: Record<EncounterActionSource, number> = {
  tap: 22,
  aim: 48,
  burst: 140,
  auto: 0
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const normalizeTarget = (target: EncounterTargetOptions): EncounterTargetState => ({
  ...target,
  hp: clamp(target.maxHp, 0, target.maxHp),
  weakness: target.weakness ?? "tap",
  counterDamage: target.counterDamage ?? DEFAULT_COUNTER_DAMAGE,
  counterIntervalMs: target.counterIntervalMs ?? DEFAULT_COUNTER_INTERVAL_MS
});

const isAlive = (target: EncounterTargetState): boolean => target.hp > 0;

const snapshotTarget = (target: EncounterTargetState): EncounterSnapshotTarget => ({
  id: target.id,
  hp: target.hp,
  maxHp: target.maxHp,
  weakness: target.weakness,
  alive: isAlive(target)
});

const firstAliveTarget = (state: CombatEncounterState): EncounterTargetState =>
  state.minions.find(isAlive) ?? state.boss;

const findAliveTarget = (state: CombatEncounterState, targetId?: string | null): EncounterTargetState => {
  const target = [state.boss, ...state.minions].find((candidate) => candidate.id === targetId && isAlive(candidate));
  return target ?? firstAliveTarget(state);
};

const nextTargetId = (state: CombatEncounterState): string => findAliveTarget(state, state.targetId).id;

const createResult = (
  state: CombatEncounterState,
  events: EncounterEvent[],
  damageDealt: number,
  incomingDamage: number,
  comboGain: number,
  dpsBonus: number
): EncounterResult => ({
  state,
  snapshot: {
    elapsedMs: state.elapsedMs,
    boss: snapshotTarget(state.boss),
    minions: state.minions.map(snapshotTarget),
    targetId: state.targetId,
    combo: state.combo,
    dpsBonus: state.dpsBonus,
    shieldRemainingMs: state.shieldRemainingMs
  },
  events,
  targetId: state.targetId,
  damageDealt,
  incomingDamage,
  comboGain,
  dpsBonus
});

const replaceTarget = (
  state: CombatEncounterState,
  targetId: string,
  update: (target: EncounterTargetState) => EncounterTargetState
): CombatEncounterState => {
  if (state.boss.id === targetId) {
    return { ...state, boss: update(state.boss) };
  }

  return {
    ...state,
    minions: state.minions.map((minion) => (minion.id === targetId ? update(minion) : minion))
  };
};

const applyDamage = (
  state: CombatEncounterState,
  targetId: string | null | undefined,
  source: EncounterActionSource,
  damage: number
): { state: CombatEncounterState; events: EncounterEvent[]; damageDealt: number; targetId: string } => {
  const target = findAliveTarget(state, targetId);
  const weakness = source !== "auto" && target.weakness === source;
  const finalDamage = Math.round(damage * (weakness ? 1.5 : 1));
  const nextHp = clamp(target.hp - finalDamage, 0, target.maxHp);
  const damageDealt = target.hp - nextHp;
  let nextState = replaceTarget(state, target.id, (current) => ({ ...current, hp: nextHp }));
  const events: EncounterEvent[] = [
    {
      type: "hit",
      targetId: target.id,
      source,
      damage: damageDealt,
      weakness,
      hp: nextHp
    }
  ];

  if (target.hp > 0 && nextHp === 0) {
    events.push({ type: "death", targetId: target.id, source });
  }

  nextState = {
    ...nextState,
    targetId: nextTargetId(nextState)
  };

  return { state: nextState, events, damageDealt, targetId: target.id };
};

const applyPlayerAction = (
  state: CombatEncounterState,
  targetId: string,
  source: EncounterWeakness
): EncounterResult => {
  const damage = ACTION_DAMAGE[source];
  const damaged = applyDamage(state, targetId, source, damage);
  const comboGain = ACTION_COMBO_GAIN[source];
  const dpsBonus = ACTION_DPS_BONUS[source] + damaged.damageDealt;
  const nextState: CombatEncounterState = {
    ...damaged.state,
    combo: damaged.state.combo + comboGain,
    dpsBonus: damaged.state.dpsBonus + dpsBonus,
    targetId: damaged.state.targetId,
    aim:
      source === "aim"
        ? {
            targetId: damaged.targetId,
            remainingMs: AIM_DURATION_MS
          }
        : damaged.state.aim
  };

  return createResult(nextState, damaged.events, damaged.damageDealt, 0, comboGain, dpsBonus);
};

export const createCombatEncounter = (options: EncounterOptions): CombatEncounterState => {
  const boss = normalizeTarget(options.boss);
  const minions = (options.minions ?? []).map(normalizeTarget);
  const state: CombatEncounterState = {
    elapsedMs: 0,
    boss,
    minions,
    targetId: minions.find(isAlive)?.id ?? boss.id,
    combo: 0,
    dpsBonus: 0,
    shieldRemainingMs: 0,
    aim: {
      targetId: null,
      remainingMs: 0
    },
    nextCounterMs: boss.counterIntervalMs,
    autoDps: options.autoDps ?? DEFAULT_AUTO_DPS
  };

  return { ...state, targetId: nextTargetId(state) };
};

export const tapEncounterTarget = (state: CombatEncounterState, targetId: string): EncounterResult =>
  applyPlayerAction(state, targetId, "tap");

export const aimEncounterTarget = (state: CombatEncounterState, targetId: string): EncounterResult =>
  applyPlayerAction(state, targetId, "aim");

export const burstEncounterTarget = (state: CombatEncounterState, targetId: string): EncounterResult =>
  applyPlayerAction(state, targetId, "burst");

export const activateEncounterShield = (state: CombatEncounterState): EncounterResult => {
  const nextState: CombatEncounterState = {
    ...state,
    shieldRemainingMs: SHIELD_DURATION_MS,
    combo: state.combo + 1,
    dpsBonus: state.dpsBonus + 30
  };

  return createResult(nextState, [{ type: "shield", remainingMs: SHIELD_DURATION_MS }], 0, 0, 1, 30);
};

export const tickCombatEncounter = (state: CombatEncounterState, deltaMs: number): EncounterResult => {
  const safeDeltaMs = Math.max(0, deltaMs);
  const shieldRemainingMs = Math.max(0, state.shieldRemainingMs - safeDeltaMs);
  const aimRemainingMs = Math.max(0, state.aim.remainingMs - safeDeltaMs);
  let nextState: CombatEncounterState = {
    ...state,
    elapsedMs: state.elapsedMs + safeDeltaMs,
    shieldRemainingMs,
    aim: {
      targetId: aimRemainingMs > 0 ? state.aim.targetId : null,
      remainingMs: aimRemainingMs
    },
    nextCounterMs: state.nextCounterMs - safeDeltaMs,
    targetId: nextTargetId(state)
  };
  const events: EncounterEvent[] = [];
  let damageDealt = 0;
  let incomingDamage = 0;
  let dpsBonus = 0;

  if (safeDeltaMs > 0 && isAlive(nextState.boss)) {
    const preferredTargetId = state.aim.remainingMs > 0 ? state.aim.targetId : state.targetId;
    const autoMultiplier = state.aim.remainingMs > 0 ? AIM_TICK_MULTIPLIER : 1;
    const autoDamage = (state.autoDps * safeDeltaMs * autoMultiplier) / 1000;
    const damaged = applyDamage(nextState, preferredTargetId, "auto", autoDamage);
    nextState = damaged.state;
    events.push(...damaged.events);
    damageDealt += damaged.damageDealt;
    dpsBonus += damaged.damageDealt;
  }

  if (nextState.nextCounterMs <= 0 && isAlive(nextState.boss)) {
    const mitigated = state.shieldRemainingMs > 0;
    const counterDamage = Math.round(nextState.boss.counterDamage * (mitigated ? SHIELD_INCOMING_MULTIPLIER : 1));
    incomingDamage += counterDamage;
    events.push({
      type: "counter",
      sourceId: nextState.boss.id,
      damage: counterDamage,
      mitigated
    });
    nextState = {
      ...nextState,
      nextCounterMs: nextState.boss.counterIntervalMs
    };
  }

  if (dpsBonus > 0) {
    nextState = {
      ...nextState,
      dpsBonus: nextState.dpsBonus + dpsBonus
    };
  }

  return createResult(nextState, events, damageDealt, incomingDamage, 0, dpsBonus);
};
