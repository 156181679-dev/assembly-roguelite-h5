import { BALANCE, createInitialRunState, FUSION_RULES, PART_DEFS, SLOT_ORDER } from "./data";
import type { EquippedItem, GamePhase, MuseumRecord, PartDef, RunState, SlotId } from "./types";
import { CanvasRenderer, type ButtonId, type RenderModel } from "./render/CanvasRenderer";
import { createEquippedPart, createEquippedWeapon, simulateCombat } from "./systems/CombatSystem";
import { fuseParts } from "./systems/FusionSystem";
import { drawLootRewards } from "./systems/LootSystem";
import { MuseumSystem } from "./systems/MuseumSystem";

interface DragState {
  item: EquippedItem;
  source: "inventory" | "slot";
  sourceSlot?: SlotId;
  x: number;
  y: number;
}

interface FloatingText {
  text: string;
  ttl: number;
  color: string;
}

interface Projectile {
  angle: number;
  radius: number;
  color: string;
  icon: string;
  speed: number;
}

const PHASE_DURATION: Record<GamePhase, number> = {
  loot: 5_000,
  assembly: 12_000,
  fusion: 9_000,
  combat: BALANCE.combatDurationMs,
  result: 999_000,
  museum: 999_000
};

const getCanvasPoint = (event: PointerEvent, canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 360,
    y: ((event.clientY - rect.top) / rect.height) * 640
  };
};

export class GameApp {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: CanvasRenderer;
  private readonly museum = new MuseumSystem();
  private run: RunState = createInitialRunState();
  private phaseElapsed = 0;
  private lastFrame = 0;
  private lootRewards: PartDef[] = [];
  private drag?: DragState;
  private floatingTexts: FloatingText[] = [];
  private projectiles: Projectile[] = [];
  private overdrive = false;
  private shareImageDataUrl = "";
  private animationHandle = 0;
  private tutorial = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new CanvasRenderer(canvas);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    document.addEventListener("visibilitychange", () => {
      this.lastFrame = performance.now();
    });
  }

  start(): void {
    this.newRun();
    this.lastFrame = performance.now();
    this.animationHandle = requestAnimationFrame(this.tick);
  }

  stop(): void {
    cancelAnimationFrame(this.animationHandle);
  }

  private newRun(): void {
    this.run = createInitialRunState();
    this.phaseElapsed = 0;
    this.overdrive = false;
    this.shareImageDataUrl = "";
    this.projectiles = [];
    this.floatingTexts = [{ text: "点击轮盘，抽出你的第一批怪零件", ttl: 2600, color: "#ffffff" }];
    this.enterLoot();
  }

  private enterPhase(phase: GamePhase): void {
    this.run.phase = phase;
    this.phaseElapsed = 0;
  }

  private enterLoot(): void {
    this.enterPhase("loot");
    this.lootRewards = drawLootRewards({
      round: this.run.round,
      parts: PART_DEFS,
      ownedPartIds: this.run.ownedPartIds
    });
  }

  private claimLoot(): void {
    if (this.run.phase !== "loot") return;
    for (const part of this.lootRewards) {
      if (part.category === "catalyst") {
        this.floatingTexts.push({ text: "融合催化剂已装填：本轮会强制融合", ttl: 1600, color: "#fff6a3" });
        continue;
      }
      if (!this.run.ownedPartIds.includes(part.id)) {
        this.run.ownedPartIds.push(part.id);
        this.run.inventory.push(createEquippedPart(part, "body"));
      }
    }
    this.floatingTexts.push({ text: `第 ${this.run.round} 轮零件入库，拖到骨架上`, ttl: 1500, color: "#b9ffcf" });
    this.enterPhase("assembly");
  }

  private advanceFromAssembly(): void {
    this.autoEquipIfEmpty();
    this.enterPhase("fusion");
    this.floatingTexts.push({ text: "把两个已装零件拖到一起，任意组合都能融合", ttl: 1800, color: "#ffffff" });
  }

  private advanceFromFusion(): void {
    const equipped = Object.values(this.run.equipped).filter(Boolean) as EquippedItem[];
    if (this.run.round >= 2 && this.run.fusionCount === 0 && equipped.length >= 2) {
      this.performFusion(equipped[0], equipped[1]);
    }

    if (this.run.round >= BALANCE.roundsPerRun) {
      this.enterCombat();
      return;
    }

    this.run.round += 1;
    this.enterLoot();
  }

  private enterCombat(): void {
    this.autoEquipIfEmpty();
    this.enterPhase("combat");
    this.projectiles = this.createProjectiles();
    this.floatingTexts.push({ text: "战斗开始：所有零件自动开火", ttl: 1500, color: "#fff" });
  }

  private finishCombat(): void {
    const equipped = Object.values(this.run.equipped).filter(Boolean) as EquippedItem[];
    const summary = simulateCombat(equipped);
    this.run.result = summary.result;
    this.run.maxCombo = summary.maxCombo;
    this.run.maxDps = summary.maxDps;
    this.overdrive = summary.overdriveTriggered;
    this.enterPhase("result");
    this.shareImageDataUrl = this.renderer.createShareCard(this.renderModel());
    this.museum.save(this.createMuseumRecord());
  }

  private createMuseumRecord(): MuseumRecord {
    const equipped = Object.values(this.run.equipped).filter(Boolean) as EquippedItem[];
    const bestWeapon = equipped.find((item) => item.fused) ?? equipped[0];
    return {
      id: `run-${Date.now()}`,
      timestamp: Date.now(),
      weaponName: bestWeapon?.name ?? "未命名拼装物",
      parts: equipped.flatMap((item) => item.sourcePartIds),
      fusedWeapons: this.run.fusedWeapons.map((item) => item.name),
      maxDps: this.run.maxDps,
      maxCombo: this.run.maxCombo,
      fusionCount: this.run.fusionCount,
      result: this.run.result ?? "death",
      shareImageDataUrl: this.shareImageDataUrl
    };
  }

  private autoEquipIfEmpty(): void {
    for (const slot of SLOT_ORDER) {
      if (!this.run.equipped[slot]) {
        const next = this.run.inventory.shift();
        if (next) {
          this.run.equipped[slot] = { ...next, slotId: slot };
        }
      }
    }
  }

  private createProjectiles(): Projectile[] {
    const equipped = Object.values(this.run.equipped).filter(Boolean) as EquippedItem[];
    return equipped.flatMap((item, index) => {
      const count = item.fused ? 4 : 2;
      return Array.from({ length: count }, (_, offset) => ({
        angle: (Math.PI * 2 * (index + offset / count)) / Math.max(equipped.length, 1),
        radius: 32 + offset * 16,
        color: item.color,
        icon: item.icon,
        speed: item.fused ? 2.2 : 1.35
      }));
    });
  }

  private tick = (now: number): void => {
    const dt = Math.min(now - this.lastFrame, 80);
    this.lastFrame = now;
    this.phaseElapsed += dt;
    this.update(dt);
    this.renderer.render(this.renderModel());
    this.animationHandle = requestAnimationFrame(this.tick);
  };

  private update(dt: number): void {
    this.floatingTexts = this.floatingTexts
      .map((text) => ({ ...text, ttl: text.ttl - dt }))
      .filter((text) => text.ttl > 0);

    if (this.run.phase === "combat") {
      this.projectiles = this.projectiles.map((projectile) => ({
        ...projectile,
        angle: projectile.angle + (dt / 1000) * projectile.speed,
        radius: 30 + ((projectile.radius + dt * 0.12) % 150)
      }));

      const progress = this.phaseElapsed / PHASE_DURATION.combat;
      this.run.maxCombo = Math.max(this.run.maxCombo, Math.floor(progress * 48));
      this.run.maxDps = Math.max(this.run.maxDps, Math.floor(1200 * progress * progress + this.run.fusionCount * 300));
      if (!this.overdrive && (this.phaseElapsed > 18_000 || this.run.maxCombo >= 12)) {
        this.overdrive = true;
        this.floatingTexts.push({ text: "超载！所有零件频率翻倍", ttl: 1300, color: "#ffef6e" });
      }
    }

    if (this.phaseElapsed > PHASE_DURATION[this.run.phase]) {
      if (this.run.phase === "loot") this.claimLoot();
      else if (this.run.phase === "assembly") this.advanceFromAssembly();
      else if (this.run.phase === "fusion") this.advanceFromFusion();
      else if (this.run.phase === "combat") this.finishCombat();
    }
  }

  private renderModel(): RenderModel {
    return {
      phase: this.run.phase,
      round: this.run.round,
      phaseProgress: Math.min(this.phaseElapsed / PHASE_DURATION[this.run.phase], 1),
      rewards: this.lootRewards,
      inventory: this.run.inventory,
      equipped: this.run.equipped,
      fusedWeapons: this.run.fusedWeapons,
      drag: this.drag,
      floatingTexts: this.floatingTexts,
      projectiles: this.projectiles,
      overdrive: this.overdrive,
      maxCombo: this.run.maxCombo,
      maxDps: this.run.maxDps,
      fusionCount: this.run.fusionCount,
      result: this.run.result,
      museumRecords: this.museum.list(),
      shareImageDataUrl: this.shareImageDataUrl,
      tutorial: this.tutorial
    };
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.canvas.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event, this.canvas);
    const button = this.renderer.hitTestButton(point.x, point.y);
    if (button) {
      this.handleButton(button);
      return;
    }

    if (this.run.phase === "loot") {
      this.claimLoot();
      return;
    }

    if (this.run.phase !== "assembly" && this.run.phase !== "fusion") {
      return;
    }

    const inventoryHit = this.renderer.hitTestInventory(point.x, point.y, this.run.inventory);
    if (inventoryHit) {
      this.drag = { item: inventoryHit, source: "inventory", x: point.x, y: point.y };
      this.run.inventory = this.run.inventory.filter((item) => item.uid !== inventoryHit.uid);
      return;
    }

    const slotHit = this.renderer.hitTestSlot(point.x, point.y, this.run.equipped);
    if (slotHit) {
      this.drag = { item: slotHit.item, source: "slot", sourceSlot: slotHit.slotId, x: point.x, y: point.y };
      delete this.run.equipped[slotHit.slotId];
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.drag) return;
    const point = getCanvasPoint(event, this.canvas);
    this.drag = { ...this.drag, x: point.x, y: point.y };
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.drag) return;
    const point = getCanvasPoint(event, this.canvas);
    const dragging = this.drag;
    this.drag = undefined;

    if (this.run.phase === "fusion") {
      const fusionTarget = this.renderer.hitTestSlot(point.x, point.y, this.run.equipped);
      if (fusionTarget && fusionTarget.item.uid !== dragging.item.uid) {
        this.performFusion(dragging.item, fusionTarget.item, fusionTarget.slotId);
        return;
      }
    }

    const slotId = this.renderer.nearestSlot(point.x, point.y);
    if (slotId) {
      const replaced = this.run.equipped[slotId];
      if (replaced) this.run.inventory.push({ ...replaced, slotId: "body" });
      this.run.equipped[slotId] = { ...dragging.item, slotId };
      this.floatingTexts.push({ text: `${dragging.item.name} 咔哒装上 ${this.slotName(slotId)}`, ttl: 900, color: "#afffc5" });
      navigator.vibrate?.(50);
      return;
    }

    if (dragging.source === "slot" && dragging.sourceSlot) {
      this.run.equipped[dragging.sourceSlot] = { ...dragging.item, slotId: dragging.sourceSlot };
    } else {
      this.run.inventory.push({ ...dragging.item, slotId: "body" });
    }
  };

  private performFusion(a: EquippedItem, b: EquippedItem, targetSlot = b.slotId): void {
    const sourceA = PART_DEFS.find((part) => part.id === a.sourcePartIds[0]);
    const sourceB = PART_DEFS.find((part) => part.id === b.sourcePartIds[0]);
    if (!sourceA || !sourceB) {
      return;
    }

    const result = fuseParts(sourceA, sourceB, FUSION_RULES);
    for (const slot of SLOT_ORDER) {
      if (this.run.equipped[slot]?.uid === a.uid || this.run.equipped[slot]?.uid === b.uid) {
        delete this.run.equipped[slot];
      }
    }

    const weapon = createEquippedWeapon(result.weapon, targetSlot, [...a.sourcePartIds, ...b.sourcePartIds]);
    this.run.equipped[targetSlot] = weapon;
    this.run.fusedWeapons.push(weapon);
    this.run.fusionCount += 1;
    this.floatingTexts.push({ text: result.formulaText, ttl: 1800, color: result.weapon.color });
    navigator.vibrate?.([40, 40, 70]);
  }

  private handleButton(button: ButtonId): void {
    if (button === "continue") {
      if (this.run.phase === "assembly") this.advanceFromAssembly();
      else if (this.run.phase === "fusion") this.advanceFromFusion();
      return;
    }
    if (button === "restart") {
      this.tutorial = false;
      this.newRun();
      return;
    }
    if (button === "museum") {
      this.enterPhase("museum");
      return;
    }
    if (button === "result") {
      this.enterPhase("result");
    }
  }

  private slotName(slotId: SlotId): string {
    return {
      head: "头部",
      body: "躯干",
      left_hand: "左手",
      right_hand: "右手",
      back: "背部",
      feet: "脚部"
    }[slotId];
  }
}
