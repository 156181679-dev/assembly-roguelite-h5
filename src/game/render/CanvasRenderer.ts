import { SLOT_ORDER } from "../data";
import { rarityTier } from "../systems/LootSystem";
import type { EquippedItem, GamePhase, MuseumRecord, PartDef, SlotId } from "../types";

export type ButtonId =
  | "continue"
  | "start"
  | "backHome"
  | "autoEquip"
  | "fuse"
  | "restart"
  | "museum"
  | "result"
  | "share"
  | "shop"
  | "missions"
  | "achievements"
  | "settings"
  | "graveStart"
  | "weaponDetail"
  | "tutorial"
  | "tabAssembly"
  | "tabFusion"
  | "tabCombat"
  | "tabMuseum"
  | "combatAim"
  | "combatBurst"
  | "combatShield";

interface DragRenderState {
  item: EquippedItem;
  x: number;
  y: number;
}

interface FloatingTextRenderState {
  text: string;
  ttl: number;
  color: string;
}

interface ProjectileRenderState {
  angle: number;
  radius: number;
  color: string;
  icon: string;
  sourcePartId: string;
  weaponId?: string;
  fused: boolean;
}

export interface RenderModel {
  phase: GamePhase;
  round: number;
  phaseProgress: number;
  rewards: PartDef[];
  inventory: EquippedItem[];
  equipped: Partial<Record<SlotId, EquippedItem>>;
  fusedWeapons: EquippedItem[];
  drag?: DragRenderState;
  floatingTexts: FloatingTextRenderState[];
  projectiles: ProjectileRenderState[];
  overdrive: boolean;
  combatEnergy: number;
  combatFocus: number;
  combatShield: number;
  targetLock: number;
  maxCombo: number;
  maxDps: number;
  fusionCount: number;
  result?: "victory" | "death";
  museumRecords: MuseumRecord[];
  shareImageDataUrl: string;
  tutorial: boolean;
}

interface Rect {
  id: ButtonId;
  x: number;
  y: number;
  w: number;
  h: number;
}

const WIDTH = 360;
const HEIGHT = 640;

const PALETTE = {
  ink: "#070816",
  panel: "rgba(16, 8, 38, 0.88)",
  purple: "#ff2bd6",
  cyan: "#12f4ff",
  yellow: "#ffe329",
  orange: "#ff7a18",
  red: "#ff3159",
  white: "#fff7fb"
};

const PART_SPRITE_ORDER = [
  "blade",
  "barrel",
  "spring",
  "rocket",
  "fish",
  "plunger",
  "gear",
  "chainsaw",
  "fire_gem",
  "ice_core",
  "lightning_coil",
  "poison_tank",
  "wind_fan",
  "shadow_orb",
  "friend_blessing",
  "ex_curse",
  "kpi",
  "procrastination",
  "friendship",
  "fortune"
];

const FUSION_SPRITE_ORDER = [
  "weapon_fire_blade",
  "weapon_railgun",
  "weapon_flying_fish_missile",
  "weapon_mental_pollution",
  "weapon_toxic_frost",
  "weapon_chainsaw_tornado",
  "weapon_money_rocket",
  "weapon_curse_saw",
  "weapon_friendship_cannon",
  "weapon_spring_plunger",
  "weapon_shadow_money",
  "weapon_blessing_ice"
];

const SLOT_POSITIONS: Record<SlotId, { x: number; y: number; label: string }> = {
  head: { x: 180, y: 176, label: "头" },
  body: { x: 180, y: 264, label: "身" },
  left_hand: { x: 86, y: 274, label: "左" },
  right_hand: { x: 274, y: 274, label: "右" },
  back: { x: 224, y: 352, label: "背" },
  feet: { x: 180, y: 438, label: "脚" }
};

const button = (id: ButtonId, x: number, y: number, w: number, h: number): Rect => ({ id, x, y, w, h });

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly assets: Record<"hero" | "parts" | "weapons" | "boss", HTMLImageElement>;
  private buttons: Rect[] = [];

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context is unavailable");
    }
    this.canvas = canvas;
    this.ctx = ctx;
    this.assets = {
      hero: this.loadImage("/assets/generated/mecha-fish-base.png"),
      parts: this.loadImage("/assets/generated/base-parts-sheet.png"),
      weapons: this.loadImage("/assets/generated/fusion-weapons-12-sheet.png"),
      boss: this.loadImage("/assets/generated/boss-asteroid-demon.png")
    };
  }

  render(model: RenderModel): void {
    this.resize();
    this.buttons = [];

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.canvas.width / WIDTH, this.canvas.height / HEIGHT);
    if (model.phase === "launch") this.drawLaunch(model);
    else if (model.phase === "home") this.drawHome(model);
    else {
      this.drawBackground(model);
      this.drawTopBrand(model);

      if (model.phase === "loot") this.drawLoot(model);
      if (model.phase === "lootResult") this.drawLootResult(model);
      if (model.phase === "assembly" || model.phase === "fusion") this.drawAssembly(model);
      if (model.phase === "fusionSuccess") this.drawFusionSuccess(model);
      if (model.phase === "combat") this.drawCombat(model);
      if (model.phase === "result") this.drawResult(model);
      if (model.phase === "museum") this.drawMuseum(model);
      if (model.phase === "shop") this.drawShop(model);
      if (model.phase === "missions") this.drawMissions(model);
      if (model.phase === "achievements") this.drawAchievements(model);
      if (model.phase === "settings") this.drawSettings(model);
      if (model.phase === "weaponDetail") this.drawWeaponDetail(model);
      if (model.phase === "graveStart") this.drawGraveStart(model);
      if (model.phase === "graveyard") this.drawGraveyard(model);
      if (model.phase === "share") this.drawShare(model);
      if (model.phase === "tutorial") this.drawTutorial(model);

      this.drawBottomTabs(model.phase);
    }
    this.drawFloatingTexts(model);
    if (model.drag) this.drawItem(model.drag.item, model.drag.x, model.drag.y, 32, true);
    ctx.restore();
  }

  private equippedItems(model: RenderModel): EquippedItem[] {
    return Object.values(model.equipped).filter(Boolean) as EquippedItem[];
  }

  private drawLaunch(model: RenderModel): void {
    this.drawBackground(model);
    this.ctx.save();
    this.ctx.globalAlpha = 0.78;
    this.drawHalftone(48, 126, 4, 10, PALETTE.purple, 0.34);
    this.drawHalftone(248, 92, 4, 9, PALETTE.cyan, 0.26);
    this.drawLightning(28, 108, 104, 222, PALETTE.cyan, 0.52);
    this.drawLightning(330, 104, 250, 246, PALETTE.purple, 0.58);
    this.ctx.restore();
    if (this.isImageReady(this.assets.hero)) {
      this.ctx.save();
      this.ctx.shadowBlur = 34;
      this.ctx.shadowColor = PALETTE.cyan;
      this.ctx.drawImage(this.assets.hero, 75, 178, 230, 330);
      this.ctx.restore();
    }
    this.drawTitleLogo(180, 82, 42);
    this.drawCenteredText("融合肉鸽", 180, 130, 27, PALETTE.purple, "900");
    this.drawButton("start", 82, 528, 196, 48, "开始游戏");
  }

  private drawHome(model: RenderModel): void {
    this.drawBackground(model);
    this.drawTopCurrency();
    this.drawTitleLogo(182, 72, 31);
    this.drawSideMenu();
    this.drawNeonPanel(86, 110, 222, 318, PALETTE.purple, 12);
    if (this.isImageReady(this.assets.hero)) {
      this.ctx.save();
      this.ctx.shadowBlur = 26;
      this.ctx.shadowColor = PALETTE.cyan;
      this.ctx.drawImage(this.assets.hero, 108, 126, 165, 250);
      this.ctx.restore();
    }
    this.drawButton("start", 88, 390, 184, 46, "开始冒险");
    this.drawButton("graveStart", 104, 450, 152, 36, "挖坟开局");
    this.drawHomeNavButton("shop", 28, 548, "商店");
    this.drawHomeNavButton("missions", 110, 548, "任务");
    this.drawHomeNavButton("achievements", 192, 548, "排行");
    this.drawHomeNavButton("weaponDetail", 274, 548, "仓库");
  }

  private drawLootResult(model: RenderModel): void {
    this.drawNeonPanel(16, 100, 328, 452, PALETTE.purple, 14);
    this.drawCenteredText("恭喜获得", 180, 150, 30, PALETTE.yellow, "900");
    model.rewards.slice(0, 4).forEach((part, index) => {
      const x = 62 + index * 78;
      this.drawNeonPanel(x - 30, 228, 60, 88, this.rarityColor(part), 6);
      this.drawCenteredText(this.rarityLabel(part), x, 246, 12, PALETTE.yellow, "900");
      this.drawPartIcon(part, x, 262, 20);
      this.drawCenteredText(part.name, x, 304, 10, PALETTE.white, "800");
    });
    this.drawButton("continue", 86, 512, 188, 42, "继续拼装");
  }

  private drawFusionSuccess(model: RenderModel): void {
    const fused = model.fusedWeapons[model.fusedWeapons.length - 1];
    this.drawNeonPanel(16, 100, 328, 452, PALETTE.purple, 14);
    this.drawCenteredText("融合成功！", 180, 160, 30, PALETTE.yellow, "900");
    if (fused) {
      this.drawCenteredText(fused.name, 180, 220, 28, PALETTE.yellow, "900");
      this.drawFusionWeapon(fused, 180, 324, 58);
      this.drawCenteredText("SSR", 180, 438, 22, PALETTE.yellow, "900");
    }
    this.drawButton("continue", 86, 520, 188, 42, "自动装配中");
  }

  private drawShop(_model: RenderModel): void {
    this.drawGridPage("商店界面", "全部", ["金币礼包", "能量礼包", "零件礼包", "稀有刀", "火焰石", "甲片包"]);
  }

  private drawMissions(_model: RenderModel): void {
    this.drawListPage("任务界面", ["进行 1 次融合", "击败 3 个 BOSS", "单局造成 1 亿伤害", "累计登录 3 天"]);
  }

  private drawAchievements(_model: RenderModel): void {
    this.drawListPage("成就界面", ["融合大师", "连击达人", "秒杀之王", "博物馆收藏家"]);
  }

  private drawSettings(_model: RenderModel): void {
    this.drawListPage("设置界面", ["音效  开", "音乐  开", "震动  开", "画面质量  高", "语言  简体中文"]);
  }

  private drawWeaponDetail(model: RenderModel): void {
    const best = model.fusedWeapons[model.fusedWeapons.length - 1] ?? this.equippedItems(model)[0];
    this.drawNeonPanel(16, 100, 328, 452, PALETTE.purple, 14);
    this.drawText(best?.name ?? "火焰刀", 38, 152, 24, PALETTE.yellow, "900");
    this.drawCenteredText("SSR", 286, 154, 18, PALETTE.yellow, "900");
    if (best?.fused) this.drawFusionWeapon(best, 180, 270, 58);
    else this.drawWeaponShape("刀", 180, 270, 54, PALETTE.orange);
    this.drawText("秒伤", 52, 400, 16, PALETTE.white, "800");
    this.drawText("9.99E+08", 236, 400, 16, PALETTE.yellow, "900", "right");
    this.drawText("最高连击", 52, 430, 16, PALETTE.white, "800");
    this.drawText("56", 236, 430, 16, PALETTE.yellow, "900", "right");
    this.drawButton("share", 62, 500, 108, 34, "分享");
    this.drawButton("restart", 194, 500, 108, 34, "再来一局");
  }

  private drawGraveStart(_model: RenderModel): void {
    this.drawListPage("挖坟开局", ["选择一件遗物带入本局", "火焰刀", "电磁炮", "鱼头导弹"]);
    this.drawButton("start", 82, 520, 196, 42, "开始冒险");
  }

  private drawGraveyard(_model: RenderModel): void {
    this.drawListPage("坟场（死亡）", ["你被击败了...", "火箭推进器已埋入坟场"]);
    this.drawButton("museum", 44, 520, 124, 38, "回博物馆");
    this.drawButton("restart", 194, 520, 124, 38, "再来一局");
  }

  private drawShare(model: RenderModel): void {
    const best = model.fusedWeapons[model.fusedWeapons.length - 1] ?? this.equippedItems(model)[0];
    this.drawNeonPanel(18, 92, 324, 500, PALETTE.purple, 12);
    this.drawTitleLogo(180, 138, 30);
    if (this.isImageReady(this.assets.hero)) this.ctx.drawImage(this.assets.hero, 98, 164, 180, 238);
    if (best?.fused) this.drawFusionWeapon(best, 248, 380, 34);
    this.drawText("秒伤", 70, 430, 18, PALETTE.white, "900");
    this.drawText("9.99E+08", 286, 430, 20, PALETTE.cyan, "900", "right");
    this.drawText("我的怪物，我来造！", 70, 524, 20, PALETTE.purple, "900");
    this.drawButton("result", 42, 552, 126, 36, "回结算");
    this.drawButton("restart", 194, 552, 126, 36, "再来一局");
  }

  private drawTutorial(_model: RenderModel): void {
    this.drawNeonPanel(22, 138, 316, 300, PALETTE.purple, 12);
    this.drawCenteredText("补给开箱", 180, 205, 24, PALETTE.yellow, "900");
    this.drawCenteredText("点击补给机抽取本轮零件", 180, 250, 14, PALETTE.white, "800");
    this.drawButton("continue", 96, 360, 168, 38, "知道了");
  }

  private drawTitleLogo(x: number, y: number, size: number): void {
    this.drawCenteredText("拼装狂潮", x - 12, y, size, PALETTE.yellow, "900");
    this.drawCenteredText("融合肉鸽", x + 22, y + size * 0.72, Math.floor(size * 0.58), PALETTE.white, "900");
  }

  private drawTopCurrency(): void {
    this.drawNeonPanel(18, 18, 96, 28, PALETTE.yellow, 6);
    this.drawText("◎ 123456", 30, 38, 12, PALETTE.white, "800");
    this.drawNeonPanel(124, 18, 92, 28, PALETTE.cyan, 6);
    this.drawText("⚡ 50/50", 136, 38, 12, PALETTE.cyan, "800");
    this.drawNeonPanel(318, 18, 28, 28, PALETTE.purple, 6);
    this.drawCenteredText("⚙", 332, 38, 16, PALETTE.white, "900");
    this.buttons.push(button("settings", 318, 18, 28, 28));
  }

  private drawSideMenu(): void {
    [
      ["museum", "博物馆"],
      ["achievements", "成就"],
      ["settings", "设置"]
    ].forEach(([id, label], index) => {
      const y = 142 + index * 62;
      this.buttons.push(button(id as ButtonId, 20, y, 58, 48));
      this.drawNeonPanel(20, y, 58, 48, PALETTE.purple, 6);
      this.drawCenteredText(label, 49, y + 30, 12, PALETTE.white, "900");
    });
  }

  private drawHomeNavButton(id: ButtonId, x: number, y: number, label: string): void {
    this.buttons.push(button(id, x, y, 58, 46));
    this.drawNeonPanel(x, y, 58, 46, PALETTE.purple, 6);
    this.drawCenteredText(label.slice(0, 1), x + 29, y + 20, 16, PALETTE.white, "900");
    this.drawCenteredText(label, x + 29, y + 37, 10, "rgba(255,255,255,0.82)", "800");
  }

  private drawGridPage(title: string, tab: string, items: string[]): void {
    this.drawNeonPanel(16, 96, 328, 472, PALETTE.purple, 12);
    this.drawText(title, 34, 136, 22, PALETTE.white, "900");
    this.drawNeonPanel(34, 154, 64, 26, PALETTE.yellow, 5);
    this.drawCenteredText(tab, 66, 173, 12, "#130914", "900");
    items.forEach((item, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 38 + col * 99;
      const y = 202 + row * 128;
      this.drawNeonPanel(x, y, 82, 102, index % 2 ? PALETTE.cyan : PALETTE.purple, 6);
      this.drawPartSprite(PART_SPRITE_ORDER[index % PART_SPRITE_ORDER.length], x + 41, y + 40, 18);
      this.drawCenteredText(item, x + 41, y + 78, 10, PALETTE.white, "800");
      this.drawCenteredText("★ 300", x + 41, y + 96, 11, PALETTE.yellow, "900");
    });
  }

  private drawListPage(title: string, rows: string[]): void {
    this.drawNeonPanel(16, 96, 328, 472, PALETTE.purple, 12);
    this.drawText(title, 34, 138, 22, PALETTE.white, "900");
    rows.forEach((row, index) => {
      const y = 174 + index * 62;
      this.drawNeonPanel(34, y, 292, 46, index % 2 ? PALETTE.cyan : PALETTE.purple, 6);
      this.drawText(row, 52, y + 29, 14, PALETTE.white, "800");
    });
    this.buttons.push(button("backHome", 20, 20, 70, 54));
  }

  hitTestButton(x: number, y: number): ButtonId | undefined {
    return this.buttons.find((rect) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h)?.id;
  }

  hitTestInventory(x: number, y: number, inventory: EquippedItem[]): EquippedItem | undefined {
    return inventory.find((item, index) => {
      const pos = this.inventoryPosition(index);
      return this.distance(x, y, pos.x, pos.y) <= 29;
    });
  }

  hitTestSlot(
    x: number,
    y: number,
    equipped: Partial<Record<SlotId, EquippedItem>>
  ): { slotId: SlotId; item: EquippedItem } | undefined {
    for (const slotId of SLOT_ORDER) {
      const pos = SLOT_POSITIONS[slotId];
      const item = equipped[slotId];
      if (item && this.distance(x, y, pos.x, pos.y) <= 40) {
        return { slotId, item };
      }
    }
    return undefined;
  }

  nearestSlot(x: number, y: number): SlotId | undefined {
    let best: { slotId: SlotId; distance: number } | undefined;
    for (const slotId of SLOT_ORDER) {
      const pos = SLOT_POSITIONS[slotId];
      const distance = this.distance(x, y, pos.x, pos.y);
      if (!best || distance < best.distance) {
        best = { slotId, distance };
      }
    }
    return best && best.distance <= 58 ? best.slotId : undefined;
  }

  createShareCard(model: RenderModel): string {
    const card = document.createElement("canvas");
    card.width = 1080;
    card.height = 1920;
    const ctx = card.getContext("2d");
    if (!ctx) return "";

    const equipped = this.equippedItems(model);
    const best = equipped.find((item) => item.fused) ?? equipped[0];

    const bg = ctx.createLinearGradient(0, 0, 0, card.height);
    bg.addColorStop(0, "#070816");
    bg.addColorStop(0.44, "#1b0833");
    bg.addColorStop(0.72, best?.color ?? "#ff2bd6");
    bg.addColorStop(1, "#04050c");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, card.width, card.height);

    this.drawCardHalftone(ctx, 850, 260, 260, "#ff2bd6");
    this.drawCardLightning(ctx, 100, 230, 940, 1040);
    this.drawCardPanel(ctx, 76, 96, 928, 1720);
    ctx.textAlign = "center";
    ctx.fillStyle = PALETTE.yellow;
    ctx.font = "900 132px Microsoft YaHei, sans-serif";
    ctx.fillText("拼装狂潮", 540, 214);
    ctx.fillStyle = PALETTE.white;
    ctx.font = "900 64px Microsoft YaHei, sans-serif";
    ctx.fillText("60 秒拼出神兵", 540, 304);

    this.drawCardMonster(ctx, best, 540, 760, 360);

    ctx.fillStyle = PALETTE.yellow;
    ctx.font = "900 96px Microsoft YaHei, sans-serif";
    ctx.fillText(best?.name ?? "未命名拼装物", 540, 1224);
    ctx.fillStyle = PALETTE.white;
    ctx.font = "800 60px Microsoft YaHei, sans-serif";
    ctx.fillText(`秒伤 ${model.maxDps.toLocaleString()}  /  COMBO x${model.maxCombo}`, 540, 1340);
    ctx.fillStyle = PALETTE.cyan;
    ctx.font = "800 44px Microsoft YaHei, sans-serif";
    ctx.fillText(`融合 ${model.fusionCount} 次 · ${model.result === "victory" ? "赢得炸裂" : "怪物博物馆收藏"}`, 540, 1422);
    ctx.fillStyle = PALETTE.yellow;
    ctx.font = "900 76px Microsoft YaHei, sans-serif";
    ctx.fillText("拼得离谱，赢得炸裂！", 540, 1640);

    return card.toDataURL("image/png");
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.floor(rect.width * dpr));
    const nextHeight = Math.max(1, Math.floor(rect.height * dpr));
    if (this.canvas.width !== nextWidth || this.canvas.height !== nextHeight) {
      this.canvas.width = nextWidth;
      this.canvas.height = nextHeight;
    }
  }

  private drawBackground(model: RenderModel): void {
    const ctx = this.ctx;
    const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    bg.addColorStop(0, "#050511");
    bg.addColorStop(0.38, model.overdrive ? "#390716" : "#17072b");
    bg.addColorStop(1, "#07101e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    ctx.globalAlpha = model.phase === "combat" ? 0.24 : 0.18;
    ctx.strokeStyle = model.overdrive ? "rgba(255,227,41,0.5)" : "rgba(18,244,255,0.45)";
    ctx.lineWidth = 1;
    for (let x = -40; x < WIDTH + 60; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 80);
      ctx.lineTo(x + 110, HEIGHT);
      ctx.stroke();
    }
    for (let y = 122; y < HEIGHT; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y + 22);
      ctx.stroke();
    }
    ctx.restore();
    this.drawHalftone(296, 72, 4, 9, PALETTE.purple, 0.36);
    this.drawHalftone(36, 464, 3, 8, PALETTE.cyan, 0.2);
    for (let i = 0; i < 12; i += 1) {
      const y = 80 + i * 42;
      this.drawSlash(-18 + (i % 3) * 18, y, 80, i % 2 ? PALETTE.purple : PALETTE.cyan, 0.18);
    }
    this.drawLightning(12, 92, 88, 186, PALETTE.cyan, 0.42);
    this.drawLightning(300, 58, 246, 186, PALETTE.purple, 0.54);
    ctx.strokeStyle = model.overdrive ? PALETTE.yellow : "rgba(255,43,214,0.74)";
    ctx.lineWidth = model.overdrive ? 5 : 3;
    ctx.strokeRect(7, 7, WIDTH - 14, HEIGHT - 14);
  }

  private drawTopBrand(model: RenderModel): void {
    this.drawText("拼装狂潮", 18, 42, 31, PALETTE.yellow, "900");
    this.drawText("融合肉鸽", 182, 42, 24, PALETTE.white, "900");
    this.drawText(`第 ${model.round}/3 轮 · ${this.phaseName(model.phase)}`, 20, 67, 13, PALETTE.cyan, "800");
    this.drawNeonPanel(228, 24, 108, 42, PALETTE.purple, 8);
    this.drawCenteredText("60秒", 282, 51, 23, PALETTE.yellow, "900");
    this.ctx.fillStyle = "rgba(255,255,255,0.18)";
    this.ctx.fillRect(20, 78, 318, 7);
    this.ctx.fillStyle = model.overdrive ? PALETTE.yellow : PALETTE.cyan;
    this.ctx.fillRect(20, 78, 318 * model.phaseProgress, 7);
  }

  private drawLoot(model: RenderModel): void {
    this.drawNeonPanel(18, 101, 324, 452, PALETTE.purple, 14);
    this.drawCenteredText("1. 补给开箱", 180, 133, 23, PALETTE.white, "900");
    this.drawLootMachine(model);
    this.drawButton("continue", 101, 492, 158, 42, "开启补给箱");
    this.drawPrimaryHint("本轮抽取 3 件零件，稀有度会影响战斗火力", 474);
  }

  private drawLootMachine(model: RenderModel): void {
    const ctx = this.ctx;
    this.drawNeonPanel(42, 158, 276, 92, PALETTE.cyan, 12);
    this.drawCenteredText("本轮掉落预览", 180, 187, 17, PALETTE.cyan, "900");
    this.drawCenteredText("SR / SSR / UR", 180, 218, 26, PALETTE.yellow, "900");
    ctx.save();
    ctx.globalAlpha = 0.42;
    for (let i = 0; i < 10; i += 1) {
      this.drawSlash(48 + i * 28, 236, 30, i % 2 ? PALETTE.purple : PALETTE.cyan, 0.45);
    }
    ctx.restore();

    model.rewards.slice(0, 3).forEach((part, index) => {
      this.drawLootCard(part, 48 + index * 104, 270, 88, 126, index, model.phaseProgress);
    });

    this.drawNeonPanel(58, 414, 244, 36, PALETTE.purple, 8);
    const labels = ["SR 基础火力", "SSR 稀有词条", "UR 催化融合"];
    labels.forEach((label, index) => {
      this.drawText(label, 74 + index * 82, 438, 10, index === 0 ? PALETTE.cyan : index === 1 ? PALETTE.yellow : PALETTE.purple, "900");
    });
  }

  private drawLootCard(part: PartDef, x: number, y: number, w: number, h: number, index: number, progress: number): void {
    const color = this.rarityColor(part);
    const pulse = Math.sin(progress * Math.PI * 8 + index) * 2;
    this.drawNeonPanel(x, y + pulse, w, h, color, 8);
    this.drawCenteredText(this.rarityLabel(part), x + w / 2, y + 24 + pulse, 15, PALETTE.yellow, "900");
    this.drawPartIcon(part, x + w / 2, y + 66 + pulse, 25);
    this.drawCenteredText(part.name, x + w / 2, y + 106 + pulse, 10, PALETTE.white, "900");
  }

  private drawAssembly(model: RenderModel): void {
    const title = model.phase === "assembly" ? "2. 拖拽拼装" : "3. 任意融合";
    this.drawNeonPanel(16, 100, 328, 445, model.phase === "fusion" ? PALETTE.cyan : PALETTE.purple, 14);
    this.drawCenteredText(title, 180, 132, 23, PALETTE.white, "900");
    this.drawMechaSkeleton(model);
    this.drawSlotRings(model);
    this.drawInventory(model.inventory);
    if (model.phase === "fusion") {
      this.drawFusionFormula(model);
      this.drawButton("fuse", 30, 560, 126, 36, "一键融合");
      this.drawButton("continue", 204, 560, 132, 36, "开战/下一轮");
    } else {
      this.drawButton("autoEquip", 30, 560, 126, 36, "一键装配");
      this.drawButton("continue", 204, 560, 132, 36, "去融合");
    }
    this.drawPrimaryHint(model.phase === "assembly" ? "把零件拖到发光插槽" : "拖已装零件互撞，或直接点一键融合", 515);
  }

  private drawCombat(model: RenderModel): void {
    const pressure = Math.min(0.28, model.maxDps / 180_000) + Math.min(0.18, model.maxCombo * 0.006);
    const bossHpRatio = Math.max(0.03, 1 - model.phaseProgress * (model.overdrive ? 0.86 : 0.68) - pressure);
    const remainingSeconds = Math.max(0, Math.ceil(60 * (1 - model.phaseProgress)));
    this.drawNeonPanel(14, 96, 332, 460, model.overdrive ? PALETTE.yellow : PALETTE.purple, 12);
    this.drawCombatArena(model);
    this.drawCombatHud(model, bossHpRatio, remainingSeconds);
    this.drawCombatEnemies(model, bossHpRatio);
    this.drawCombatHero(model);
    this.drawCombatWeaponMounts(model);
    this.drawCombatAttacks(model);
    this.drawCombatDamage(model);
    this.drawCombatControls(model);
  }

  private drawCombatArena(model: RenderModel): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(24, 148, 312, 356, 12);
    ctx.clip();

    const arena = ctx.createLinearGradient(24, 148, 336, 504);
    arena.addColorStop(0, model.overdrive ? "#370818" : "#110b25");
    arena.addColorStop(0.54, "#071629");
    arena.addColorStop(1, "#05060d");
    ctx.fillStyle = arena;
    ctx.fillRect(24, 148, 312, 356);

    ctx.globalAlpha = 0.36;
    ctx.strokeStyle = model.overdrive ? PALETTE.yellow : PALETTE.cyan;
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i += 1) {
      const y = 198 + i * 34 + (model.phaseProgress * 42) % 34;
      ctx.beginPath();
      ctx.moveTo(26, y);
      ctx.lineTo(334, y - 22);
      ctx.stroke();
    }
    for (let i = 0; i < 7; i += 1) {
      const x = 36 + i * 48;
      ctx.beginPath();
      ctx.moveTo(x, 154);
      ctx.lineTo(x - 66, 504);
      ctx.stroke();
    }
    ctx.restore();

    this.drawHalftone(254, 174, 3, 8, PALETTE.red, model.overdrive ? 0.5 : 0.3);
    this.drawLightning(36, 182, 136, 246, PALETTE.cyan, 0.42);
    this.drawLightning(328, 206, 260, 338, model.overdrive ? PALETTE.yellow : PALETTE.purple, 0.48);
  }

  private drawCombatHud(model: RenderModel, bossHpRatio: number, remainingSeconds: number): void {
    this.drawCenteredText(model.overdrive ? "超载时刻！" : "4. 自动战斗", 180, 128, model.overdrive ? 28 : 23, model.overdrive ? PALETTE.yellow : PALETTE.white, "900");
    this.drawNeonPanel(30, 142, 300, 42, model.overdrive ? PALETTE.yellow : PALETTE.cyan, 7);
    this.drawText(`第 ${model.round} 波`, 44, 166, 13, PALETTE.white, "900");
    this.drawCenteredText(`${remainingSeconds}s`, 176, 166, 16, PALETTE.yellow, "900");
    this.drawText(`DPS ${this.formatMetric(Math.max(model.maxDps, 973))}`, 316, 166, 13, PALETTE.cyan, "900", "right");
    this.drawBar(44, 176, 272, 6, bossHpRatio, PALETTE.red, "rgba(255,255,255,0.18)");
    this.drawBar(44, 187, 130, 5, model.combatEnergy / 100, PALETTE.yellow, "rgba(255,255,255,0.16)");
    this.drawText(`能量 ${Math.floor(model.combatEnergy)}`, 180, 193, 10, PALETTE.yellow, "900");
    this.drawCenteredText("点敌人锁定弱点，蓄能后释放技能", 198, 205, 10, "rgba(255,255,255,0.78)", "800");
  }

  private drawCombatEnemies(model: RenderModel, bossHpRatio: number): void {
    this.drawMinion(288, 358, model.phaseProgress, PALETTE.purple);
    this.drawMinion(226, 418, model.phaseProgress + 0.28, PALETTE.red);
    this.drawMinion(306, 442, model.phaseProgress + 0.53, PALETTE.orange);
    this.drawBoss(260, 276, model.overdrive);
    if (model.targetLock > 0) this.drawTargetReticle(260, 276, model.targetLock);
    this.drawCenteredText(`裂隙首领 ${Math.ceil(bossHpRatio * 100)}%`, 260, 200, 13, PALETTE.white, "900");
  }

  private drawCombatHero(model: RenderModel): void {
    const ctx = this.ctx;
    const x = 42;
    const y = 290 + Math.sin(model.phaseProgress * Math.PI * 10) * 2;
    ctx.save();
    ctx.shadowBlur = model.overdrive ? 28 : 18;
    ctx.shadowColor = model.overdrive ? PALETTE.yellow : PALETTE.cyan;
    ctx.fillStyle = "rgba(18,244,255,0.18)";
    ctx.beginPath();
    ctx.ellipse(112, 494, 62, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    if (model.combatShield > 0) {
      ctx.strokeStyle = `rgba(185,255,207,${0.28 + model.combatShield * 0.5})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(112, 394, 78, 124, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.isImageReady(this.assets.hero)) {
      ctx.drawImage(this.assets.hero, x, y, 142, 214);
    } else {
      this.drawMechaPortrait(this.equippedItems(model)[0], 112, 398, 0.72);
    }
    ctx.restore();
  }

  private drawCombatWeaponMounts(model: RenderModel): void {
    const ctx = this.ctx;
    const positions = this.combatSlotPositions();
    for (const slotId of SLOT_ORDER) {
      const item = model.equipped[slotId];
      if (!item) continue;
      const pos = positions[slotId];
      ctx.save();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.fused ? 3 : 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = item.color;
      ctx.beginPath();
      ctx.moveTo(112, 394);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.restore();
      this.drawCombatWeaponPod(item, pos.x, pos.y, item.fused ? 1.15 : 1);
    }
  }

  private drawCombatWeaponPod(item: EquippedItem, x: number, y: number, scale: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(item.fused ? -0.28 : 0);
    ctx.shadowBlur = item.fused ? 18 : 10;
    ctx.shadowColor = item.color;
    ctx.fillStyle = "rgba(9,10,24,0.92)";
    ctx.strokeStyle = item.color;
    ctx.lineWidth = item.fused ? 3 : 2;
    ctx.beginPath();
    ctx.roundRect(-16 * scale, -11 * scale, 32 * scale, 22 * scale, 8 * scale);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = item.color;
    ctx.fillRect(5 * scale, -4 * scale, 18 * scale, 8 * scale);
    ctx.strokeStyle = PALETTE.white;
    ctx.lineWidth = 1;
    ctx.strokeRect(5 * scale, -4 * scale, 18 * scale, 8 * scale);
    ctx.restore();
    this.drawCenteredText(item.fused ? "SSR" : item.icon.slice(0, 1), x, y + 24 * scale, item.fused ? 9 : 10, item.fused ? PALETTE.yellow : PALETTE.white, "900");
  }

  private drawCombatAttacks(model: RenderModel): void {
    const positions = Object.values(this.combatSlotPositions());
    const projectiles = model.projectiles.length > 0 ? model.projectiles : this.equippedItems(model).map((item) => ({
      angle: 0,
      radius: 0,
      color: item.color,
      icon: item.icon,
      sourcePartId: item.sourcePartIds[0],
      weaponId: item.weaponId,
      fused: item.fused
    }));

    projectiles.slice(0, 8).forEach((projectile, index) => {
      const start = positions[index % positions.length];
      const target = {
        x: 260 + Math.cos(index * 1.7) * 44,
        y: 276 + Math.sin(index * 1.3) * 54
      };
      const speed = (projectile.fused ? 5.8 : 4.2) * (1 + model.combatFocus * 0.65);
      const t = (model.phaseProgress * speed + index * 0.17) % 1;
      const control = {
        x: (start.x + target.x) / 2 + Math.sin(index * 2.1) * 34,
        y: Math.min(start.y, target.y) - 72 - (index % 3) * 8
      };
      const prev = this.quadraticPoint(start, control, target, Math.max(0, t - 0.08));
      const point = this.quadraticPoint(start, control, target, t);
      this.drawLaser(prev.x, prev.y, point.x, point.y, projectile.color, model.overdrive || projectile.fused || model.combatFocus > 0 ? 5 : 3);
      this.drawCombatProjectile(projectile, point.x, point.y, model.overdrive || projectile.fused, index);
      if (t > 0.82) {
        this.drawExplosion(target.x, target.y, projectile.color, 1 - (t - 0.82) / 0.18);
      }
    });
  }

  private drawCombatProjectile(projectile: ProjectileRenderState, x: number, y: number, intense: boolean, index: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(projectile.angle + index * 0.4);
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = intense ? 18 : 10;
    ctx.shadowColor = projectile.color;
    ctx.fillStyle = projectile.fused ? PALETTE.yellow : projectile.color;
    ctx.strokeStyle = PALETTE.white;
    ctx.lineWidth = 1.5;
    if (projectile.fused) {
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-8, -9);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-8, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = projectile.color;
      ctx.fillRect(-20, -3, 16, 6);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(-16, -1, 14, 2);
    }
    ctx.restore();
  }

  private drawCombatDamage(model: RenderModel): void {
    const baseDamage = Math.max(128, Math.floor(model.maxDps * 0.72 + model.fusionCount * 420 + model.maxCombo * 96));
    for (let index = 0; index < 6; index += 1) {
      const t = (model.phaseProgress * 7.2 + index * 0.18) % 1;
      const critical = model.overdrive || index % 3 === 0;
      const damage = baseDamage * (critical ? 12 + index : 1 + index * 0.4);
      const x = 228 + ((index * 37) % 88);
      const y = 338 - t * 120 + Math.sin(index) * 10;
      this.drawDamageNumber(`-${this.formatMetric(damage)}`, x, y, critical ? 20 : 15, critical ? PALETTE.yellow : PALETTE.purple);
    }
    this.drawNeonPanel(58, 510, 244, 34, model.overdrive ? PALETTE.yellow : PALETTE.cyan, 7);
    this.drawCenteredText(`COMBO x${Math.max(model.maxCombo, model.overdrive ? 56 : 1)}  秒伤 ${this.formatMetric(Math.max(model.maxDps, 973))}`, 180, 533, 15, model.overdrive ? PALETTE.yellow : PALETTE.cyan, "900");
    if (model.combatFocus > 0) this.drawCenteredText("集火中", 248, 228, 14, PALETTE.yellow, "900");
    if (model.combatShield > 0) this.drawCenteredText("护盾稳态", 108, 254, 12, "#b9ffcf", "900");
  }

  private drawCombatControls(model: RenderModel): void {
    this.drawCombatSkillButton("combatAim", 38, 462, 82, 34, "锁定", "点射", PALETTE.cyan, true);
    this.drawCombatSkillButton("combatBurst", 139, 462, 82, 34, "集火", "42能量", PALETTE.yellow, model.combatEnergy >= 42);
    this.drawCombatSkillButton("combatShield", 240, 462, 82, 34, "护盾", "28能量", "#b9ffcf", model.combatEnergy >= 28);
  }

  private drawCombatSkillButton(
    id: ButtonId,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    subLabel: string,
    color: string,
    enabled: boolean
  ): void {
    this.buttons.push(button(id, x, y, w, h));
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = enabled ? 1 : 0.42;
    ctx.shadowBlur = enabled ? 14 : 0;
    ctx.shadowColor = color;
    ctx.fillStyle = enabled ? "rgba(10,13,29,0.92)" : "rgba(40,40,48,0.72)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 7);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    this.drawCenteredText(label, x + w / 2, y + 15, 13, enabled ? color : "rgba(255,255,255,0.62)", "900");
    this.drawCenteredText(subLabel, x + w / 2, y + 29, 9, enabled ? PALETTE.white : "rgba(255,255,255,0.44)", "800");
  }

  private drawTargetReticle(x: number, y: number, intensity: number): void {
    const ctx = this.ctx;
    const radius = 34 + (1 - intensity) * 12;
    ctx.save();
    ctx.globalAlpha = 0.35 + intensity * 0.55;
    ctx.strokeStyle = PALETTE.yellow;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 16;
    ctx.shadowColor = PALETTE.yellow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - radius - 10, y);
    ctx.lineTo(x - radius + 8, y);
    ctx.moveTo(x + radius - 8, y);
    ctx.lineTo(x + radius + 10, y);
    ctx.moveTo(x, y - radius - 10);
    ctx.lineTo(x, y - radius + 8);
    ctx.moveTo(x, y + radius - 8);
    ctx.lineTo(x, y + radius + 10);
    ctx.stroke();
    ctx.restore();
  }

  private drawMinion(x: number, y: number, progress: number, color: string): void {
    const ctx = this.ctx;
    const bob = Math.sin(progress * Math.PI * 8) * 4;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.shadowBlur = 14;
    ctx.shadowColor = color;
    ctx.fillStyle = "rgba(9,8,21,0.86)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 14, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(-6, -3, 3, 0, Math.PI * 2);
    ctx.arc(7, -3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private combatSlotPositions(): Record<SlotId, { x: number; y: number }> {
    return {
      head: { x: 112, y: 282 },
      body: { x: 112, y: 372 },
      left_hand: { x: 56, y: 374 },
      right_hand: { x: 166, y: 360 },
      back: { x: 158, y: 310 },
      feet: { x: 112, y: 488 }
    };
  }

  private drawResult(model: RenderModel): void {
    const equipped = this.equippedItems(model);
    const best = equipped.find((item) => item.fused) ?? equipped[0];
    this.drawNeonPanel(16, 96, 328, 452, PALETTE.purple, 14);
    this.drawCenteredText(model.result === "victory" ? "拼得离谱，赢得炸裂！" : "已收入怪物博物馆", 180, 134, 24, PALETTE.yellow, "900");
    this.drawShareCardPreview(model, best);
    this.drawButton("restart", 30, 572, 132, 40, "再来一局");
    this.drawButton("museum", 198, 572, 132, 40, "博物馆");
  }

  private drawMuseum(model: RenderModel): void {
    this.drawNeonPanel(16, 96, 328, 452, PALETTE.cyan, 14);
    this.drawCenteredText("怪物博物馆", 180, 132, 27, PALETTE.white, "900");
    const records = model.museumRecords.slice(0, 5);
    if (records.length === 0) {
      this.drawCenteredText("还没有藏品，先打一局", 180, 304, 18, "rgba(255,255,255,0.75)", "800");
    }
    records.forEach((record, index) => {
      const y = 156 + index * 70;
      this.drawNeonPanel(34, y, 292, 54, record.result === "victory" ? PALETTE.purple : "#7d8597", 7);
      this.drawBadge(record.result === "victory" ? "胜" : "墓", 62, y + 27, 18, record.result === "victory" ? PALETTE.yellow : "#adb5bd");
      this.drawText(record.weaponName, 90, y + 24, 16, PALETTE.white, "900");
      this.drawText(`秒伤 ${record.maxDps.toLocaleString()} · Combo x${record.maxCombo}`, 90, y + 44, 11, PALETTE.cyan, "800");
    });
    this.drawButton("restart", 30, 572, 132, 40, "再来一局");
    this.drawButton("result", 198, 572, 132, 40, "回结算");
  }

  private drawMechaSkeleton(model: RenderModel, battle = false): void {
    if (this.assets.hero.complete && this.assets.hero.naturalWidth > 0) {
      const scale = battle ? 1.05 : 0.82;
      const width = 210 * scale;
      const height = 315 * scale;
      const x = battle ? 180 - width / 2 : 180 - width / 2;
      const y = battle ? 176 : 154;
      this.ctx.save();
      this.ctx.shadowBlur = battle ? 28 : 18;
      this.ctx.shadowColor = model.overdrive ? PALETTE.yellow : PALETTE.cyan;
      this.ctx.drawImage(this.assets.hero, x, y, width, height);
      this.ctx.restore();
      return;
    }

    const ctx = this.ctx;
    const equipped = this.equippedItems(model);
    const best = equipped.find((item) => item.fused);
    const bodyColor = best?.color ?? "#d8dde8";
    ctx.save();
    ctx.translate(0, battle ? 8 : 0);
    ctx.shadowBlur = 22;
    ctx.shadowColor = bodyColor;
    ctx.strokeStyle = "#f7f7ff";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(180, 186);
    ctx.lineTo(180, 388);
    ctx.moveTo(180, 232);
    ctx.lineTo(92, 258);
    ctx.moveTo(180, 232);
    ctx.lineTo(268, 258);
    ctx.moveTo(180, 388);
    ctx.lineTo(142, 456);
    ctx.moveTo(180, 388);
    ctx.lineTo(218, 456);
    ctx.stroke();
    ctx.shadowBlur = 0;
    this.drawMonsterHead(180, 148, bodyColor);
    this.drawJetBoot(142, 468, -0.3);
    this.drawJetBoot(218, 468, 0.3);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.roundRect(145, 214, 70, 124, 22);
    ctx.fill();
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  private drawSlotRings(model: RenderModel): void {
    for (const slotId of SLOT_ORDER) {
      const pos = SLOT_POSITIONS[slotId];
      const item = model.equipped[slotId];
      this.ctx.save();
      this.ctx.shadowBlur = item ? 18 : 10;
      this.ctx.shadowColor = item?.color ?? PALETTE.cyan;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, item ? 34 : 28, 0, Math.PI * 2);
      this.ctx.strokeStyle = item ? item.color : "rgba(18,244,255,0.82)";
      this.ctx.lineWidth = item ? 4 : 2;
      this.ctx.stroke();
      this.ctx.restore();
      if (item) this.drawItem(item, pos.x, pos.y, 20);
      else this.drawSocketGlyph(pos.x, pos.y);
    }
  }

  private drawEquippedOverlays(model: RenderModel, battle = false): void {
    for (const slotId of SLOT_ORDER) {
      const item = model.equipped[slotId];
      if (!item) continue;
      const pos = SLOT_POSITIONS[slotId];
      const yOffset = battle ? 26 : 0;
      const radius = item.fused ? (battle ? 23 : 20) : battle ? 19 : 18;
      this.drawItem(item, pos.x, pos.y + yOffset, radius, battle && item.fused);
    }
  }

  private drawInventory(inventory: EquippedItem[]): void {
    this.drawText("零件栏", 30, 474, 15, PALETTE.white, "900");
    if (inventory.length === 0) {
      this.drawCenteredText("库存空了，拖已装零件继续调整", 180, 489, 12, "rgba(255,255,255,0.56)", "700");
      return;
    }
    inventory.slice(0, 6).forEach((item, index) => {
      const pos = this.inventoryPosition(index);
      this.drawNeonPanel(pos.x - 20, pos.y - 20, 40, 40, item.color, 6);
      this.drawItem(item, pos.x, pos.y, 14);
    });
  }

  private drawFusionFormula(model: RenderModel): void {
    const fused = model.fusedWeapons[model.fusedWeapons.length - 1];
    if (fused) {
      this.ctx.save();
      this.ctx.shadowBlur = 28;
      this.ctx.shadowColor = fused.color;
      this.drawCenteredText("融合成功！", 180, 380, 21, PALETTE.yellow, "900");
      this.drawFusionWeapon(fused, 180, 430, 38);
      this.ctx.restore();
      return;
    }

    const equipped = this.equippedItems(model);
    const left = equipped[0];
    const right = equipped[1];
    if (!left || !right) return;
    this.drawItem(left, 104, 392, 24);
    this.drawCenteredText("+", 180, 400, 30, PALETTE.white, "900");
    this.drawItem(right, 256, 392, 24);
    this.drawCenteredText("碰撞后必出融合结果", 180, 436, 16, PALETTE.yellow, "900");
  }

  private drawBattlefield(model: RenderModel): void {
    this.drawHalftone(272, 170, 3, 7, PALETTE.red, 0.42);
    for (let i = 0; i < 13; i += 1) {
      const x = 40 + ((i * 53) % 280);
      const y = 174 + ((i * 31) % 260);
      this.drawExplosion(x, y, i % 2 ? PALETTE.orange : PALETTE.purple, 0.58);
    }
    this.drawBoss(180, 194, model.overdrive);
  }

  private drawBoss(x: number, y: number, overdrive: boolean): void {
    const ctx = this.ctx;
    if (this.isImageReady(this.assets.boss)) {
      ctx.save();
      ctx.shadowBlur = overdrive ? 34 : 20;
      ctx.shadowColor = overdrive ? PALETTE.yellow : PALETTE.purple;
      const size = overdrive ? 142 : 126;
      ctx.drawImage(this.assets.boss, x - size / 2, y - size / 2, size, size);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = overdrive ? 32 : 18;
    ctx.shadowColor = overdrive ? PALETTE.yellow : PALETTE.purple;
    ctx.fillStyle = overdrive ? "#ff3159" : "#7d2cff";
    ctx.strokeStyle = PALETTE.white;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 4, 56, 38, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#111326";
    ctx.beginPath();
    ctx.arc(-20, -4, 12, 0, Math.PI * 2);
    ctx.arc(22, -5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = overdrive ? PALETTE.yellow : PALETTE.cyan;
    ctx.beginPath();
    ctx.arc(-20, -4, 6, 0, Math.PI * 2);
    ctx.arc(22, -5, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#090716";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-24, 20);
    ctx.quadraticCurveTo(0, 34, 28, 18);
    ctx.stroke();

    ctx.strokeStyle = PALETTE.orange;
    ctx.lineWidth = 6;
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 42, Math.sin(angle) * 26 + 4);
      ctx.lineTo(Math.cos(angle) * 78, Math.sin(angle) * 48 + 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawShareCardPreview(model: RenderModel, best?: EquippedItem): void {
    this.drawNeonPanel(48, 162, 264, 330, best?.color ?? PALETTE.purple, 10);
    this.drawCenteredText("分享卡", 180, 194, 18, PALETTE.cyan, "900");
    if (this.assets.hero.complete && this.assets.hero.naturalWidth > 0) {
      this.ctx.drawImage(this.assets.hero, 70, 204, 220, 250);
    } else {
      this.drawMechaPortrait(best, 180, 295, 1);
    }
    this.drawCenteredText(best?.name ?? "未命名拼装物", 180, 416, 23, PALETTE.yellow, "900");
    this.drawCenteredText(`战力 ${Math.max(model.maxDps, 999999).toExponential(2)}`, 180, 446, 15, PALETTE.white, "900");
    this.drawCenteredText(`Combo x${model.maxCombo || 47} · 融合 ${model.fusionCount} 次`, 180, 470, 13, PALETTE.cyan, "800");
  }

  private drawBottomTabs(active: GamePhase): void {
    const labels: Array<[ButtonId, string, string, boolean]> = [
      ["tabAssembly", "拼装", "拼", active === "loot" || active === "lootResult" || active === "assembly"],
      ["tabFusion", "融合", "融", active === "fusion" || active === "fusionSuccess"],
      ["tabCombat", "战斗", "战", active === "combat" || active === "result"],
      ["tabMuseum", "馆藏", "馆", active === "museum" || active === "shop" || active === "missions" || active === "achievements"]
    ];
    labels.forEach(([id, label, icon, isActive], index) => {
      const x = 24 + index * 78;
      this.buttons.push(button(id, x, 604, 56, 30));
      this.drawNeonPanel(x, 604, 56, 30, isActive ? PALETTE.yellow : PALETTE.purple, 4);
      this.drawCenteredText(icon, x + 28, 619, 13, isActive ? "#11131a" : PALETTE.white, "900");
      this.drawCenteredText(label, x + 28, 631, 8, isActive ? "#11131a" : "rgba(255,255,255,0.76)", "800");
    });
  }

  private inventoryPosition(index: number): { x: number; y: number } {
    return { x: 46 + index * 49, y: 506 };
  }

  private drawButton(id: ButtonId, x: number, y: number, w: number, h: number, label: string): void {
    this.buttons.push(button(id, x, y, w, h));
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = PALETTE.yellow;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, "#fff36d");
    grad.addColorStop(1, "#ff9f1c");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#2b1800";
    ctx.stroke();
    ctx.restore();
    this.drawCenteredText(label, x + w / 2, y + h / 2 + 6, 16, "#1b1000", "900");
  }

  private drawItem(item: EquippedItem | undefined, x: number, y: number, radius: number, glow = false): void {
    if (!item) return;
    if (item.fused) {
      this.ctx.save();
      this.ctx.shadowBlur = 28;
      this.ctx.shadowColor = item.color;
      this.drawFusionWeapon(item, x, y, radius);
      this.ctx.restore();
      return;
    }

    if (glow) {
      this.ctx.save();
      this.ctx.shadowBlur = 22;
      this.ctx.shadowColor = item.color;
      this.drawPartSprite(item.sourcePartIds[0], x, y, radius);
      this.ctx.restore();
      return;
    }

    this.drawPartSprite(item.sourcePartIds[0], x, y, radius);
  }

  private drawPartIcon(part: PartDef, x: number, y: number, radius: number): void {
    this.drawPartSprite(part.id, x, y, radius);
  }

  private drawProjectile(projectile: ProjectileRenderState, x: number, y: number, overdrive: boolean): void {
    this.ctx.save();
    this.ctx.globalAlpha = overdrive ? 1 : 0.92;
    this.ctx.shadowBlur = overdrive ? 18 : 10;
    this.ctx.shadowColor = projectile.color;
    if (projectile.fused) {
      const weaponIndex = this.weaponSpriteIndex(projectile.weaponId ?? projectile.icon);
      if (this.isImageReady(this.assets.weapons)) {
        const size = overdrive ? 62 : 48;
        this.drawSheetCell(this.assets.weapons, 4, 3, weaponIndex, x - size / 2, y - size / 2, size, size);
        this.ctx.restore();
        return;
      }
    } else if (this.isImageReady(this.assets.parts)) {
      const partIndex = PART_SPRITE_ORDER.indexOf(projectile.sourcePartId);
      if (partIndex >= 0) {
        const size = overdrive ? 44 : 36;
        this.drawSheetCell(this.assets.parts, 5, 4, partIndex, x - size / 2, y - size / 2, size, size);
        this.ctx.restore();
        return;
      }
    }
    this.ctx.restore();
    this.drawWeaponShape(projectile.icon, x, y, overdrive ? 17 : 14, projectile.color);
  }

  private drawPartSprite(partId: string, x: number, y: number, radius: number): void {
    const partIndex = PART_SPRITE_ORDER.indexOf(partId);
    if (partIndex >= 0 && this.isImageReady(this.assets.parts)) {
      this.ctx.save();
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = PALETTE.cyan;
      this.drawSheetCell(this.assets.parts, 5, 4, partIndex, x - radius * 1.75, y - radius * 1.75, radius * 3.5, radius * 3.5);
      this.ctx.restore();
      return;
    }

    this.drawBadge("?", x, y, radius, PALETTE.purple);
  }

  private drawFusionWeapon(item: EquippedItem, x: number, y: number, radius: number): void {
    const weaponIndex = this.weaponSpriteIndex(item.weaponId ?? item.name);
    if (this.isImageReady(this.assets.weapons)) {
      this.drawSheetCell(this.assets.weapons, 4, 3, weaponIndex, x - radius * 1.95, y - radius * 1.55, radius * 3.9, radius * 3.1);
      return;
    }

    this.drawWeaponShape(item.icon, x, y, radius, item.color);
  }

  private weaponSpriteIndex(key: string): number {
    const exactIndex = FUSION_SPRITE_ORDER.indexOf(key);
    return exactIndex >= 0 ? exactIndex : this.hashToIndex(key, FUSION_SPRITE_ORDER.length);
  }

  private drawWeaponShape(label: string, x: number, y: number, radius: number, color: string): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.42);
    ctx.fillStyle = color;
    ctx.strokeStyle = PALETTE.white;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-radius * 0.42, -radius * 1.2, radius * 0.84, radius * 2.4, radius * 0.25);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PALETTE.yellow;
    ctx.beginPath();
    ctx.arc(0, radius * 0.82, radius * 0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    this.drawCenteredText(label.slice(0, 2), x, y + 5, Math.max(11, radius * 0.42), "#120817", "900");
  }

  private drawBadge(label: string, x: number, y: number, radius: number, color: string): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - radius, y - radius, radius * 2, radius * 2, radius * 0.28);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = PALETTE.white;
    ctx.stroke();
    ctx.restore();
    this.drawCenteredText(label, x, y + Math.min(6, radius * 0.24), Math.max(9, radius * 0.46), "#090716", "900");
  }

  private drawSocketGlyph(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(18,244,255,0.88)";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = PALETTE.cyan;
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.stroke();
    ctx.restore();
  }

  private drawNeonPanel(x: number, y: number, w: number, h: number, color: string, radius: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 14;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.24)";
    ctx.strokeRect(x + 5, y + 5, Math.max(0, w - 10), Math.max(0, h - 10));
    ctx.restore();
  }

  private drawMonsterHead(x: number, y: number, color: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, 44, 28, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.white;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = PALETTE.yellow;
    ctx.beginPath();
    ctx.arc(x + 18, y - 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#080814";
    ctx.beginPath();
    ctx.arc(x + 20, y - 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#080814";
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + 10 + i * 6, y + 10);
      ctx.lineTo(x + 13 + i * 6, y + 20);
      ctx.stroke();
    }
    ctx.strokeStyle = PALETTE.purple;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 28, y - 22);
    ctx.lineTo(x - 42, y - 44);
    ctx.lineTo(x - 20, y - 28);
    ctx.stroke();
  }

  private drawJetBoot(x: number, y: number, tilt: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.fillStyle = "#b7bcc9";
    ctx.fillRect(-10, -18, 20, 35);
    ctx.fillStyle = PALETTE.orange;
    ctx.beginPath();
    ctx.moveTo(-12, 17);
    ctx.lineTo(0, 56);
    ctx.lineTo(12, 17);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawMechaPortrait(item: EquippedItem | undefined, x: number, y: number, scale: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);
    this.drawMonsterHead(0, -70, item?.color ?? PALETTE.cyan);
    if (item?.fused) this.drawFusionWeapon(item, -58, -4, 38);
    else this.drawWeaponShape(item?.icon ?? "神兵", -58, -4, 38, item?.color ?? PALETTE.purple);
    this.drawWeaponShape("炮", 68, 8, 42, PALETTE.cyan);
    this.drawJetBoot(-28, 84, -0.18);
    this.drawJetBoot(32, 84, 0.18);
    this.ctx.restore();
  }

  private drawExplosion(x: number, y: number, color: string, alpha: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 ? 8 : 18;
      const a = (Math.PI * 2 * i) / 10;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawLightning(x1: number, y1: number, x2: number, y2: number, color: string, alpha: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    const steps = 5;
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t + (i % 2 ? 14 : -14);
      const y = y1 + (y2 - y1) * t;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  private drawLaser(x1: number, y1: number, x2: number, y2: number, color: string, width: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.shadowBlur = 16;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  private drawDamageNumber(text: string, x: number, y: number, size: number, color: string): void {
    this.ctx.save();
    this.ctx.rotate(-0.08);
    this.drawCenteredText(text, x, y, size, color, "900");
    this.ctx.restore();
  }

  private drawBar(x: number, y: number, width: number, height: number, ratio: number, fill: string, track: string): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = track;
    ctx.fillRect(x, y, width, height);
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, PALETTE.orange);
    gradient.addColorStop(0.55, fill);
    gradient.addColorStop(1, "#7b0d24");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width * Math.max(0, Math.min(1, ratio)), height);
    ctx.strokeStyle = "rgba(255,255,255,0.42)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }

  private quadraticPoint(
    from: { x: number; y: number },
    control: { x: number; y: number },
    to: { x: number; y: number },
    t: number
  ): { x: number; y: number } {
    const safeT = Math.max(0, Math.min(1, t));
    const inv = 1 - safeT;
    return {
      x: inv * inv * from.x + 2 * inv * safeT * control.x + safeT * safeT * to.x,
      y: inv * inv * from.y + 2 * inv * safeT * control.y + safeT * safeT * to.y
    };
  }

  private formatMetric(value: number): string {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 10_000) return `${Math.round(value / 1000)}K`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return Math.round(value).toString();
  }

  private rarityLabel(part: PartDef): string {
    return rarityTier(part);
  }

  private rarityColor(part: PartDef): string {
    if (part.category === "catalyst" || part.rarity === "epic") return PALETTE.yellow;
    if (part.rarity === "rare") return PALETTE.purple;
    return PALETTE.cyan;
  }

  private drawPointer(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = PALETTE.yellow;
    ctx.strokeStyle = PALETTE.white;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 16, y + 34);
    ctx.lineTo(x + 16, y + 34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawHalftone(x: number, y: number, size: number, count: number, color: string, alpha: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        ctx.beginPath();
        ctx.arc(x + col * size * 2.4, y + row * size * 2.1, size * (1 - row / (count * 1.5)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawSlash(x: number, y: number, length: number, color: string, alpha: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y - 28);
    ctx.stroke();
    ctx.restore();
  }

  private drawPrimaryHint(text: string, y: number): void {
    this.drawCenteredText(text, 180, y, 16, PALETTE.white, "900");
  }

  private drawFloatingTexts(model: RenderModel): void {
    model.floatingTexts.slice(-3).forEach((message, index) => {
      const alpha = Math.min(1, message.ttl / 700);
      this.ctx.globalAlpha = alpha;
      this.drawNeonPanel(24, 92 + index * 28, 312, 24, message.color, 6);
      this.drawCenteredText(message.text, 180, 110 + index * 28, 12, PALETTE.white, "900");
      this.ctx.globalAlpha = 1;
    });
  }

  private drawCardPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.fillStyle = "rgba(10, 5, 25, 0.84)";
    ctx.strokeStyle = PALETTE.purple;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 26);
    ctx.fill();
    ctx.stroke();
  }

  private drawCardHalftone(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = color;
    for (let row = 0; row < 12; row += 1) {
      for (let col = 0; col < 12; col += 1) {
        ctx.beginPath();
        ctx.arc(x + col * 34, y + row * 30, Math.max(5, size / 20 - row), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawCardLightning(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    ctx.save();
    ctx.strokeStyle = PALETTE.cyan;
    ctx.lineWidth = 14;
    ctx.shadowBlur = 32;
    ctx.shadowColor = PALETTE.cyan;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(320, 420);
    ctx.lineTo(250, 680);
    ctx.lineTo(610, 900);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  private drawCardMonster(ctx: CanvasRenderingContext2D, item: EquippedItem | undefined, x: number, y: number, size: number): void {
    if (this.assets.hero.complete && this.assets.hero.naturalWidth > 0) {
      ctx.save();
      ctx.shadowBlur = 70;
      ctx.shadowColor = item?.color ?? PALETTE.cyan;
      ctx.drawImage(this.assets.hero, x - size * 0.46, y - size * 0.7, size * 0.92, size * 1.28);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 70;
    ctx.shadowColor = item?.color ?? PALETTE.cyan;
    ctx.fillStyle = item?.color ?? PALETTE.cyan;
    ctx.beginPath();
    ctx.ellipse(0, -115, size * 0.42, size * 0.24, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.white;
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.fillStyle = PALETTE.yellow;
    ctx.beginPath();
    ctx.arc(size * 0.16, -size * 0.35, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillRect(-size * 0.14, -size * 0.1, size * 0.28, size * 0.58);
    ctx.strokeRect(-size * 0.14, -size * 0.1, size * 0.28, size * 0.58);
    ctx.fillStyle = PALETTE.orange;
    ctx.beginPath();
    ctx.moveTo(-size * 0.28, size * 0.42);
    ctx.lineTo(-size * 0.1, size * 0.92);
    ctx.lineTo(0, size * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 0.28, size * 0.42);
    ctx.lineTo(size * 0.1, size * 0.92);
    ctx.lineTo(0, size * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawCenteredText(text: string, x: number, y: number, size: number, color: string, weight = "700"): void {
    this.drawText(text, x, y, size, color, weight, "center");
  }

  private drawText(
    text: string,
    x: number,
    y: number,
    size: number,
    color: string,
    weight = "700",
    align: CanvasTextAlign = "left"
  ): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px Microsoft YaHei, PingFang SC, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.lineWidth = Math.max(2, size * 0.12);
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  }

  private phaseName(phase: GamePhase): string {
    const names: Record<GamePhase, string> = {
      launch: "启动页",
      home: "首页",
      loot: "补给开箱",
      lootResult: "开箱结果",
      assembly: "超级拼装",
      fusion: "随意融合",
      fusionSuccess: "融合成功",
      combat: "自动战斗",
      graveyard: "坟场",
      graveStart: "挖坟开局",
      result: "分享卡",
      museum: "博物馆",
      weaponDetail: "武器详情",
      share: "分享卡片",
      shop: "商店",
      missions: "任务",
      achievements: "成就",
      settings: "设置",
      tutorial: "新手引导"
    };
    return names[phase];
  }

  private distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  private loadImage(src: string): HTMLImageElement {
    const image = new Image();
    image.src = src;
    return image;
  }

  private isImageReady(image: HTMLImageElement): boolean {
    return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
  }

  private drawSheetCell(
    image: HTMLImageElement,
    columns: number,
    rows: number,
    index: number,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const sw = image.naturalWidth / columns;
    const sh = image.naturalHeight / rows;
    const sx = (index % columns) * sw;
    const sy = Math.floor(index / columns) * sh;
    this.ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  }

  private hashToIndex(text: string, modulo: number): number {
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
    return hash % modulo;
  }

  private drawCoverImage(image: HTMLImageElement, x: number, y: number, w: number, h: number): void {
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const boxRatio = w / h;
    let sx = 0;
    let sy = 0;
    let sw = image.naturalWidth;
    let sh = image.naturalHeight;
    if (imageRatio > boxRatio) {
      sw = image.naturalHeight * boxRatio;
      sx = (image.naturalWidth - sw) / 2;
    } else {
      sh = image.naturalWidth / boxRatio;
      sy = (image.naturalHeight - sh) / 2;
    }
    this.ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  }
}
