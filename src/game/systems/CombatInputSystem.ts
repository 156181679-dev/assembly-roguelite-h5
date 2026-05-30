export interface CombatInputTimer {
  remainingMs: number;
  durationMs: number;
}

export interface CombatTargetLock extends CombatInputTimer {
  targetId: string | null;
}

export interface CombatInputState {
  energy: number;
  maxEnergy: number;
  actionScore: number;
  focus: CombatInputTimer;
  shield: CombatInputTimer;
  targetLock: CombatTargetLock;
}

export interface CombatInputMultipliers {
  damage: number;
  incomingDamage: number;
  actionScore: number;
  targetId: string | null;
}

export interface CombatInputStateOptions {
  energy?: number;
  maxEnergy?: number;
  actionScore?: number;
  focusRemainingMs?: number;
  shieldRemainingMs?: number;
  targetLockRemainingMs?: number;
  targetId?: string | null;
}

const DEFAULT_MAX_ENERGY = 100;
const MANUAL_STRIKE_ENERGY_GAIN = 16;
const MANUAL_STRIKE_SCORE_GAIN = 8;
const AIM_ENERGY_COST = 10;
const AIM_SCORE_GAIN = 12;
const BURST_ENERGY_COST = 42;
const BURST_SCORE_GAIN = 28;
const SHIELD_ENERGY_COST = 28;
const SHIELD_SCORE_GAIN = 16;
const FOCUS_DURATION_MS = 3_500;
const SHIELD_DURATION_MS = 3_000;
const TARGET_LOCK_DURATION_MS = 4_000;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const tickTimer = <T extends CombatInputTimer>(timer: T, deltaMs: number): T => ({
  ...timer,
  remainingMs: Math.max(0, timer.remainingMs - Math.max(0, deltaMs))
});

const spendEnergy = (state: CombatInputState, cost: number): CombatInputState | null => {
  if (state.energy < cost) {
    return null;
  }

  return {
    ...state,
    energy: state.energy - cost
  };
};

const withTargetLock = (state: CombatInputState, targetId: string): CombatInputState => ({
  ...state,
  targetLock: {
    targetId,
    durationMs: TARGET_LOCK_DURATION_MS,
    remainingMs: TARGET_LOCK_DURATION_MS
  }
});

export const createCombatInputState = (options: CombatInputStateOptions = {}): CombatInputState => {
  const maxEnergy = options.maxEnergy ?? DEFAULT_MAX_ENERGY;

  return {
    energy: clamp(options.energy ?? 0, 0, maxEnergy),
    maxEnergy,
    actionScore: Math.max(0, options.actionScore ?? 0),
    focus: {
      durationMs: FOCUS_DURATION_MS,
      remainingMs: clamp(options.focusRemainingMs ?? 0, 0, FOCUS_DURATION_MS)
    },
    shield: {
      durationMs: SHIELD_DURATION_MS,
      remainingMs: clamp(options.shieldRemainingMs ?? 0, 0, SHIELD_DURATION_MS)
    },
    targetLock: {
      targetId: options.targetId ?? null,
      durationMs: TARGET_LOCK_DURATION_MS,
      remainingMs: clamp(options.targetLockRemainingMs ?? 0, 0, TARGET_LOCK_DURATION_MS)
    }
  };
};

export const updateCombatInput = (state: CombatInputState, deltaMs: number): CombatInputState => {
  const targetLock = tickTimer(state.targetLock, deltaMs);

  return {
    ...state,
    focus: tickTimer(state.focus, deltaMs),
    shield: tickTimer(state.shield, deltaMs),
    targetLock: {
      ...targetLock,
      targetId: targetLock.remainingMs > 0 ? targetLock.targetId : null
    }
  };
};

export const manualStrike = (state: CombatInputState, targetId: string): CombatInputState =>
  withTargetLock(
    {
      ...state,
      energy: clamp(state.energy + MANUAL_STRIKE_ENERGY_GAIN, 0, state.maxEnergy),
      actionScore: state.actionScore + MANUAL_STRIKE_SCORE_GAIN
    },
    targetId
  );

export const triggerAim = (state: CombatInputState, targetId: string): CombatInputState => {
  const next = spendEnergy(state, AIM_ENERGY_COST);
  if (!next) {
    return state;
  }

  return withTargetLock(
    {
      ...next,
      actionScore: next.actionScore + AIM_SCORE_GAIN
    },
    targetId
  );
};

export const triggerBurst = (state: CombatInputState, targetId: string): CombatInputState => {
  const next = spendEnergy(state, BURST_ENERGY_COST);
  if (!next) {
    return state;
  }

  return withTargetLock(
    {
      ...next,
      actionScore: next.actionScore + BURST_SCORE_GAIN,
      focus: {
        durationMs: FOCUS_DURATION_MS,
        remainingMs: FOCUS_DURATION_MS
      }
    },
    targetId
  );
};

export const triggerShield = (state: CombatInputState): CombatInputState => {
  const next = spendEnergy(state, SHIELD_ENERGY_COST);
  if (!next) {
    return state;
  }

  return {
    ...next,
    actionScore: next.actionScore + SHIELD_SCORE_GAIN,
    shield: {
      durationMs: SHIELD_DURATION_MS,
      remainingMs: SHIELD_DURATION_MS
    }
  };
};

export const combatInputToMultipliers = (state: CombatInputState): CombatInputMultipliers => {
  const focusActive = state.focus.remainingMs > 0;
  const shieldActive = state.shield.remainingMs > 0;
  const targetLocked = state.targetLock.remainingMs > 0 ? state.targetLock.targetId : null;

  return {
    damage: focusActive ? 1.35 : 1,
    incomingDamage: shieldActive ? 0.55 : 1,
    actionScore: 1 + Math.min(0.35, state.actionScore / 300),
    targetId: targetLocked
  };
};
