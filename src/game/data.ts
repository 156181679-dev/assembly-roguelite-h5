import type { FusionRule, PartDef, RunState, SlotId, TriggerDef } from "./types";

const trigger = (
  id: string,
  damage: number,
  cooldownMs: number,
  visualPreset: string,
  effects: TriggerDef["effects"],
  target: TriggerDef["target"] = "nearest"
): TriggerDef => ({
  id,
  damage,
  cooldownMs,
  visualPreset,
  effects,
  target
});

export const SLOT_ORDER: SlotId[] = ["head", "body", "left_hand", "right_hand", "back", "feet"];

export const PART_DEFS: PartDef[] = [
  {
    id: "blade",
    name: "刀刃",
    category: "physical",
    rarity: "common",
    tags: ["physical", "metal", "blade", "melee"],
    weight: 10,
    color: "#d6e2ff",
    icon: "刀",
    baseTrigger: trigger("slash", 12, 850, "arc", ["pierce"], "front")
  },
  {
    id: "barrel",
    name: "枪管",
    category: "physical",
    rarity: "common",
    tags: ["physical", "metal", "barrel", "ranged"],
    weight: 10,
    color: "#9aa7b7",
    icon: "炮",
    baseTrigger: trigger("bullet", 10, 760, "line", ["pierce"])
  },
  {
    id: "spring",
    name: "弹簧",
    category: "physical",
    rarity: "common",
    tags: ["physical", "spring", "bounce"],
    weight: 9,
    color: "#f7d46b",
    icon: "簧",
    baseTrigger: trigger("bounce", 8, 700, "pulse", ["knockback"])
  },
  {
    id: "rocket",
    name: "火箭推进器",
    category: "physical",
    rarity: "rare",
    tags: ["physical", "rocket", "engine", "homing"],
    weight: 7,
    color: "#ff6a5a",
    icon: "箭",
    baseTrigger: trigger("rocket", 16, 1200, "missile", ["homing", "burst"])
  },
  {
    id: "fish",
    name: "鱼",
    category: "physical",
    rarity: "common",
    tags: ["physical", "fish", "weird", "projectile"],
    weight: 9,
    color: "#58c7ff",
    icon: "鱼",
    baseTrigger: trigger("fishbone", 8, 560, "fishbone", ["pierce"])
  },
  {
    id: "plunger",
    name: "马桶搋子",
    category: "physical",
    rarity: "common",
    tags: ["physical", "rubber", "bonk"],
    weight: 8,
    color: "#ff4d6d",
    icon: "搋",
    baseTrigger: trigger("bonk", 9, 680, "bonk", ["knockback"], "front")
  },
  {
    id: "gear",
    name: "齿轮",
    category: "physical",
    rarity: "common",
    tags: ["physical", "metal", "rotary"],
    weight: 8,
    color: "#b9c0ca",
    icon: "齿",
    baseTrigger: trigger("gear", 11, 760, "saw", ["pierce"])
  },
  {
    id: "chainsaw",
    name: "电锯",
    category: "physical",
    rarity: "rare",
    tags: ["physical", "metal", "blade", "rotary"],
    weight: 6,
    color: "#f9c23c",
    icon: "锯",
    baseTrigger: trigger("chainsaw", 18, 1050, "saw", ["pierce", "knockback"], "front")
  },
  {
    id: "fire_gem",
    name: "火焰宝石",
    category: "elemental",
    rarity: "common",
    tags: ["elemental", "fire", "explosion"],
    weight: 9,
    color: "#ff7a1a",
    icon: "火",
    baseTrigger: trigger("ember", 9, 780, "ember", ["burn"])
  },
  {
    id: "ice_core",
    name: "冰霜核心",
    category: "elemental",
    rarity: "common",
    tags: ["elemental", "ice", "slow"],
    weight: 9,
    color: "#7be8ff",
    icon: "冰",
    baseTrigger: trigger("frost", 8, 850, "frost", ["freeze"])
  },
  {
    id: "lightning_coil",
    name: "闪电线圈",
    category: "elemental",
    rarity: "rare",
    tags: ["elemental", "lightning", "energy"],
    weight: 7,
    color: "#b26bff",
    icon: "雷",
    baseTrigger: trigger("spark", 12, 920, "spark", ["shock"])
  },
  {
    id: "poison_tank",
    name: "毒液罐",
    category: "elemental",
    rarity: "common",
    tags: ["elemental", "poison", "area"],
    weight: 8,
    color: "#56d05f",
    icon: "毒",
    baseTrigger: trigger("poison", 8, 960, "cloud", ["poison"], "area")
  },
  {
    id: "wind_fan",
    name: "暴风风扇",
    category: "elemental",
    rarity: "common",
    tags: ["elemental", "wind", "knockback"],
    weight: 8,
    color: "#8ee5d1",
    icon: "风",
    baseTrigger: trigger("wind", 7, 680, "gust", ["knockback"])
  },
  {
    id: "shadow_orb",
    name: "暗影球",
    category: "elemental",
    rarity: "rare",
    tags: ["elemental", "shadow", "glitch"],
    weight: 6,
    color: "#8151d9",
    icon: "影",
    baseTrigger: trigger("shadow", 13, 950, "glitch", ["glitch"])
  },
  {
    id: "friend_blessing",
    name: "朋友的祝福",
    category: "abstract",
    rarity: "common",
    tags: ["abstract", "blessing", "buff"],
    weight: 7,
    color: "#ffd166",
    icon: "友",
    baseTrigger: trigger("blessing", 6, 1100, "halo", ["buff"], "area")
  },
  {
    id: "ex_curse",
    name: "前任的诅咒",
    category: "abstract",
    rarity: "rare",
    tags: ["abstract", "curse", "glitch"],
    weight: 7,
    color: "#9d4edd",
    icon: "咒",
    baseTrigger: trigger("curse", 11, 900, "glitch", ["glitch"])
  },
  {
    id: "kpi",
    name: "老板的 KPI",
    category: "abstract",
    rarity: "rare",
    tags: ["abstract", "kpi", "pressure", "glitch"],
    weight: 6,
    color: "#ff3b3b",
    icon: "KPI",
    baseTrigger: trigger("kpi", 14, 980, "warning", ["glitch", "burst"])
  },
  {
    id: "procrastination",
    name: "拖延症",
    category: "abstract",
    rarity: "common",
    tags: ["abstract", "delay", "weird"],
    weight: 7,
    color: "#95a3b3",
    icon: "拖",
    baseTrigger: trigger("delay", 7, 1250, "slow", ["freeze"])
  },
  {
    id: "friendship",
    name: "友情",
    category: "abstract",
    rarity: "common",
    tags: ["abstract", "friendship", "buff"],
    weight: 7,
    color: "#fcbf49",
    icon: "情",
    baseTrigger: trigger("friendship", 8, 1000, "halo", ["buff"])
  },
  {
    id: "fortune",
    name: "暴富",
    category: "abstract",
    rarity: "epic",
    tags: ["abstract", "money", "burst"],
    weight: 4,
    color: "#2dd881",
    icon: "富",
    baseTrigger: trigger("fortune", 22, 1400, "coin", ["burst"])
  },
  {
    id: "fusion_catalyst",
    name: "融合催化剂",
    category: "catalyst",
    rarity: "epic",
    tags: ["catalyst", "fusion"],
    weight: 0,
    color: "#ffffff",
    icon: "融"
  }
];

export const FUSION_RULES: FusionRule[] = [
  {
    id: "fire_blade",
    priority: 100,
    match: { partIds: ["blade", "fire_gem"] },
    result: {
      id: "weapon_fire_blade",
      name: "火焰刀",
      tags: ["weapon", "fire", "blade"],
      color: "#ff5a24",
      icon: "炎刀",
      effects: ["burn", "pierce", "burst"],
      trigger: trigger("fire_blade", 34, 520, "fire-arc", ["burn", "pierce", "burst"], "front")
    }
  },
  {
    id: "railgun",
    priority: 100,
    match: { partIds: ["barrel", "lightning_coil"] },
    result: {
      id: "weapon_railgun",
      name: "电磁炮",
      tags: ["weapon", "lightning", "barrel"],
      color: "#9b5cff",
      icon: "磁炮",
      effects: ["shock", "pierce"],
      trigger: trigger("railgun", 42, 720, "rail", ["shock", "pierce"])
    }
  },
  {
    id: "flying_fish_missile",
    priority: 100,
    match: { partIds: ["rocket", "fish"] },
    result: {
      id: "weapon_flying_fish_missile",
      name: "飞鱼导弹",
      tags: ["weapon", "rocket", "fish", "homing"],
      color: "#36c5f0",
      icon: "飞鱼",
      effects: ["homing", "burst"],
      trigger: trigger("flying_fish", 38, 640, "fish-missile", ["homing", "burst"])
    }
  },
  {
    id: "mental_pollution",
    priority: 100,
    match: { partIds: ["ex_curse", "kpi"] },
    result: {
      id: "weapon_mental_pollution",
      name: "精神污染",
      tags: ["weapon", "glitch", "pressure"],
      color: "#f72585",
      icon: "污染",
      effects: ["glitch", "burst"],
      trigger: trigger("mental_pollution", 44, 760, "glitch", ["glitch", "burst"], "area")
    }
  },
  {
    id: "toxic_frost",
    priority: 100,
    match: { partIds: ["ice_core", "poison_tank"] },
    result: {
      id: "weapon_toxic_frost",
      name: "腐冰",
      tags: ["weapon", "ice", "poison"],
      color: "#6ee275",
      icon: "腐冰",
      effects: ["freeze", "poison"],
      trigger: trigger("toxic_frost", 32, 700, "toxic-frost", ["freeze", "poison"], "area")
    }
  },
  {
    id: "chainsaw_tornado",
    priority: 95,
    match: { partIds: ["chainsaw", "wind_fan"] },
    result: {
      id: "weapon_chainsaw_tornado",
      name: "电锯龙卷",
      tags: ["weapon", "wind", "blade"],
      color: "#39d98a",
      icon: "锯风",
      effects: ["pierce", "knockback"],
      trigger: trigger("chainsaw_tornado", 36, 560, "tornado", ["pierce", "knockback"], "area")
    }
  },
  {
    id: "money_rocket",
    priority: 95,
    match: { partIds: ["rocket", "fortune"] },
    result: {
      id: "weapon_money_rocket",
      name: "暴富火箭",
      tags: ["weapon", "rocket", "money"],
      color: "#30d158",
      icon: "富箭",
      effects: ["homing", "burst", "buff"],
      trigger: trigger("money_rocket", 48, 820, "coin-missile", ["homing", "burst", "buff"])
    }
  },
  {
    id: "curse_saw",
    priority: 95,
    match: { partIds: ["chainsaw", "ex_curse"] },
    result: {
      id: "weapon_curse_saw",
      name: "怨念电锯",
      tags: ["weapon", "curse", "blade"],
      color: "#c77dff",
      icon: "怨锯",
      effects: ["pierce", "glitch"],
      trigger: trigger("curse_saw", 40, 590, "glitch-saw", ["pierce", "glitch"], "front")
    }
  },
  {
    id: "friendship_cannon",
    priority: 95,
    match: { partIds: ["barrel", "friendship"] },
    result: {
      id: "weapon_friendship_cannon",
      name: "友情大炮",
      tags: ["weapon", "friendship", "barrel"],
      color: "#ffd166",
      icon: "友炮",
      effects: ["buff", "burst"],
      trigger: trigger("friendship_cannon", 35, 780, "halo-shell", ["buff", "burst"])
    }
  },
  {
    id: "spring_plunger",
    priority: 95,
    match: { partIds: ["spring", "plunger"] },
    result: {
      id: "weapon_spring_plunger",
      name: "弹簧搋王",
      tags: ["weapon", "bounce", "bonk"],
      color: "#ff6b6b",
      icon: "弹搋",
      effects: ["knockback", "burst"],
      trigger: trigger("spring_plunger", 30, 520, "bonk-wave", ["knockback", "burst"], "front")
    }
  },
  {
    id: "shadow_money",
    priority: 95,
    match: { partIds: ["shadow_orb", "fortune"] },
    result: {
      id: "weapon_shadow_money",
      name: "暗影暴富球",
      tags: ["weapon", "shadow", "money"],
      color: "#5e60ce",
      icon: "影富",
      effects: ["glitch", "burst"],
      trigger: trigger("shadow_money", 46, 880, "shadow-coin", ["glitch", "burst"])
    }
  },
  {
    id: "blessing_ice",
    priority: 95,
    match: { partIds: ["friend_blessing", "ice_core"] },
    result: {
      id: "weapon_blessing_ice",
      name: "祝福冰箱",
      tags: ["weapon", "ice", "blessing"],
      color: "#a8f0ff",
      icon: "福冰",
      effects: ["freeze", "buff"],
      trigger: trigger("blessing_ice", 28, 650, "blessing-frost", ["freeze", "buff"], "area")
    }
  },
  {
    id: "metal_lightning",
    priority: 50,
    match: { tags: ["metal", "lightning"] },
    result: {
      id: "weapon_electromagnetic",
      name: "电磁暴走器",
      tags: ["weapon", "metal", "lightning"],
      color: "#b388ff",
      icon: "电磁",
      effects: ["shock", "pierce"],
      trigger: trigger("electromagnetic", 30, 620, "electric-metal", ["shock", "pierce"])
    }
  },
  {
    id: "fire_physical",
    priority: 40,
    match: { categories: ["physical", "elemental"], tags: ["fire"] },
    result: {
      id: "weapon_burning_machine",
      name: "燃烧机械",
      tags: ["weapon", "physical", "fire"],
      color: "#ff8c42",
      icon: "燃机",
      effects: ["burn", "burst"],
      trigger: trigger("burning_machine", 28, 680, "fire-machine", ["burn", "burst"])
    }
  }
];

export const BALANCE = {
  maxMuseumRecords: 20,
  roundsPerRun: 3,
  rewardsPerRound: 3,
  combatDurationMs: 30_000,
  overdriveDurationMs: 8_000,
  particleLimit: 200,
  damageTextLimit: 80
};

export const createInitialRunState = (): RunState => ({
  round: 1,
  phase: "loot",
  ownedPartIds: [],
  inventory: [],
  equipped: {},
  fusedWeapons: [],
  fusionCount: 0,
  maxCombo: 0,
  maxDps: 0
});
