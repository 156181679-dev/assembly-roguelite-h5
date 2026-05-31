import { SLOT_ORDER } from "../data";
import type { EncounterEvent, EncounterSnapshot } from "../systems/CombatEncounterSystem";
import { rarityTier } from "../systems/LootSystem";
import type { EquippedItem, GamePhase, MuseumRecord, PartDef, SlotId } from "../types";
import { buildLootRevealLayout, type LootRevealAction, type LootRevealCard, type LootRevealLayout } from "./lootRevealLayout";
import { getCombatRects } from "./posterLayout";

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
  | "combatShield"
  | "rerollPreview";

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

interface CombatDamageTextRenderState {
  text: string;
  x: number;
  y: number;
  ttl: number;
  color: string;
  size: number;
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
  combatEncounter?: EncounterSnapshot;
  combatEvents: EncounterEvent[];
  combatDamageTexts: CombatDamageTextRenderState[];
  combatHitFlash: number;
  manualAim?: { x: number; y: number; intensity: number };
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
  private readonly assets: Record<"hero" | "heroArmed" | "parts" | "weapons" | "boss", HTMLImageElement>;
  private buttons: Rect[] = [];

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context is unavailable");
    }
    this.canvas = canvas;
    this.ctx = ctx;
    this.assets = {
      hero: this.loadImage("/assets/optimized/mecha-fish-base.webp"),
      heroArmed: this.loadImage("/assets/optimized/mecha-fish-hero.webp"),
      parts: this.loadImage("/assets/optimized/base-parts-sheet.webp"),
      weapons: this.loadImage("/assets/optimized/fusion-weapons-12-sheet.webp"),
      boss: this.loadImage("/assets/optimized/boss-asteroid-demon.webp")
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
    this.drawLaunchPosterBackground(model);
    this.drawLaunchTitleLogo(180, 78, 1);
    this.drawLaunchHero(model);
    this.drawLaunchForegroundSparks(model);
    this.drawLaunchStartButton("start", 86, 552, 188, 46, "开始游戏");
  }

  private drawHome(model: RenderModel): void {
    this.drawBackground(model);
    this.drawTopCurrency();
    this.drawLogoBackplate(182, 60, 218, 78);
    this.drawPosterTitleLogo(182, 72, 30);
    this.drawSideMenu();
    this.drawNeonPanel(92, 120, 210, 306, PALETTE.purple, 12);
    if (this.isImageReady(this.assets.hero)) {
      this.ctx.save();
      this.ctx.shadowBlur = 26;
      this.ctx.shadowColor = PALETTE.cyan;
      this.ctx.drawImage(this.assets.hero, 110, 134, 162, 238);
      this.ctx.restore();
    }
    this.drawButton("start", 84, 390, 192, 46, "开始冒险");
    this.drawButton("graveStart", 104, 448, 152, 38, "挖坟开局");
    this.drawHomeNavButton("shop", 18, 548, 72, "商店");
    this.drawHomeNavButton("missions", 102, 548, 72, "任务");
    this.drawHomeNavButton("achievements", 186, 548, 72, "排行");
    this.drawHomeNavButton("weaponDetail", 270, 548, 72, "仓库");
  }

  private drawLaunchPosterBackground(model: RenderModel): void {
    const ctx = this.ctx;
    const pulse = 0.5 + Math.sin(performance.now() / 520) * 0.5;
    const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    bg.addColorStop(0, "#09031d");
    bg.addColorStop(0.26, "#2b075d");
    bg.addColorStop(0.52, "#150535");
    bg.addColorStop(0.78, "#370557");
    bg.addColorStop(1, "#07020f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.26 + pulse * 0.08;
    for (let i = 0; i < 22; i += 1) {
      const y = 38 + i * 24;
      const x = i % 2 ? 326 : -42;
      const length = 86 + (i % 5) * 18;
      this.drawSlash(x, y, length, i % 3 === 0 ? PALETTE.orange : PALETTE.purple, 0.54);
    }
    ctx.restore();

    this.drawHalftone(22, 34, 3, 12, PALETTE.purple, 0.34);
    this.drawHalftone(252, 46, 3, 9, PALETTE.purple, 0.26);
    this.drawHalftone(20, 472, 3, 9, PALETTE.cyan, 0.16);
    this.drawLightning(18, 26, 72, 156, PALETTE.cyan, 0.78);
    this.drawLightning(342, 72, 278, 222, PALETTE.purple, 0.86);
    this.drawLightning(42, 194, 106, 340, PALETTE.purple, 0.58);
    this.drawLightning(312, 260, 250, 460, PALETTE.cyan, 0.48);

    ctx.save();
    ctx.strokeStyle = "rgba(255,43,214,0.96)";
    ctx.shadowBlur = 22;
    ctx.shadowColor = PALETTE.purple;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(5, 5, WIDTH - 10, HEIGHT - 10, 13);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.roundRect(13, 14, WIDTH - 26, HEIGHT - 28, 9);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    const lowerShade = ctx.createLinearGradient(0, 416, 0, HEIGHT);
    lowerShade.addColorStop(0, "rgba(5,2,17,0)");
    lowerShade.addColorStop(0.62, "rgba(5,2,17,0.46)");
    lowerShade.addColorStop(1, "rgba(5,2,17,0.88)");
    ctx.fillStyle = lowerShade;
    ctx.fillRect(0, 416, WIDTH, HEIGHT - 416);
    ctx.globalAlpha = 0.16 + Math.min(0.12, model.phaseProgress);
    ctx.fillStyle = PALETTE.purple;
    ctx.fillRect(9, HEIGHT - 16, WIDTH - 18, 2);
    ctx.restore();
  }

  private drawLaunchTitleLogo(x: number, y: number, scale: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = PALETTE.purple;
    ctx.fillStyle = "rgba(3, 2, 10, 0.9)";
    ctx.beginPath();
    ctx.moveTo(36, y - 42);
    ctx.lineTo(314, y - 54);
    ctx.lineTo(330, y - 11);
    ctx.lineTo(276, y + 8);
    ctx.lineTo(70, y + 4);
    ctx.lineTo(26, y - 16);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(255,43,214,0.88)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(54, y + 12);
    ctx.lineTo(306, y - 6);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 16;
    ctx.shadowColor = PALETTE.yellow;
    ctx.font = `900 ${Math.floor(50 * scale)}px Microsoft YaHei, PingFang SC, sans-serif`;
    ctx.strokeStyle = "#080510";
    ctx.lineWidth = 10;
    ctx.strokeText("拼装狂潮", x, y);
    ctx.fillStyle = "#ffe72e";
    ctx.fillText("拼装狂潮", x, y);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.82)";
    ctx.lineWidth = 2;
    ctx.strokeText("拼装狂潮", x, y);

    ctx.shadowBlur = 12;
    ctx.shadowColor = PALETTE.purple;
    ctx.font = `900 ${Math.floor(23 * scale)}px Microsoft YaHei, PingFang SC, sans-serif`;
    ctx.strokeStyle = "#090510";
    ctx.lineWidth = 6;
    ctx.strokeText("融合肉鸽", x, y + 42 * scale);
    ctx.fillStyle = PALETTE.purple;
    ctx.fillText("融合肉鸽", x, y + 42 * scale);
    ctx.restore();
  }

  private drawLaunchHero(model: RenderModel): void {
    const ctx = this.ctx;
    const hero = this.isImageReady(this.assets.heroArmed) ? this.assets.heroArmed : this.assets.hero;
    const bob = Math.sin(performance.now() / 420) * 2.5;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.38;
    this.drawLightning(190, 142, 172, 520, PALETTE.cyan, 0.72);
    this.drawLightning(242, 112, 306, 446, PALETTE.purple, 0.56);
    ctx.restore();

    if (this.isImageReady(hero)) {
      ctx.save();
      ctx.shadowBlur = model.overdrive ? 58 : 42;
      ctx.shadowColor = model.overdrive ? PALETTE.yellow : PALETTE.cyan;
      ctx.drawImage(hero, 8, 116 + bob, 348, 464);
      ctx.restore();
      return;
    }

    this.drawMechaPortrait(undefined, 180, 340 + bob, 1.75);
  }

  private drawLaunchForegroundSparks(_model: RenderModel): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 18; i += 1) {
      const x = (i * 53) % WIDTH;
      const y = 128 + ((i * 97) % 430);
      const color = i % 3 === 0 ? PALETTE.orange : i % 3 === 1 ? PALETTE.purple : PALETTE.cyan;
      ctx.globalAlpha = 0.2 + (i % 5) * 0.06;
      ctx.strokeStyle = color;
      ctx.lineWidth = i % 4 === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(x - 24, y + 14);
      ctx.lineTo(x + 28, y - 18);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawLaunchStartButton(id: ButtonId, x: number, y: number, w: number, h: number, label: string): void {
    this.buttons.push(button(id, x, y, w, h));
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowBlur = 26;
    ctx.shadowColor = PALETTE.purple;
    ctx.fillStyle = "rgba(8, 3, 20, 0.86)";
    ctx.beginPath();
    ctx.roundRect(x - 13, y - 9, w + 26, h + 18, 6);
    ctx.fill();
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, "#37118a");
    grad.addColorStop(0.52, "#932dff");
    grad.addColorStop(1, "#2a0b58");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#f6d7ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 5);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = PALETTE.purple;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - 5, y - 5, w + 10, h + 10, 7);
    ctx.stroke();
    ctx.restore();
    this.drawCenteredText(label, x + w / 2, y + h / 2 + 7, 18, PALETTE.white, "900");
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

  private drawPosterTitleLogo(x: number, y: number, size: number): void {
    this.drawCenteredText("拼装狂潮", x, y, size, PALETTE.yellow, "900");
    this.drawCenteredText("融合肉鸽", x, y + size * 0.94, Math.floor(size * 0.58), PALETTE.purple, "900");
  }

  private drawLogoBackplate(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    ctx.save();
    const grad = ctx.createRadialGradient(x, y + h * 0.38, 12, x, y + h * 0.38, w * 0.62);
    grad.addColorStop(0, "rgba(5,5,17,0.92)");
    grad.addColorStop(0.58, "rgba(5,5,17,0.72)");
    grad.addColorStop(1, "rgba(5,5,17,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - w / 2, y - 24, w, h + 42);
    ctx.restore();
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

  private drawHomeNavButton(id: ButtonId, x: number, y: number, w: number, label: string): void {
    this.buttons.push(button(id, x, y, w, 54));
    this.drawNeonPanel(x, y, w, 54, PALETTE.purple, 7);
    this.drawCenteredText(label.slice(0, 1), x + w / 2, y + 23, 18, PALETTE.white, "900");
    this.drawCenteredText(label, x + w / 2, y + 42, 12, "rgba(255,255,255,0.86)", "900");
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
    this.drawText("拼装狂潮", 18, 35, 26, PALETTE.yellow, "900");
    this.drawText("融合肉鸽", 20, 58, 15, PALETTE.white, "900");
    this.drawText(`第 ${model.round}/3 轮 · ${this.phaseName(model.phase)}`, 118, 58, 12, PALETTE.cyan, "800");
    this.drawNeonPanel(246, 18, 92, 42, PALETTE.purple, 8);
    this.drawCenteredText("60秒", 292, 45, 22, PALETTE.yellow, "900");
    this.ctx.fillStyle = "rgba(255,255,255,0.18)";
    this.ctx.fillRect(20, 76, 318, 6);
    this.ctx.fillStyle = model.overdrive ? PALETTE.yellow : PALETTE.cyan;
    this.ctx.fillRect(20, 76, 318 * model.phaseProgress, 6);
  }

  private drawLoot(model: RenderModel): void {
    this.drawNeonPanel(18, 101, 324, 486, PALETTE.purple, 14);
    this.drawLootMachine(model);
  }

  private drawLootMachine(model: RenderModel): void {
    const layout = buildLootRevealLayout({ rewards: model.rewards, phaseProgress: model.phaseProgress });
    this.drawLootReveal(layout, model);
  }

  private drawLootReveal(layout: LootRevealLayout, model: RenderModel): void {
    const ctx = this.ctx;
    this.drawCenteredText(layout.title.text, layout.title.x + layout.title.w / 2, layout.title.y + 25, layout.title.fontSize, layout.title.color, layout.title.weight);
    this.drawCenteredText(
      layout.subtitle.text,
      layout.subtitle.x + layout.subtitle.w / 2,
      layout.subtitle.y + 14,
      layout.subtitle.fontSize,
      layout.subtitle.color,
      layout.subtitle.weight
    );

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = layout.theme.glow.burst;
    ctx.shadowColor = layout.theme.colors.yellow;
    layout.burst.rays.forEach((ray) => {
      ctx.strokeStyle = ray.color;
      ctx.lineWidth = ray.width;
      ctx.beginPath();
      ctx.moveTo(layout.burst.center.x, layout.burst.center.y);
      ctx.lineTo(layout.burst.center.x + Math.cos(ray.angle) * ray.length, layout.burst.center.y + Math.sin(ray.angle) * ray.length);
      ctx.stroke();
    });
    layout.burst.particles.forEach((particle) => {
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    this.drawLootChest(layout);
    layout.cards.forEach((card) => {
      const part = model.rewards.find((reward) => reward.id === card.partId);
      this.drawLootRevealCard(card, part);
    });
    layout.rarityLegend.forEach((item) => {
      this.drawText(item.tier, item.rect.x, item.rect.y + 13, 11, item.color, "900");
      this.drawText(item.text, item.rect.x + 24, item.rect.y + 13, 9, PALETTE.white, "800");
    });

    this.drawCenteredText(layout.hint.text, layout.hint.x + layout.hint.w / 2, layout.hint.y + 17, layout.hint.fontSize, layout.hint.color, layout.hint.weight);
    this.drawLootRevealAction(layout.actions.primary);
    this.drawLootRevealAction(layout.actions.secondary);
  }

  private drawLootChest(layout: LootRevealLayout): void {
    const ctx = this.ctx;
    const { chest } = layout;
    ctx.save();
    ctx.shadowBlur = layout.theme.glow.chest;
    ctx.shadowColor = chest.glowColor;
    this.drawNeonPanel(chest.rect.x, chest.rect.y, chest.rect.w, chest.rect.h, PALETTE.yellow, 10);
    ctx.fillStyle = "rgba(255,138,31,0.72)";
    ctx.fillRect(chest.lidRect.x, chest.lidRect.y, chest.lidRect.w, chest.lidRect.h);
    ctx.fillStyle = "rgba(255,227,41,0.92)";
    ctx.fillRect(chest.coreRect.x, chest.coreRect.y, chest.coreRect.w, chest.coreRect.h);
    ctx.strokeStyle = PALETTE.white;
    ctx.lineWidth = 2;
    ctx.strokeRect(chest.coreRect.x, chest.coreRect.y, chest.coreRect.w, chest.coreRect.h);
    ctx.restore();
    this.drawCenteredText("SSR", chest.coreRect.x + chest.coreRect.w / 2, chest.coreRect.y + 31, 20, "#120817", "900");
  }

  private drawLootRevealCard(card: LootRevealCard, part?: PartDef): void {
    const ctx = this.ctx;
    const float = Math.sin(card.index + performance.now() / 260) * 1.8;
    const y = card.rect.y + float;
    this.drawNeonPanel(card.rect.x, y, card.rect.w, card.rect.h, card.tierColor, 8);
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = card.tierColor;
    ctx.fillRect(card.rect.x + 5, y + 42, card.rect.w - 10, 1);
    ctx.restore();
    this.drawNeonPanel(card.badge.x, card.badge.y + float, card.badge.w, card.badge.h, card.tierColor, 6);
    this.drawCenteredText(card.tier, card.badge.x + card.badge.w / 2, card.badge.y + 17 + float, 14, PALETTE.yellow, "900");
    if (part) {
      this.drawPartIcon(part, card.iconCenter.x, card.iconCenter.y + float, 28);
    } else {
      this.drawWeaponShape(card.icon, card.iconCenter.x, card.iconCenter.y + float, 26, card.accentColor);
    }
    this.drawCenteredText(card.categoryLabel, card.rect.x + card.rect.w / 2, y + 105, 9, card.tierColor, "900");
    this.drawCenteredText(card.name, card.nameBox.x + card.nameBox.w / 2, card.nameBox.y + float + 16, card.nameBox.fontSize, card.nameBox.color, card.nameBox.weight);
  }

  private drawLootRevealAction(action: LootRevealAction): void {
    if (action.id === "continue") {
      this.drawButton(action.id, action.x, action.y, action.w, action.h, action.label);
      return;
    }
    this.buttons.push(button(action.id, action.x, action.y, action.w, action.h));
    this.drawNeonPanel(action.x, action.y, action.w, action.h, action.color, 8);
    this.drawCenteredText(action.label, action.x + action.w / 2, action.y + action.h / 2 + 4, 12, action.textColor, "900");
  }

  private drawAssembly(model: RenderModel): void {
    const title = model.phase === "assembly" ? "2. 拖拽拼装" : "3. 任意融合";
    this.drawNeonPanel(16, 100, 328, 445, model.phase === "fusion" ? PALETTE.cyan : PALETTE.purple, 14);
    this.drawCenteredText(title, 180, 132, 23, PALETTE.white, "900");
    this.drawMechaSkeleton(model);
    this.drawSlotRings(model);
    this.drawInventory(model.inventory);
    if (model.phase === "assembly") this.drawAssemblyGuide(model);
    if (model.phase === "fusion") {
      this.drawFusionFormula(model);
      this.drawButton("fuse", 30, 560, 126, 36, "一键融合");
      this.drawButton("continue", 204, 560, 132, 36, "开战/下一轮");
    } else {
      this.drawButton("autoEquip", 30, 560, 126, 36, "一键装配");
      this.drawButton("continue", 204, 560, 132, 36, "去融合");
    }
  }

  private drawCombat(model: RenderModel): void {
    const rects = getCombatRects();
    const pressure = Math.min(0.28, model.maxDps / 180_000) + Math.min(0.18, model.maxCombo * 0.006);
    const bossHpRatio = model.combatEncounter
      ? Math.max(0, model.combatEncounter.boss.hp / model.combatEncounter.boss.maxHp)
      : Math.max(0.03, 1 - model.phaseProgress * (model.overdrive ? 0.86 : 0.68) - pressure);
    const remainingSeconds = Math.max(0, Math.ceil(60 * (1 - model.phaseProgress)));
    this.drawNeonPanel(rects.panel.x, rects.panel.y, rects.panel.w, rects.panel.h, model.overdrive ? PALETTE.yellow : PALETTE.purple, 12);
    this.drawCombatArena(model);
    this.drawCombatHud(model, bossHpRatio, remainingSeconds);
    this.drawCombatEnemies(model, bossHpRatio);
    this.drawCombatHero(model);
    this.drawCombatWeaponMounts(model);
    this.drawCombatAttacks(model);
    if (model.manualAim) this.drawManualAim(model.manualAim.x, model.manualAim.y, model.manualAim.intensity);
    this.drawCombatCounters(model);
    this.drawCombatDamage(model);
    this.drawCombatControls(model);
  }

  private drawCombatArena(model: RenderModel): void {
    const ctx = this.ctx;
    const { battlefield } = getCombatRects();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(battlefield.x, battlefield.y, battlefield.w, battlefield.h, 12);
    ctx.clip();

    const arena = ctx.createLinearGradient(battlefield.x, battlefield.y, battlefield.x + battlefield.w, battlefield.y + battlefield.h);
    arena.addColorStop(0, model.overdrive ? "#370818" : "#110b25");
    arena.addColorStop(0.54, "#071629");
    arena.addColorStop(1, "#05060d");
    ctx.fillStyle = arena;
    ctx.fillRect(battlefield.x, battlefield.y, battlefield.w, battlefield.h);

    ctx.globalAlpha = 0.36;
    ctx.strokeStyle = model.overdrive ? PALETTE.yellow : PALETTE.cyan;
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i += 1) {
      const y = battlefield.y + 34 + i * 34 + (model.phaseProgress * 42) % 34;
      ctx.beginPath();
      ctx.moveTo(battlefield.x + 2, y);
      ctx.lineTo(battlefield.x + battlefield.w - 2, y - 22);
      ctx.stroke();
    }
    for (let i = 0; i < 7; i += 1) {
      const x = battlefield.x + 12 + i * 48;
      ctx.beginPath();
      ctx.moveTo(x, battlefield.y + 6);
      ctx.lineTo(x - 66, battlefield.y + battlefield.h);
      ctx.stroke();
    }
    ctx.restore();

    this.drawHalftone(254, 206, 3, 8, PALETTE.red, model.overdrive ? 0.5 : 0.3);
    this.drawLightning(36, 218, 136, 270, PALETTE.cyan, 0.42);
    this.drawLightning(328, 236, 260, 362, model.overdrive ? PALETTE.yellow : PALETTE.purple, 0.48);
  }

  private drawCombatHud(model: RenderModel, bossHpRatio: number, remainingSeconds: number): void {
    const { bossHud } = getCombatRects();
    this.drawCenteredText(model.overdrive ? "超载时刻！" : "4. 自动战斗", 180, 128, model.overdrive ? 28 : 23, model.overdrive ? PALETTE.yellow : PALETTE.white, "900");
    this.drawNeonPanel(bossHud.x, bossHud.y, bossHud.w, bossHud.h, model.overdrive ? PALETTE.yellow : PALETTE.cyan, 7);
    this.drawText(`第 ${model.round} 波`, bossHud.x + 14, bossHud.y + 21, 13, PALETTE.white, "900");
    this.drawCenteredText(`${remainingSeconds}s`, bossHud.x + bossHud.w / 2, bossHud.y + 21, 16, PALETTE.yellow, "900");
    this.drawText(`DPS ${this.formatMetric(Math.max(model.maxDps, 973))}`, bossHud.x + bossHud.w - 14, bossHud.y + 21, 13, PALETTE.cyan, "900", "right");
    this.drawBar(bossHud.x + 14, bossHud.y + 30, bossHud.w - 28, 6, bossHpRatio, PALETTE.red, "rgba(255,255,255,0.18)");
    this.drawBar(bossHud.x + 14, bossHud.y + 39, 132, 5, model.combatEnergy / 100, PALETTE.yellow, "rgba(255,255,255,0.16)");
    this.drawCenteredText(`能量 ${Math.floor(model.combatEnergy)}`, bossHud.x + 204, bossHud.y + 44, 10, PALETTE.yellow, "900");
  }

  private drawCombatEnemies(model: RenderModel, bossHpRatio: number): void {
    const minionPositions = [
      { id: "minion-1", x: 288, y: 358, color: PALETTE.purple, offset: 0 },
      { id: "minion-2", x: 226, y: 418, color: PALETTE.red, offset: 0.28 },
      { id: "minion-3", x: 306, y: 442, color: PALETTE.orange, offset: 0.53 }
    ];
    minionPositions.forEach((position) => {
      const state = model.combatEncounter?.minions.find((minion) => minion.id === position.id);
      if (state && !state.alive) {
        this.drawExplosion(position.x, position.y, position.color, 0.22);
        return;
      }
      this.drawMinion(position.x, position.y, model.phaseProgress + position.offset, position.color);
      this.drawWeakpointMarker(position.x + 18, position.y - 16, state?.weakness ?? "tap", position.color, state?.id === model.combatEncounter?.targetId);
      if (state) this.drawMiniHpBar(position.x - 22, position.y + 20, 44, state.hp / state.maxHp, position.color);
    });
    this.drawBoss(260, 276, model.overdrive);
    this.drawWeakpointMarker(224, 250, model.combatEncounter?.boss.weakness ?? "burst", model.overdrive ? PALETTE.yellow : PALETTE.red, model.combatEncounter?.targetId === "boss");
    if (model.combatEncounter) this.drawCounterWarning(model.combatEncounter);
    if (model.combatHitFlash > 0) this.drawHitFlash(this.combatTargetPoint(this.recentCombatTarget(model)), model.combatHitFlash);
    const lockPoint = this.combatTargetPoint(model.combatEncounter?.targetId ?? "boss");
    if (model.targetLock > 0) this.drawTargetReticle(lockPoint.x, lockPoint.y, model.targetLock);
    this.drawMiniHpBar(206, 214, 108, bossHpRatio, model.overdrive ? PALETTE.yellow : PALETTE.red);
    this.drawCenteredText(`裂隙首领 ${Math.ceil(bossHpRatio * 100)}%`, 260, 207, 12, PALETTE.white, "900");
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

  private drawManualAim(x: number, y: number, intensity: number): void {
    const ctx = this.ctx;
    const alpha = Math.max(0, Math.min(1, intensity));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    this.drawLaser(112, 396, x, y, PALETTE.yellow, 6);
    ctx.strokeStyle = PALETTE.yellow;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 22;
    ctx.shadowColor = PALETTE.yellow;
    ctx.beginPath();
    ctx.arc(x, y, 20 + (1 - alpha) * 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 34, y);
    ctx.lineTo(x + 34, y);
    ctx.moveTo(x, y - 34);
    ctx.lineTo(x, y + 34);
    ctx.stroke();
    ctx.restore();
  }

  private drawCombatCounters(model: RenderModel): void {
    const counter = model.combatEvents.find((event) => event.type === "counter");
    if (!counter || counter.type !== "counter") return;
    const color = counter.mitigated ? "#b9ffcf" : PALETTE.red;
    this.drawLaser(260, 276, 112, 394, color, counter.mitigated ? 3 : 5);
    this.drawExplosion(112, 394, color, counter.mitigated ? 0.36 : 0.62);
  }

  private drawCombatDamage(model: RenderModel): void {
    const baseDamage = Math.max(128, Math.floor(model.maxDps * 0.72 + model.fusionCount * 420 + model.maxCombo * 96));
    const fallbackTargets = [
      { x: 260, y: 276 },
      { x: 288, y: 358 },
      { x: 226, y: 418 }
    ];
    for (let index = 0; index < (model.combatDamageTexts.length > 0 ? 2 : 4); index += 1) {
      const t = (model.phaseProgress * 7.2 + index * 0.18) % 1;
      const critical = model.overdrive || index % 3 === 0;
      const damage = baseDamage * (critical ? 12 + index : 1 + index * 0.4);
      const target = fallbackTargets[index % fallbackTargets.length];
      const x = Math.max(56, Math.min(302, target.x + Math.sin(index * 1.8) * 20));
      const y = target.y - 18 - t * 64 + Math.sin(index) * 10;
      this.drawDamageNumber(`-${this.formatMetric(damage)}`, x, y, critical ? 17 : 13, critical ? PALETTE.yellow : PALETTE.purple);
    }
    model.combatDamageTexts.forEach((item) => {
      const alpha = Math.max(0, Math.min(1, item.ttl / 620));
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.drawDamageNumber(item.text, Math.max(52, Math.min(300, item.x)), item.y, item.size, item.color);
      this.ctx.restore();
    });
    if (model.combatEncounter) {
      const aliveMinions = model.combatEncounter.minions.filter((minion) => minion.alive).length;
      this.drawCenteredText(`目标 ${aliveMinions > 0 ? `${aliveMinions} 个护卫` : "首领暴露"}`, 180, 492, 10, "rgba(255,255,255,0.76)", "800");
    }
    this.drawNeonPanel(58, 508, 244, 28, model.overdrive ? PALETTE.yellow : PALETTE.cyan, 7);
    const combo = Math.max(model.maxCombo, model.combatEncounter?.combo ?? 0, model.overdrive ? 56 : 1);
    this.drawCenteredText(`COMBO x${combo}  秒伤 ${this.formatMetric(Math.max(model.maxDps, 973))}`, 180, 527, 14, model.overdrive ? PALETTE.yellow : PALETTE.cyan, "900");
    if (model.combatFocus > 0) this.drawCenteredText("集火中", 248, 228, 14, PALETTE.yellow, "900");
    if (model.combatShield > 0) this.drawCenteredText("护盾稳态", 108, 254, 12, "#b9ffcf", "900");
  }

  private drawCombatControls(model: RenderModel): void {
    const rects = getCombatRects();
    this.drawNeonPanel(rects.commandBar.x, rects.commandBar.y, rects.commandBar.w, rects.commandBar.h, PALETTE.purple, 8);
    const energyRatio = Math.max(0, Math.min(1, model.combatEnergy / 100));
    const counterPressure = model.combatEncounter
      ? 1 - Math.max(0, Math.min(1, model.combatEncounter.nextCounterMs / model.combatEncounter.counterIntervalMs))
      : 0;
    if (counterPressure > 0.62) {
      this.drawCommandAlert(rects.shieldButton.x, rects.shieldButton.y, rects.shieldButton.w, rects.shieldButton.h, counterPressure);
    }
    this.drawCombatSkillButton("combatAim", rects.aimButton.x, rects.aimButton.y, rects.aimButton.w, rects.aimButton.h, "锁定", "10能量", PALETTE.cyan, model.combatEnergy >= 10, energyRatio);
    this.drawCombatSkillButton("combatBurst", rects.burstButton.x, rects.burstButton.y, rects.burstButton.w, rects.burstButton.h, "集火", "42能量", PALETTE.yellow, model.combatEnergy >= 42, energyRatio);
    this.drawCombatSkillButton("combatShield", rects.shieldButton.x, rects.shieldButton.y, rects.shieldButton.w, rects.shieldButton.h, "护盾", "28能量", "#b9ffcf", model.combatEnergy >= 28, energyRatio);
  }

  private drawCommandAlert(x: number, y: number, w: number, h: number, pressure: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.22 + pressure * 0.28;
    ctx.shadowBlur = 20;
    ctx.shadowColor = PALETTE.red;
    ctx.strokeStyle = PALETTE.red;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x - 3, y - 3, w + 6, h + 6, 10);
    ctx.stroke();
    ctx.restore();
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
    enabled: boolean,
    chargeRatio = 1
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
    ctx.fillStyle = color;
    ctx.globalAlpha = enabled ? 0.72 : 0.32;
    ctx.fillRect(x + 5, y + h - 6, (w - 10) * Math.max(0, Math.min(1, chargeRatio)), 3);
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

  private combatTargetPoint(targetId?: string | null): { x: number; y: number } {
    return {
      boss: { x: 260, y: 276 },
      "minion-1": { x: 288, y: 358 },
      "minion-2": { x: 226, y: 418 },
      "minion-3": { x: 306, y: 442 }
    }[targetId ?? "boss"] ?? { x: 260, y: 276 };
  }

  private recentCombatTarget(model: RenderModel): string {
    const hit = model.combatEvents.find((event) => event.type === "hit" || event.type === "death");
    if (hit?.type === "hit" || hit?.type === "death") return hit.targetId;
    return model.combatEncounter?.targetId ?? "boss";
  }

  private drawMiniHpBar(x: number, y: number, width: number, ratio: number, color: string): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.58)";
    ctx.fillRect(x, y, width, 5);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * Math.max(0, Math.min(1, ratio)), 5);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.strokeRect(x, y, width, 5);
    ctx.restore();
  }

  private drawHitFlash(point: { x: number; y: number }, intensity: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.max(0, Math.min(1, intensity));
    ctx.strokeStyle = PALETTE.yellow;
    ctx.lineWidth = 5;
    ctx.shadowBlur = 24;
    ctx.shadowColor = PALETTE.yellow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 34 + (1 - intensity) * 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawWeakpointMarker(
    x: number,
    y: number,
    weakness: "tap" | "aim" | "burst",
    color: string,
    active = false
  ): void {
    const ctx = this.ctx;
    const label = weakness === "tap" ? "点" : weakness === "aim" ? "锁" : "爆";
    ctx.save();
    ctx.shadowBlur = active ? 18 : 10;
    ctx.shadowColor = active ? PALETTE.yellow : color;
    ctx.fillStyle = active ? "rgba(255,227,41,0.9)" : "rgba(7,8,22,0.88)";
    ctx.strokeStyle = active ? PALETTE.yellow : color;
    ctx.lineWidth = active ? 3 : 2;
    ctx.beginPath();
    ctx.arc(x, y, active ? 13 : 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    this.drawCenteredText(label, x, y + 4, active ? 10 : 8, active ? "#141009" : PALETTE.white, "900");
  }

  private drawCounterWarning(encounter: EncounterSnapshot): void {
    const ratio = 1 - Math.max(0, Math.min(1, encounter.nextCounterMs / encounter.counterIntervalMs));
    if (ratio < 0.36) return;
    const ctx = this.ctx;
    const color = ratio > 0.72 ? PALETTE.red : PALETTE.orange;
    ctx.save();
    ctx.globalAlpha = 0.22 + ratio * 0.48;
    ctx.strokeStyle = color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(260, 276, 64, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
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

  private drawAssemblyGuide(model: RenderModel): void {
    if (model.inventory.length === 0) return;
    const openSlot = SLOT_ORDER.find((slotId) => !model.equipped[slotId]);
    if (!openSlot) return;
    const from = this.inventoryPosition(0);
    const to = SLOT_POSITIONS[openSlot];
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.62 + Math.sin(model.phaseProgress * Math.PI * 10) * 0.14;
    this.drawLaser(from.x + 8, from.y - 18, to.x, to.y, PALETTE.cyan, 3);
    ctx.fillStyle = PALETTE.cyan;
    ctx.shadowBlur = 16;
    ctx.shadowColor = PALETTE.cyan;
    ctx.beginPath();
    ctx.arc(to.x, to.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
    this.drawCenteredText(text, 180, y, 12, PALETTE.white, "900");
  }

  private drawFloatingTexts(model: RenderModel): void {
    model.floatingTexts.slice(-1).forEach((message, index) => {
      const alpha = Math.min(1, message.ttl / 600);
      this.ctx.globalAlpha = alpha;
      this.drawNeonPanel(34, 84 + index * 20, 292, 16, message.color, 4);
      this.drawCenteredText(message.text, 180, 96 + index * 20, 9, PALETTE.white, "800");
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
