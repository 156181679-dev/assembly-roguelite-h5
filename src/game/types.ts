export type PartCategory = "physical" | "elemental" | "abstract" | "catalyst";
export type Rarity = "common" | "rare" | "epic";
export type EffectPrimitive =
  | "burn"
  | "freeze"
  | "shock"
  | "poison"
  | "pierce"
  | "homing"
  | "knockback"
  | "glitch"
  | "buff"
  | "burst";

export type TargetingMode = "nearest" | "random" | "front" | "area";
export type SlotId = "head" | "body" | "left_hand" | "right_hand" | "back" | "feet";
export type GamePhase =
  | "launch"
  | "home"
  | "loot"
  | "lootResult"
  | "assembly"
  | "fusion"
  | "fusionSuccess"
  | "combat"
  | "result"
  | "museum"
  | "weaponDetail"
  | "graveyard"
  | "graveStart"
  | "share"
  | "shop"
  | "missions"
  | "achievements"
  | "settings"
  | "tutorial";

export interface TriggerDef {
  id: string;
  cooldownMs: number;
  target: TargetingMode;
  damage: number;
  effects: EffectPrimitive[];
  visualPreset: string;
}

export interface PartDef {
  id: string;
  name: string;
  category: PartCategory;
  rarity: Rarity;
  tags: string[];
  weight: number;
  color: string;
  icon: string;
  baseTrigger?: TriggerDef;
}

export interface FusionRule {
  id: string;
  priority: number;
  match: {
    partIds?: [string, string];
    tags?: string[];
    categories?: PartCategory[];
  };
  result: {
    id: string;
    name: string;
    tags: string[];
    color: string;
    icon: string;
    effects: EffectPrimitive[];
    trigger: TriggerDef;
  };
}

export interface WeaponDef {
  id: string;
  name: string;
  tags: string[];
  color: string;
  icon: string;
  effects: EffectPrimitive[];
  trigger: TriggerDef;
}

export interface FusionResult {
  ruleType: "exact" | "tag" | "chaos";
  weapon: WeaponDef;
  formulaText: string;
}

export interface EquippedItem {
  uid: string;
  weaponId?: string;
  sourcePartIds: string[];
  name: string;
  slotId: SlotId;
  color: string;
  icon: string;
  tags: string[];
  effects: EffectPrimitive[];
  trigger: TriggerDef;
  fused: boolean;
}

export interface RunState {
  round: number;
  phase: GamePhase;
  ownedPartIds: string[];
  inventory: EquippedItem[];
  equipped: Partial<Record<SlotId, EquippedItem>>;
  fusedWeapons: EquippedItem[];
  fusionCount: number;
  maxCombo: number;
  maxDps: number;
  result?: "victory" | "death";
}

export interface MuseumRecord {
  id: string;
  timestamp: number;
  weaponName: string;
  parts: string[];
  fusedWeapons: string[];
  maxDps: number;
  maxCombo: number;
  fusionCount: number;
  result: "victory" | "death";
  shareImageDataUrl: string;
}

export interface BattleSummary {
  result: "victory" | "death";
  maxDps: number;
  maxCombo: number;
  durationMs: number;
  overdriveTriggered: boolean;
}
