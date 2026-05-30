import type { PartCategory, PartDef } from "../types";
import { rarityTier, type RewardTier } from "../systems/LootSystem";

export interface LootRevealRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LootRevealPoint {
  x: number;
  y: number;
}

export interface LootRevealTextBox extends LootRevealRect {
  text: string;
  fontSize: number;
  color: string;
  weight: "800" | "900";
  align: "left" | "center" | "right";
  maxLines: number;
}

export interface LootRevealCard {
  index: number;
  partId: string;
  name: string;
  icon: string;
  tier: RewardTier;
  categoryLabel: string;
  rect: LootRevealRect;
  badge: LootRevealRect;
  iconCenter: LootRevealPoint;
  nameBox: LootRevealTextBox;
  tierColor: string;
  accentColor: string;
  glowColor: string;
  revealOffsetY: number;
}

export interface LootRevealLayout {
  canvas: typeof LOOT_REVEAL_CANVAS;
  theme: typeof LOOT_REVEAL_THEME;
  safeArea: LootRevealRect;
  title: LootRevealTextBox;
  subtitle: LootRevealTextBox;
  chest: {
    rect: LootRevealRect;
    lidRect: LootRevealRect;
    coreRect: LootRevealRect;
    glowColor: string;
  };
  burst: {
    center: LootRevealPoint;
    radius: number;
    innerRadius: number;
    rays: Array<{ angle: number; length: number; color: string; width: number }>;
    particles: Array<LootRevealPoint & { radius: number; color: string; alpha: number }>;
  };
  cards: LootRevealCard[];
  actions: {
    primary: LootRevealAction;
    secondary: LootRevealAction;
  };
  hint: LootRevealTextBox;
  rarityLegend: Array<{ tier: RewardTier; text: string; color: string; rect: LootRevealRect }>;
}

export interface LootRevealAction extends LootRevealRect {
  id: "continue" | "rerollPreview";
  label: string;
  color: string;
  textColor: string;
}

export interface BuildLootRevealLayoutInput {
  rewards: Pick<PartDef, "id" | "name" | "category" | "rarity" | "color" | "icon">[];
  phaseProgress?: number;
}

export const LOOT_REVEAL_CANVAS = {
  width: 360,
  height: 640,
  aspectRatio: 360 / 640
} as const;

export const LOOT_REVEAL_THEME = {
  colors: {
    ink: "#050511",
    panel: "rgba(20, 11, 48, 0.94)",
    purple: "#ff2bd6",
    purpleSoft: "rgba(255, 43, 214, 0.28)",
    cyan: "#12f4ff",
    cyanSoft: "rgba(18, 244, 255, 0.24)",
    yellow: "#ffe329",
    yellowSoft: "rgba(255, 227, 41, 0.28)",
    orange: "#ff8a1f",
    white: "#fff7fb",
    muted: "rgba(255, 247, 251, 0.72)",
    buttonText: "#120817"
  },
  radii: {
    panel: 14,
    card: 8,
    button: 8,
    badge: 6
  },
  glow: {
    chest: 30,
    card: 18,
    burst: 42
  }
} as const;

const SAFE_AREA = rect(18, 96, 324, 462);
const CARD_RECTS = [rect(34, 286, 86, 142), rect(137, 270, 86, 158), rect(240, 286, 86, 142)] as const;
const CATEGORY_LABELS: Record<PartCategory, string> = {
  physical: "武装",
  elemental: "元素",
  abstract: "异象",
  catalyst: "催化"
};
const TIER_COLORS: Record<RewardTier, string> = {
  SR: LOOT_REVEAL_THEME.colors.cyan,
  SSR: LOOT_REVEAL_THEME.colors.purple,
  UR: LOOT_REVEAL_THEME.colors.yellow
};

export function buildLootRevealLayout({ rewards, phaseProgress = 1 }: BuildLootRevealLayoutInput): LootRevealLayout {
  const progress = clamp01(phaseProgress);
  const visibleRewards = rewards.slice(0, 3);

  return {
    canvas: LOOT_REVEAL_CANVAS,
    theme: LOOT_REVEAL_THEME,
    safeArea: { ...SAFE_AREA },
    title: textBox("补给箱爆件", 46, 110, 268, 32, 26, LOOT_REVEAL_THEME.colors.white, "900", "center"),
    subtitle: textBox("停轮后三连卡 · SR / SSR / UR", 58, 140, 244, 18, 13, LOOT_REVEAL_THEME.colors.cyan, "900", "center"),
    chest: {
      rect: rect(126, 166, 108, 86),
      lidRect: rect(118, 160, 124, 28),
      coreRect: rect(148, 190, 64, 48),
      glowColor: LOOT_REVEAL_THEME.colors.yellow
    },
    burst: buildBurst(progress),
    cards: visibleRewards.map((part, index) => buildCard(part, index, progress)),
    actions: {
      primary: {
        id: "continue",
        label: "收入零件栏",
        color: LOOT_REVEAL_THEME.colors.yellow,
        textColor: LOOT_REVEAL_THEME.colors.buttonText,
        ...rect(92, 510, 176, 42)
      },
      secondary: {
        id: "rerollPreview",
        label: "查看掉落说明",
        color: LOOT_REVEAL_THEME.colors.purple,
        textColor: LOOT_REVEAL_THEME.colors.white,
        ...rect(104, 558, 152, 30)
      }
    },
    hint: textBox("本轮三连奖励已锁定，稀有度只显示 SR / SSR / UR。", 38, 464, 284, 34, 12, LOOT_REVEAL_THEME.colors.muted, "800", "center", 2),
    rarityLegend: buildLegend()
  };
}

function buildCard(part: BuildLootRevealLayoutInput["rewards"][number], index: number, progress: number): LootRevealCard {
  const tier = rarityTier(part);
  const cardRect = CARD_RECTS[index] ?? CARD_RECTS[CARD_RECTS.length - 1];
  const revealOffsetY = Math.round((1 - progress) * (18 + index * 6));
  const x = cardRect.x;
  const y = cardRect.y + revealOffsetY;

  return {
    index,
    partId: part.id,
    name: part.name,
    icon: part.icon,
    tier,
    categoryLabel: CATEGORY_LABELS[part.category],
    rect: rect(x, y, cardRect.w, cardRect.h),
    badge: rect(x + 11, y + 12, 64, 24),
    iconCenter: { x: x + cardRect.w / 2, y: y + 75 },
    nameBox: textBox(part.name, x + 8, y + cardRect.h - 34, cardRect.w - 16, 24, 10, LOOT_REVEAL_THEME.colors.white, "900", "center", 2),
    tierColor: TIER_COLORS[tier],
    accentColor: part.color || TIER_COLORS[tier],
    glowColor: TIER_COLORS[tier],
    revealOffsetY
  };
}

function buildBurst(progress: number): LootRevealLayout["burst"] {
  const colors = [LOOT_REVEAL_THEME.colors.yellow, LOOT_REVEAL_THEME.colors.purple, LOOT_REVEAL_THEME.colors.cyan];
  const rays = Array.from({ length: 12 }, (_, index) => ({
    angle: (Math.PI * 2 * index) / 12 - Math.PI / 2,
    length: Math.round(42 + progress * 34 + (index % 3) * 7),
    color: colors[index % colors.length],
    width: index % 2 === 0 ? 4 : 2
  }));
  const particles = Array.from({ length: 18 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 18;
    const distance = 46 + (index % 4) * 12 + progress * 18;
    return {
      x: Math.round(180 + Math.cos(angle) * distance),
      y: Math.round(214 + Math.sin(angle) * distance * 0.72),
      radius: 2 + (index % 3),
      color: colors[(index + 1) % colors.length],
      alpha: 0.46 + progress * 0.36
    };
  });

  return {
    center: { x: 180, y: 214 },
    radius: Math.round(58 + progress * 28),
    innerRadius: 26,
    rays,
    particles
  };
}

function buildLegend(): LootRevealLayout["rarityLegend"] {
  return (["SR", "SSR", "UR"] as const).map((tier, index) => ({
    tier,
    text: tier === "SR" ? "稳定火力" : tier === "SSR" ? "稀有词条" : "爆发融合",
    color: TIER_COLORS[tier],
    rect: rect(58 + index * 82, 438, 72, 18)
  }));
}

function rect(x: number, y: number, w: number, h: number): LootRevealRect {
  return { x, y, w, h };
}

function textBox(
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  fontSize: number,
  color: string,
  weight: "800" | "900",
  align: "left" | "center" | "right",
  maxLines = 1
): LootRevealTextBox {
  return { text, x, y, w, h, fontSize, color, weight, align, maxLines };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 1));
}
