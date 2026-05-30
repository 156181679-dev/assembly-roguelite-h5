# 拼装狂潮：融合肉鸽

面向抖音互动空间 / 移动浏览器的竖屏 H5 小游戏原型。玩家在 60 秒内完成轮盘开箱、拖拽拼装、任意融合、自动战斗和博物馆收藏。

## 当前内容

- Vite + TypeScript H5 工程
- Canvas 2D 竖屏游戏界面
- 轮盘开箱、零件库存、6 槽位拼装
- 任意融合规则、混沌 fallback
- 自动战斗、Combo、超载模式
- 结算页、分享卡生成、LocalStorage 博物馆
- Vitest 覆盖掉落、融合、战斗、博物馆核心规则
- Image2 美术资产提示词清单

## 本地运行

```bash
npm install
npm run dev
```

打开：

```text
http://127.0.0.1:5173/
```

## 构建

```bash
npm run build
```

构建产物位于 `dist/`，可作为静态 H5 包继续上传或集成到抖音虚拟创作平台。

## 测试

```bash
npm test -- --run
```

## 抖音虚拟创作平台发布

目标平台：https://vcreate.douyin.com/

当前项目是纯前端静态 H5，无后端依赖。发布时优先上传或托管 `dist/` 静态产物。实际提交入口、审核字段、分享能力和互动空间 API 需要在抖音虚拟创作平台账号内最终确认。

## 美术素材

当前版本使用程序化 Canvas 占位美术，视觉方向已调整为赛博霓虹、漫画机甲、爆炸伤害数字风格。真实 Image2 素材提示词见：

```text
docs/IMAGE2_ASSET_PROMPTS.md
```

## 开源协议

MIT
