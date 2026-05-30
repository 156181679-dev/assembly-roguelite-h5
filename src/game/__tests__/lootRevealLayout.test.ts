import { describe, expect, it } from "vitest";
import { PART_DEFS } from "../data";
import { buildLootRevealLayout, LOOT_REVEAL_CANVAS } from "../render/lootRevealLayout";

describe("loot reveal layout", () => {
  it("returns a 360x640 reveal layout with chest burst, three cards, actions, and hint copy", () => {
    const rewards = [
      PART_DEFS.find((part) => part.rarity === "common")!,
      PART_DEFS.find((part) => part.rarity === "rare")!,
      PART_DEFS.find((part) => part.rarity === "epic")!
    ];

    const layout = buildLootRevealLayout({ rewards, phaseProgress: 1 });

    expect(LOOT_REVEAL_CANVAS).toEqual({ width: 360, height: 640, aspectRatio: 360 / 640 });
    expect(layout.canvas).toEqual(LOOT_REVEAL_CANVAS);
    expect(layout.cards).toHaveLength(3);
    expect(layout.chest.rect).toEqual({ x: 126, y: 166, w: 108, h: 86 });
    expect(layout.burst.center).toEqual({ x: 180, y: 214 });
    expect(layout.actions.primary.id).toBe("continue");
    expect(layout.hint.text).toContain("三连");
  });

  it("uses SR SSR UR presentation tiers instead of raw rarity names", () => {
    const rewards = [
      PART_DEFS.find((part) => part.rarity === "common")!,
      PART_DEFS.find((part) => part.rarity === "rare")!,
      PART_DEFS.find((part) => part.category === "catalyst")!
    ];

    const layout = buildLootRevealLayout({ rewards, phaseProgress: 0.5 });
    const visibleText = [
      layout.title.text,
      layout.subtitle.text,
      layout.hint.text,
      ...layout.cards.flatMap((card) => [card.tier, card.name, card.categoryLabel])
    ].join(" ");

    expect(layout.cards.map((card) => card.tier)).toEqual(["SR", "SSR", "UR"]);
    expect(visibleText).not.toMatch(/common/i);
    expect(visibleText).toMatch(/SR \/ SSR \/ UR/);
  });

  it("keeps the three reward cards inside the safe content area without overlap", () => {
    const rewards = PART_DEFS.slice(0, 3);
    const layout = buildLootRevealLayout({ rewards, phaseProgress: 0 });

    expect(layout.safeArea).toEqual({ x: 18, y: 96, w: 324, h: 462 });

    layout.cards.forEach((card) => {
      expect(card.rect.x).toBeGreaterThanOrEqual(layout.safeArea.x);
      expect(card.rect.y).toBeGreaterThanOrEqual(layout.safeArea.y);
      expect(card.rect.x + card.rect.w).toBeLessThanOrEqual(layout.safeArea.x + layout.safeArea.w);
      expect(card.rect.y + card.rect.h).toBeLessThanOrEqual(layout.safeArea.y + layout.safeArea.h);
    });

    expect(layout.cards[0].rect.x + layout.cards[0].rect.w).toBeLessThan(layout.cards[1].rect.x);
    expect(layout.cards[1].rect.x + layout.cards[1].rect.w).toBeLessThan(layout.cards[2].rect.x);
  });
});
