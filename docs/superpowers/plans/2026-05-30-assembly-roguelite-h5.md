# Assembly Roguelite H5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable vertical H5 MVP for "拼装狂潮：融合肉鸽" that can be run locally, built into a static `dist/` package, and prepared for Douyin VCreate upload.

**Architecture:** The game is a TypeScript Vite app with pure domain systems covered by Vitest and a Canvas 2D runtime for the mobile game surface. Configuration lives in typed TypeScript data modules so the MVP works without network or runtime asset generation.

**Tech Stack:** TypeScript, Vite, Vitest, Canvas 2D, Web Audio, LocalStorage, static `dist/` output.

---

## File Structure

- `package.json`: npm scripts and dev dependencies.
- `index.html`: mobile H5 entrypoint.
- `src/main.ts`: app bootstrap.
- `src/style.css`: full-screen vertical mobile styling.
- `src/game/GameApp.ts`: coordinates game state, input, systems, and renderer.
- `src/game/types.ts`: shared domain types.
- `src/game/data.ts`: part, fusion, enemy, and balance configuration.
- `src/game/systems/*.ts`: pure or mostly-pure game systems.
- `src/game/render/CanvasRenderer.ts`: all Canvas drawing.
- `src/game/__tests__/*.test.ts`: Vitest coverage for core rules.
- `docs/DOUYIN_PUBLISHING.md`: static build and VCreate publishing notes.

---

## Tasks

### Task 1: Project Scaffold

- [ ] Create Vite TypeScript project files.
- [ ] Add Vitest and build scripts.
- [ ] Add strict TypeScript config.
- [ ] Run `npm install`.
- [ ] Run baseline `npm test -- --run`; expect no tests yet or initial failing tests after Task 2.

### Task 2: Core Rule Tests First

- [ ] Write failing tests for loot draw: 3 rewards per round, no duplicates, third round includes catalyst.
- [ ] Write failing tests for fusion priority: exact recipe, tag recipe, chaos fallback.
- [ ] Write failing tests for museum storage: max 20 records and corrupted storage recovery.
- [ ] Run tests and confirm failures are due to missing implementations.

### Task 3: Core Rule Implementations

- [ ] Implement typed data definitions for at least 18 base parts and 12 named fusion rules.
- [ ] Implement `LootSystem`.
- [ ] Implement `FusionSystem`.
- [ ] Implement `MuseumSystem`.
- [ ] Run `npm test -- --run`; expect all rule tests pass.

### Task 4: Game Runtime

- [ ] Implement `GameApp` with phases: `loot`, `assembly`, `fusion`, `combat`, `result`, `museum`.
- [ ] Implement mobile pointer input for tapping, dragging, slot snapping, and fusion collision.
- [ ] Implement simplified auto combat, combo, overdrive, and battle result generation.
- [ ] Implement share-card canvas export fallback as data URL.

### Task 5: Canvas UI and Visual MVP

- [ ] Draw a vertical 9:16 playfield.
- [ ] Draw loot wheel, inventory rail, skeleton slots, fusion feedback, combat projectiles, damage numbers, result screen, and museum.
- [ ] Use procedural icon drawing as placeholder assets until Image2 output is available.
- [ ] Add copy and controls in Chinese, optimized for single-hand mobile play.

### Task 6: Verification and Publishing Prep

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Start the Vite dev server.
- [ ] Open the local page in a browser and verify no blank canvas or runtime errors.
- [ ] Write Douyin VCreate packaging notes and identify any platform items requiring account-side upload verification.
