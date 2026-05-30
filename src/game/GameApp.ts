import { BALANCE, createInitialRunState, FUSION_RULES, PART_DEFS, SLOT_ORDER } from "./data";
import type { EquippedItem, GamePhase, MuseumRecord, PartDef, RunState, SlotId } from "./types";
import { CanvasRenderer, type ButtonId, type RenderModel } from "./render/CanvasRenderer";
import { createEquippedPart, createEquippedWeapon, estimateBuildPower, simulateCombat } from "./systems/CombatSystem";
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
  sourcePartId: string;
  weaponId?: string;
  fused: boolean;
  speed: number;
}

const PHASE_DURATION: Record<GamePhase, number> = {
  launch: 999_000,
  home: 999_000,
  loot: 5_000,
  lootResult: 999_000,
  assembly: 12_000,
  fusion: 9_000,
  fusionSuccess: 999_000,
  combat: BALANCE.combatDurationMs,
  result: 999_000,
  museum: 999_000,
  weaponDetail: 999_000,
  graveyard: 999_000,
  graveStart: 999_000,
  share: 999_000,
  shop: 999_000,
  missions: 999_000,
  achievements: 999_000,
  settings: 999_000,
  tutorial: 999_000
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
    this.enterPhase("launch");
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
    this.floatingTexts = [];
    this.enterPhase("home");
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
    this.floatingTexts.push({ text: "点击补给机抽取本轮零件", ttl: 1500, color: "#ffffff" });
  }

  private startAdventure(): void {
    this.run = createInitialRunState();
    this.phaseElapsed = 0;
    this.overdrive = false;
    this.shareImageDataUrl = "";
    this.projectiles = [];
    this.floatingTexts = [];
    this.enterLoot();
  }

  private showLootResult(): void {
    if (this.run.phase !== "loot") return;
    this.enterPhase("lootResult");
  }

  private claimLoot(): void {
    if (this.run.phase !== "lootResult") return;
    this.floatingTexts = [];
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
    this.enterPhase("assembly");
  }

  private advanceFromAssembly(): void {
    if (!this.hasEquippedItems()) {
      this.floatingTexts.push({ text: "先拖拽零件或点击一键装配", ttl: 1200, color: "#ffffff" });
      return;
    }
    this.enterPhase("fusion");
    this.floatingTexts.push({ text: "把两个已装零件拖到一起，任意组合都能融合", ttl: 1800, color: "#ffffff" });
  }

  private advanceFromFusion(): void {
    if (this.run.phase === "fusion") {
      this.fuseBestAvailablePair(false);
    }
    if (!this.hasEquippedItems()) {
      this.floatingTexts.push({ text: "没有装备，无法进入战斗", ttl: 1200, color: "#ffffff" });
      return;
    }

    if (this.run.round >= BALANCE.roundsPerRun) {
      this.enterCombat();
      return;
    }

    this.run.round += 1;
    this.enterLoot();
  }

  private enterCombat(): void {
    this.enterPhase("combat");
    this.projectiles = this.createProjectiles();
    this.floatingTexts = [];
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
      shareImageDataUrl: ""
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

  private hasEquippedItems(): boolean {
    return Object.values(this.run.equipped).some(Boolean);
  }

  private createProjectiles(): Projectile[] {
    const equipped = Object.values(this.run.equipped).filter(Boolean) as EquippedItem[];
    return equipped.flatMap((item, index) => {
      const count = item.fused ? 2 : 1;
      return Array.from({ length: count }, (_, offset) => ({
        angle: (Math.PI * 2 * (index + offset / count)) / Math.max(equipped.length, 1),
        radius: 32 + offset * 16,
        color: item.color,
        icon: item.icon,
        sourcePartId: item.sourcePartIds[0],
        weaponId: item.weaponId,
        fused: item.fused,
        speed: item.fused ? 2.2 : 1.35
      }));
    }).slice(0, 8);
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
      const equippedCount = Object.values(this.run.equipped).filter(Boolean).length;
      const comboCeiling = 8 + equippedCount * 5 + this.run.fusionCount * 7;
      const liveDps = this.estimateLiveDps();
      this.run.maxCombo = Math.max(this.run.maxCombo, Math.floor(progress * comboCeiling));
      this.run.maxDps = Math.max(this.run.maxDps, Math.floor(liveDps * (0.72 + progress * 1.45) * (this.overdrive ? 1.8 : 1)));
      if (!this.overdrive && (this.phaseElapsed > 18_000 || this.run.maxCombo >= 18)) {
        this.overdrive = true;
        this.floatingTexts.push({ text: "超载！所有零件频率翻倍", ttl: 1300, color: "#ffef6e" });
      }
    }

    if (this.phaseElapsed > PHASE_DURATION[this.run.phase] && this.run.phase === "combat") {
      this.finishCombat();
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
      this.showLootResult();
      return;
    }

    if (this.run.phase === "lootResult") {
      this.claimLoot();
      return;
    }

    if (this.run.phase === "combat") {
      this.manualStrike(point);
      return;
    }

    if (this.run.phase === "fusionSuccess") {
      this.advanceFromFusion();
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
    this.enterPhase("fusionSuccess");
    navigator.vibrate?.([40, 40, 70]);
  }

  private fuseBestAvailablePair(showFailure = true): boolean {
    const equipped = Object.values(this.run.equipped).filter(Boolean) as EquippedItem[];
    const candidates = equipped.filter((item) => !item.fused);
    if (candidates.length < 2) {
      if (showFailure) {
        this.floatingTexts.push({ text: "至少装上两个未融合零件才能合成", ttl: 1100, color: "#ffffff" });
      }
      return false;
    }

    let best: { a: EquippedItem; b: EquippedItem; score: number } | undefined;
    for (let left = 0; left < candidates.length - 1; left += 1) {
      for (let right = left + 1; right < candidates.length; right += 1) {
        const partA = PART_DEFS.find((part) => part.id === candidates[left].sourcePartIds[0]);
        const partB = PART_DEFS.find((part) => part.id === candidates[right].sourcePartIds[0]);
        if (!partA || !partB) continue;
        const result = fuseParts(partA, partB, FUSION_RULES);
        const typeScore = result.ruleType === "exact" ? 300 : result.ruleType === "tag" ? 200 : 100;
        const score = typeScore + result.weapon.trigger.damage + result.weapon.effects.length * 8;
        if (!best || score > best.score) {
          best = { a: candidates[left], b: candidates[right], score };
        }
      }
    }

    if (!best) {
      if (showFailure) {
        this.floatingTexts.push({ text: "当前零件无法合成，换一组试试", ttl: 1100, color: "#ffffff" });
      }
      return false;
    }

    this.performFusion(best.a, best.b);
    return true;
  }

  private handleButton(button: ButtonId): void {
    if (button === "start") {
      if (this.run.phase === "launch") this.enterPhase("home");
      else this.startAdventure();
      return;
    }
    if (button === "backHome") {
      this.enterPhase("home");
      return;
    }
    if (button === "shop") {
      this.enterPhase("shop");
      return;
    }
    if (button === "missions") {
      this.enterPhase("missions");
      return;
    }
    if (button === "achievements") {
      this.enterPhase("achievements");
      return;
    }
    if (button === "settings") {
      this.enterPhase("settings");
      return;
    }
    if (button === "graveStart") {
      this.enterPhase("graveStart");
      return;
    }
    if (button === "weaponDetail") {
      this.enterPhase("weaponDetail");
      return;
    }
    if (button === "tutorial") {
      this.enterPhase("tutorial");
      return;
    }
    if (button === "tabAssembly") {
      if (this.run.phase === "loot") this.showLootResult();
      else if (this.run.phase === "lootResult") this.claimLoot();
      else if (this.run.inventory.length > 0 || this.hasEquippedItems()) this.enterPhase("assembly");
      else this.startAdventure();
      return;
    }
    if (button === "tabFusion") {
      if (!this.hasEquippedItems()) {
        this.floatingTexts.push({ text: "先拼装至少一个零件", ttl: 1100, color: "#ffffff" });
        return;
      }
      this.enterPhase("fusion");
      return;
    }
    if (button === "tabCombat") {
      if (!this.hasEquippedItems()) {
        this.floatingTexts.push({ text: "没有装备，无法进入战斗", ttl: 1100, color: "#ffffff" });
        return;
      }
      this.enterCombat();
      return;
    }
    if (button === "tabMuseum") {
      this.enterPhase("museum");
      return;
    }
    if (button === "autoEquip") {
      if (this.run.inventory.length === 0) {
        this.floatingTexts.push({ text: "零件栏已空，拖已装零件可继续调整", ttl: 1100, color: "#ffffff" });
        return;
      }
      this.autoEquipIfEmpty();
      this.floatingTexts.push({ text: "已把库存零件装入空槽", ttl: 1100, color: "#b9ffcf" });
      return;
    }
    if (button === "fuse") {
      this.fuseBestAvailablePair();
      return;
    }
    if (button === "continue") {
      if (this.run.phase === "assembly") this.advanceFromAssembly();
      else if (this.run.phase === "fusion") this.advanceFromFusion();
      else if (this.run.phase === "fusionSuccess") this.advanceFromFusion();
      else if (this.run.phase === "loot") this.showLootResult();
      else if (this.run.phase === "lootResult") this.claimLoot();
      else if (this.run.phase === "launch") this.enterPhase("home");
      else if (this.run.phase === "graveStart") this.startAdventure();
      else if (this.run.phase === "tutorial") this.showLootResult();
      else if (this.run.phase === "combat") this.finishCombat();
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
    if (button === "share") {
      this.enterPhase("share");
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

  private manualStrike(point: { x: number; y: number }): void {
    const equippedCount = Object.values(this.run.equipped).filter(Boolean).length;
    if (equippedCount === 0) return;
    const hitEnemySide = point.x > 190 && point.y > 170 && point.y < 500;
    const comboGain = hitEnemySide ? 2 + this.run.fusionCount : 1;
    const dpsGain = (hitEnemySide ? 180 : 70) * equippedCount * (1 + this.run.fusionCount * 0.45);
    this.run.maxCombo += comboGain;
    this.run.maxDps += Math.round(dpsGain);
    if (hitEnemySide && this.run.maxCombo >= 10) {
      this.overdrive = true;
    }
    navigator.vibrate?.(25);
  }

  private estimateLiveDps(): number {
    const equipped = Object.values(this.run.equipped).filter(Boolean) as EquippedItem[];
    return Math.max(800, estimateBuildPower(equipped) * 3.4);
  }
}
