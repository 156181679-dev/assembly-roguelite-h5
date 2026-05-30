# Image2 美术素材生成清单

当前环境没有可直接调用的内置 Image2 工具，且本机未检测到 `OPENAI_API_KEY`，所以这轮不能实际生成图片文件。下面是可直接投喂 Image2 / gpt-image-2 的项目资产提示词。生成后建议放入 `public/assets/`，再把 Canvas 里的程序化占位替换为图片绘制。

## 统一美术方向

- 风格：赛博朋克漫画海报、抖音小游戏展示图、高饱和霓虹、粗黑描边、强电光、爆炸粒子。
- 色彩：深紫黑背景，荧光洋红、赛博蓝、闪电黄、火焰橙。
- 角色：鱼头骨架机甲，背着冰箱/能量舱，一手火焰刀，一手雷电炮，脚部火箭推进。
- 约束：不要真实品牌、不要水印、不要乱码文字、不要复杂小字。

## 首批必需资产

### 1. 主角机甲鱼骨立绘

```text
Use case: stylized-concept
Asset type: H5 game character sprite
Primary request: a cyberpunk fish-headed skeleton mecha warrior for a vertical mobile H5 game
Subject: fish skull monster with metal skeleton body, one hand holding a flaming blade, the other arm fitted with an electric cannon, refrigerator-like module on the back, rocket boosters on both feet
Style/medium: high-saturation arcade comic game art, thick black outline, sharp readable silhouette, exaggerated proportions
Composition/framing: full body, centered, transparent-friendly clean background, generous padding
Lighting/mood: neon magenta and cyan rim light, explosive energy, dynamic but readable
Color palette: black-purple base, neon magenta, electric cyan, fire orange, warning yellow
Constraints: no text, no watermark, no logos, no realistic gore
```

### 2. 战斗背景

```text
Use case: stylized-concept
Asset type: vertical H5 game battle background
Primary request: a cyberpunk monster battle arena background for a 9:16 mobile game
Scene/backdrop: dark futuristic city ruins, electric storm, purple lightning, flying debris, comic halftone dots
Style/medium: arcade comic poster art, high contrast, neon lighting
Composition/framing: vertical 9:16, center area slightly darker for gameplay readability, bright effects around edges
Lighting/mood: explosive, chaotic, energetic
Color palette: deep purple black, neon magenta, electric blue, fire orange
Constraints: no characters, no text, no logos, no watermark
```

### 3. 轮盘界面背景

```text
Use case: ui-mockup
Asset type: H5 game loot wheel panel
Primary request: a cyberpunk loot wheel UI for a vertical mobile H5 game
Subject: SSR loot wheel with eight weapon slots, skull emblem in center, neon magenta frame, yellow call-to-action button area
Style/medium: polished mobile game UI, comic arcade, thick neon border
Composition/framing: centered wheel, readable at phone size, transparent or dark background
Lighting/mood: casino suspense, golden sparks, high energy
Color palette: purple, cyan, gold, black
Constraints: no readable text except optional SSR letters, no logos, no watermark
```

### 4. 火焰刀

```text
Use case: stylized-concept
Asset type: fusion weapon sprite
Primary request: a fused weapon called fire blade, combining a metal blade and a fire gem
Subject: oversized flaming sword, molten metal edge, exploding orange arc trail
Style/medium: arcade comic game item, thick black outline, high contrast
Composition/framing: centered object, transparent-friendly clean background, strong silhouette
Lighting/mood: hot, explosive, heroic
Color palette: fire orange, yellow, red, dark metal
Constraints: no text, no hand, no character, no watermark
```

### 5. 电磁炮

```text
Use case: stylized-concept
Asset type: fusion weapon sprite
Primary request: a fused weapon called electromagnetic cannon, combining a gun barrel and lightning coil
Subject: chunky sci-fi cannon with glowing coil rings, blue-white plasma muzzle blast
Style/medium: arcade comic game item, thick black outline, high contrast
Composition/framing: centered object, transparent-friendly clean background, strong silhouette
Lighting/mood: electric, powerful, unstable
Color palette: electric cyan, violet, steel gray, white sparks
Constraints: no text, no character, no watermark
```

### 6. 飞鱼导弹

```text
Use case: stylized-concept
Asset type: fusion weapon sprite
Primary request: a ridiculous flying fish missile, combining a blue fish and a rocket booster
Subject: cartoon blue fish with rocket fins, angry eye, fire exhaust, small metal rivets
Style/medium: funny arcade comic game item, thick black outline, readable silhouette
Composition/framing: centered object, transparent-friendly clean background
Lighting/mood: absurd, fast, explosive
Color palette: cyan blue fish, red rocket, orange fire, white highlights
Constraints: no text, no watermark
```

### 7. 精神污染

```text
Use case: stylized-concept
Asset type: fusion weapon sprite
Primary request: a glitch horror weapon representing curse plus KPI pressure
Subject: corrupted red report board merged with black-purple curse energy, broken arrows, glitch aura
Style/medium: arcade comic item art, thick outline, high contrast, abstract but readable
Composition/framing: centered object, transparent-friendly clean background
Lighting/mood: chaotic, oppressive, funny not scary
Color palette: red, black, purple, white glitch noise
Constraints: no readable text, no watermark, no real company symbols
```

### 8. 分享卡背景

```text
Use case: ads-marketing
Asset type: 9:16 mobile game share card background
Primary request: a vertical share card background for the game 拼装狂潮：融合肉鸽
Scene/backdrop: neon comic cyberpunk explosion scene with empty center space for character and stats
Style/medium: high-impact Douyin mobile game poster style, thick neon panel frame, halftone comic effects
Composition/framing: 9:16 portrait, strong top title area, center hero space, bottom stats panel space
Lighting/mood: explosive, victorious, share-worthy
Color palette: black purple, neon magenta, electric cyan, warning yellow
Text (verbatim): no text in image
Constraints: no QR code, no logos, no watermark, leave text areas empty
```

## 推荐落盘路径

```text
public/assets/characters/mecha-fish-skeleton.png
public/assets/backgrounds/battle-neon-city.png
public/assets/ui/loot-wheel-panel.png
public/assets/weapons/fire-blade.png
public/assets/weapons/electromagnetic-cannon.png
public/assets/weapons/flying-fish-missile.png
public/assets/weapons/mental-pollution.png
public/assets/share/share-card-bg.png
```

## 替换建议

1. 先替换主角和战斗背景，视觉提升最大。
2. 再替换 3 个核心融合武器：火焰刀、电磁炮、飞鱼导弹。
3. 最后替换轮盘 UI 和分享卡背景。
4. 所有图片先压缩到 WebP 或 PNG，单张尽量控制在 300KB 内，保证抖音 H5 首屏速度。
