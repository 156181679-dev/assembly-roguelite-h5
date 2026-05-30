import { SLOT_ORDER } from "../data";
import type { EquippedItem, GamePhase, MuseumRecord, PartDef, SlotId } from "../types";

export type ButtonId = "continue" | "restart" | "museum" | "result";

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

const SLOT_POSITIONS: Record<SlotId, { x: number; y: number; label: string }> = {
  head: { x: 180, y: 150, label: "头" },
  body: { x: 180, y: 244, label: "身" },
  left_hand: { x: 92, y: 258, label: "左" },
  right_hand: { x: 268, y: 258, label: "右" },
  back: { x: 216, y: 335, label: "背" },
  feet: { x: 180, y: 446, label: "脚" }
};

const button = (id: ButtonId, x: number, y: number, w: number, h: number): Rect => ({ id, x, y, w, h });

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private buttons: Rect[] = [];

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context is unavailable");
    }
    this.canvas = canvas;
    this.ctx = ctx;
  }

  render(model: RenderModel): void {
    this.resize();
    this.buttons = [];

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.canvas.width / WIDTH, this.canvas.height / HEIGHT);
    this.drawBackground(model);
    this.drawTopBrand(model);

    if (model.phase === "loot") this.drawLoot(model);
    if (model.phase === "assembly" || model.phase === "fusion") this.drawAssembly(model);
    if (model.phase === "combat") this.drawCombat(model);
    if (model.phase === "result") this.drawResult(model);
    if (model.phase === "museum") this.drawMuseum(model);

    this.drawBottomTabs(model.phase);
    this.drawFloatingTexts(model);
    if (model.drag) this.drawItem(model.drag.item, model.drag.x, model.drag.y, 32, true);
    ctx.restore();
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

    const equipped = Object.values(model.equipped).filter(Boolean) as EquippedItem[];
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
    this.drawCenteredText("1. 轮盘开箱", 180, 133, 23, PALETTE.white, "900");
    const cx = 180;
    const cy = 306;
    const radius = 128;
    for (let i = 0; i < 8; i += 1) {
      const start = -Math.PI / 2 + (Math.PI * 2 * i) / 8 + model.phaseProgress * 10;
      const end = start + Math.PI / 4;
      const reward = model.rewards[i % Math.max(model.rewards.length, 1)];
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.arc(cx, cy, radius, start, end);
      this.ctx.closePath();
      this.ctx.fillStyle = i % 2 === 0 ? "rgba(255, 43, 214, 0.42)" : "rgba(18, 244, 255, 0.32)";
      this.ctx.fill();
      this.ctx.strokeStyle = "rgba(255,255,255,0.48)";
      this.ctx.stroke();
      if (reward) {
        const mid = (start + end) / 2;
        this.drawPartIcon(reward, cx + Math.cos(mid) * 82, cy + Math.sin(mid) * 82, 25);
        this.drawCenteredText(reward.rarity.toUpperCase(), cx + Math.cos(mid) * 112, cy + Math.sin(mid) * 112 + 4, 10, PALETTE.yellow, "900");
      }
    }
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    this.ctx.fillStyle = "#0d0b20";
    this.ctx.fill();
    this.drawCenteredText("SSR", cx, cy - 4, 19, PALETTE.yellow, "900");
    this.drawCenteredText("STOP", cx, cy + 17, 11, PALETTE.white, "900");
    this.drawPointer(cx, cy - radius - 18);
    this.drawButton("continue", 101, 492, 158, 42, "转动轮盘");
    this.drawPrimaryHint("点击任意处停轮盘，爆出 3 个零件", 474);
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
    }
    this.drawPrimaryHint(model.phase === "assembly" ? "把零件拖到发光插槽" : "拖已装零件互撞，强制生成神兵", 515);
    this.drawButton("continue", 226, 574, 110, 38, model.phase === "assembly" ? "去融合" : "开战");
  }

  private drawCombat(model: RenderModel): void {
    this.drawNeonPanel(14, 96, 332, 460, model.overdrive ? PALETTE.yellow : PALETTE.purple, 12);
    this.drawCenteredText("4. 自动战斗", 180, 130, 23, PALETTE.white, "900");
    this.drawBattlefield(model);
    this.drawMechaSkeleton(model, true);
    for (const projectile of model.projectiles) {
      const x = 180 + Math.cos(projectile.angle) * projectile.radius;
      const y = 320 + Math.sin(projectile.angle) * projectile.radius * 0.74;
      this.drawLaser(180, 304, x, y, projectile.color, model.overdrive ? 6 : 3);
      this.drawBadge(projectile.icon, x, y, 15, projectile.color);
    }
    this.drawDamageNumber("-9.99E+08", 258, 222, 20, PALETTE.yellow);
    this.drawDamageNumber("-1.56E+06", 270, 259, 16, PALETTE.purple);
    this.drawDamageNumber("-7.88E+07", 262, 300, 16, PALETTE.red);
    this.drawCenteredText(`COMBO x${Math.max(model.maxCombo, model.overdrive ? 999 : 0)}!`, 236, 382, 18, PALETTE.yellow, "900");
    this.drawCenteredText(`秒伤 ${model.maxDps.toLocaleString()}`, 180, 513, 21, PALETTE.cyan, "900");
    if (model.overdrive) this.drawCenteredText("超载模式", 180, 173, 34, PALETTE.yellow, "900");
  }

  private drawResult(model: RenderModel): void {
    const equipped = Object.values(model.equipped).filter(Boolean) as EquippedItem[];
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
    const ctx = this.ctx;
    const equipped = Object.values(model.equipped).filter(Boolean) as EquippedItem[];
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
      if (item) this.drawItem(item, pos.x, pos.y, 24);
      else this.drawCenteredText(pos.label, pos.x, pos.y + 5, 14, "rgba(255,255,255,0.65)", "900");
    }
  }

  private drawInventory(inventory: EquippedItem[]): void {
    this.drawText("零件栏", 30, 476, 15, PALETTE.white, "900");
    if (inventory.length === 0) {
      this.drawCenteredText("库存空了，拖已装零件继续调整", 180, 489, 12, "rgba(255,255,255,0.56)", "700");
      return;
    }
    inventory.slice(0, 6).forEach((item, index) => {
      const pos = this.inventoryPosition(index);
      this.drawNeonPanel(pos.x - 24, pos.y - 24, 48, 48, item.color, 6);
      this.drawItem(item, pos.x, pos.y, 20);
    });
  }

  private drawFusionFormula(model: RenderModel): void {
    const equipped = Object.values(model.equipped).filter(Boolean) as EquippedItem[];
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
    this.ctx.save();
    this.ctx.shadowBlur = overdrive ? 26 : 14;
    this.ctx.shadowColor = overdrive ? PALETTE.yellow : PALETTE.purple;
    this.ctx.fillStyle = overdrive ? PALETTE.red : "#5b1b9d";
    this.ctx.beginPath();
    this.ctx.roundRect(x - 58, y - 30, 116, 60, 16);
    this.ctx.fill();
    this.ctx.strokeStyle = PALETTE.white;
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    this.drawCenteredText("BOSS", x, y + 8, 24, PALETTE.white, "900");
    this.ctx.restore();
  }

  private drawShareCardPreview(model: RenderModel, best?: EquippedItem): void {
    this.drawNeonPanel(48, 162, 264, 330, best?.color ?? PALETTE.purple, 10);
    this.drawCenteredText("分享卡", 180, 194, 18, PALETTE.cyan, "900");
    this.drawMechaPortrait(best, 180, 295, 1);
    this.drawCenteredText(best?.name ?? "未命名拼装物", 180, 416, 23, PALETTE.yellow, "900");
    this.drawCenteredText(`战力 ${Math.max(model.maxDps, 999999).toExponential(2)}`, 180, 446, 15, PALETTE.white, "900");
    this.drawCenteredText(`Combo x${model.maxCombo || 47} · 融合 ${model.fusionCount} 次`, 180, 470, 13, PALETTE.cyan, "800");
  }

  private drawBottomTabs(active: GamePhase): void {
    const labels: Array<[GamePhase, string, string]> = [
      ["loot", "拼装", "拼"],
      ["assembly", "融合", "融"],
      ["fusion", "战斗", "战"],
      ["museum", "商店", "馆"]
    ];
    labels.forEach(([phase, label, icon], index) => {
      const x = 24 + index * 78;
      const isActive = active === phase || (active === "result" && phase === "museum");
      this.drawNeonPanel(x, 604, 56, 30, isActive ? PALETTE.yellow : PALETTE.purple, 4);
      this.drawCenteredText(icon, x + 28, 619, 13, isActive ? "#11131a" : PALETTE.white, "900");
      this.drawCenteredText(label, x + 28, 631, 8, isActive ? "#11131a" : "rgba(255,255,255,0.76)", "800");
    });
  }

  private inventoryPosition(index: number): { x: number; y: number } {
    return { x: 48 + index * 52, y: 545 };
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
    if (item.fused || glow) {
      this.ctx.save();
      this.ctx.shadowBlur = 28;
      this.ctx.shadowColor = item.color;
      this.drawWeaponShape(item.icon, x, y, radius, item.color);
      this.ctx.restore();
      return;
    }
    this.drawBadge(item.icon, x, y, radius, item.color);
  }

  private drawPartIcon(part: PartDef, x: number, y: number, radius: number): void {
    this.drawBadge(part.icon, x, y, radius, part.color);
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
    this.drawWeaponShape(item?.icon ?? "神兵", -58, -4, 38, item?.color ?? PALETTE.purple);
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
    return {
      loot: "轮盘开箱",
      assembly: "超级拼装",
      fusion: "随意融合",
      combat: "自动战斗",
      result: "分享卡",
      museum: "博物馆"
    }[phase];
  }

  private distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.hypot(x1 - x2, y1 - y2);
  }
}
