import type { GamePhase } from "../types";

export interface PosterRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PosterTextBox extends PosterRect {
  fontSize: number;
  lineHeight: number;
  maxLines: number;
}

export type PosterPanelPhase = Exclude<GamePhase, "combat">;

export const POSTER_CANVAS = {
  width: 360,
  height: 640,
  aspectRatio: 360 / 640
} as const;

export const POSTER_THEME = {
  // Based on public/assets/ui-screens: high-contrast arcade poster, stacked bands, hard neon accents.
  colors: {
    ink: "#050611",
    deepInk: "#0b1024",
    panel: "rgba(14, 15, 38, 0.9)",
    panelStrong: "rgba(20, 11, 48, 0.94)",
    glass: "rgba(255, 255, 255, 0.08)",
    stroke: "rgba(255, 255, 255, 0.18)",
    cyan: "#12f4ff",
    cyanSoft: "rgba(18, 244, 255, 0.22)",
    magenta: "#ff2bd6",
    magentaSoft: "rgba(255, 43, 214, 0.24)",
    yellow: "#ffe329",
    orange: "#ff8a1f",
    red: "#ff3159",
    lime: "#7cff6b",
    white: "#fff7fb",
    muted: "rgba(255, 247, 251, 0.72)",
    dim: "rgba(255, 247, 251, 0.48)",
    shadow: "rgba(0, 0, 0, 0.52)"
  },
  typography: {
    hero: 30,
    title: 22,
    subtitle: 15,
    body: 12,
    caption: 10,
    micro: 8,
    button: 15,
    nav: 8,
    lineHeightTight: 1.12,
    lineHeightNormal: 1.28,
    lineHeightLoose: 1.42
  },
  spacing: {
    outer: 16,
    inner: 12,
    gutter: 10,
    minTextGap: 7,
    minPanelGap: 10,
    minTouchGap: 8,
    readableTextInset: 10
  },
  radius: {
    panel: 8,
    button: 8,
    chip: 6,
    slot: 10
  },
  effects: {
    glowSmall: 10,
    glowMedium: 18,
    glowLarge: 28,
    posterBorder: 3
  }
} as const;

export const POSTER_SAFE_AREAS = {
  full: rect(0, 0, 360, 640),
  header: rect(16, 22, 328, 68),
  headerTitle: textBox(26, 32, 198, 25, POSTER_THEME.typography.title, 1),
  headerMeta: textBox(26, 62, 184, 16, POSTER_THEME.typography.caption, 1),
  progress: rect(220, 52, 112, 8),
  content: rect(16, 96, 328, 448),
  bottomActions: rect(16, 552, 328, 42),
  bottomNav: rect(16, 602, 328, 32)
} as const;

export const POSTER_BUTTON = {
  primary: rect(92, 552, 176, 42),
  secondary: rect(20, 552, 88, 36),
  tertiary: rect(252, 552, 88, 36),
  combat: rect(22, 544, 96, 40),
  combatWide: rect(132, 544, 206, 40),
  navItem: rect(0, 0, 72, 30),
  minHeight: 30,
  minWidth: 56
} as const;

const MAIN_PANEL_RECTS: Record<PosterPanelPhase, PosterRect> = {
  launch: rect(20, 112, 320, 420),
  home: rect(18, 104, 324, 438),
  loot: rect(18, 104, 324, 438),
  lootResult: rect(18, 104, 324, 438),
  assembly: rect(16, 100, 328, 444),
  fusion: rect(16, 100, 328, 444),
  fusionSuccess: rect(22, 116, 316, 410),
  result: rect(20, 104, 320, 430),
  museum: rect(16, 100, 328, 444),
  weaponDetail: rect(18, 102, 324, 442),
  graveyard: rect(18, 104, 324, 438),
  graveStart: rect(18, 104, 324, 438),
  share: rect(28, 86, 304, 462),
  shop: rect(16, 100, 328, 444),
  missions: rect(16, 100, 328, 444),
  achievements: rect(16, 100, 328, 444),
  settings: rect(18, 104, 324, 438),
  tutorial: rect(20, 100, 320, 444)
};

export function getMainPanelRect(phase: PosterPanelPhase): PosterRect {
  return { ...MAIN_PANEL_RECTS[phase] };
}

export function getCombatRects(): {
  panel: PosterRect;
  bossHud: PosterRect;
  battlefield: PosterRect;
  playerZone: PosterRect;
  enemyZone: PosterRect;
  projectileLane: PosterRect;
  statsRail: PosterRect;
  commandBar: PosterRect;
  aimButton: PosterRect;
  burstButton: PosterRect;
  shieldButton: PosterRect;
  safeTextBoxes: {
    title: PosterTextBox;
    bossName: PosterTextBox;
    stats: PosterTextBox;
    hint: PosterTextBox;
  };
} {
  return {
    panel: rect(14, 96, 332, 492),
    bossHud: rect(30, 140, 300, 44),
    battlefield: rect(24, 196, 312, 300),
    playerZone: rect(34, 296, 142, 160),
    enemyZone: rect(188, 182, 132, 210),
    projectileLane: rect(114, 210, 132, 216),
    statsRail: rect(24, 494, 312, 38),
    commandBar: rect(16, 542, 328, 46),
    aimButton: rect(22, 546, 92, 36),
    burstButton: rect(126, 546, 108, 36),
    shieldButton: rect(246, 546, 92, 36),
    safeTextBoxes: {
      title: textBox(26, 112, 188, 20, POSTER_THEME.typography.subtitle, 1),
      bossName: textBox(44, 160, 116, 14, POSTER_THEME.typography.caption, 1),
      stats: textBox(30, 504, 300, 16, POSTER_THEME.typography.caption, 1),
      hint: textBox(32, 520, 296, 12, POSTER_THEME.typography.micro, 1)
    }
  };
}

export function getBottomNavRects(): Array<PosterRect & { id: "assembly" | "fusion" | "combat" | "museum" }> {
  const y = POSTER_SAFE_AREAS.bottomNav.y + 1;
  return [
    { id: "assembly", ...rect(22, y, 64, 30) },
    { id: "fusion", ...rect(104, y, 64, 30) },
    { id: "combat", ...rect(186, y, 64, 30) },
    { id: "museum", ...rect(268, y, 64, 30) }
  ];
}

export function getPosterHeaderRects(): {
  shell: PosterRect;
  title: PosterTextBox;
  meta: PosterTextBox;
  progress: PosterRect;
  badge: PosterRect;
} {
  return {
    shell: { ...POSTER_SAFE_AREAS.header },
    title: { ...POSTER_SAFE_AREAS.headerTitle },
    meta: { ...POSTER_SAFE_AREAS.headerMeta },
    progress: { ...POSTER_SAFE_AREAS.progress },
    badge: rect(270, 24, 62, 24)
  };
}

export function getReadableContentRect(panel: PosterRect, inset = POSTER_THEME.spacing.readableTextInset): PosterRect {
  return rect(panel.x + inset, panel.y + inset, panel.w - inset * 2, panel.h - inset * 2);
}

export function getStackedTextBoxes(
  startX: number,
  startY: number,
  width: number,
  lines: Array<{ fontSize: number; maxLines?: number; gapAfter?: number }>
): PosterTextBox[] {
  let cursorY = startY;
  return lines.map((line) => {
    const lineCount = line.maxLines ?? 1;
    const lineHeight = Math.ceil(line.fontSize * POSTER_THEME.typography.lineHeightNormal);
    const box = textBox(startX, cursorY, width, lineHeight * lineCount, line.fontSize, lineCount);
    cursorY += box.h + (line.gapAfter ?? POSTER_THEME.spacing.minTextGap);
    return box;
  });
}

function rect(x: number, y: number, w: number, h: number): PosterRect {
  return { x, y, w, h };
}

function textBox(x: number, y: number, w: number, h: number, fontSize: number, maxLines: number): PosterTextBox {
  return {
    x,
    y,
    w,
    h,
    fontSize,
    lineHeight: Math.ceil(fontSize * POSTER_THEME.typography.lineHeightNormal),
    maxLines
  };
}
