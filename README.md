# 🎄 Christmas Tree Ultra

> 基于 **React 18 + Three.js (R3F) + MediaPipe AI 手势识别** 的高保真 3D 交互式圣诞树 Web 应用

![Project Preview](public/preview.png)

## 🔗 链接

- **仓库地址**: [https://github.com/FronNian/Christmas-Tree-Ultra](https://github.com/FronNian/Christmas-Tree-Ultra)
- **在线体验**: [https://tree.lynflows.com/](https://tree.lynflows.com/)

> ⚠️ **注意**: 
> - 在线体验地址将于 2025 年 12 月底停止维护，届时请自行部署使用
> - 分享的数据仅保存 7 天，过期后需重新创建

## ✨ 特性

- **45,000+ 发光粒子** 组成的梦幻树身，配合动态 Bloom 光晕效果
- **拍立得照片装饰** - 双面渲染，支持自定义照片
- **AI 手势控制** - 通过摄像头识别手势控制树的形态和视角
- **丰富的圣诞元素** - 动态彩灯、六角雪花、礼物堆、飘落丝带、底部雾气
- **音乐播放器** - 内置多首圣诞歌曲，支持 LRC 歌词同步显示
- **分享功能** - 创建专属圣诞树分享给朋友
- **移动端适配** - 自动降低粒子数量，优化触控体验

## 🎮 手势控制

| 手势 | 效果 |
|------|------|
| 🖐 张开手掌 | 散开 (CHAOS) - 粒子四散飞舞 |
| ✊ 握紧拳头 | 聚合 (FORMED) - 聚合成圣诞树 |
| 🤟 ILoveYou | 显示爱心粒子特效 |
| ✌️ Victory | 显示文字粒子特效 |
| 👌 捏合 | 选择/取消选择照片 |

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18, TypeScript, Vite 5 |
| 3D 引擎 | React Three Fiber, Three.js 0.169 |
| 工具库 | @react-three/drei, @react-three/postprocessing, maath |
| AI 视觉 | @mediapipe/tasks-vision |
| 存储 | Cloudflare R2 (S3 兼容) |

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm (推荐) 或 npm

### 安装

```bash
# 克隆仓库
git clone https://github.com/FronNian/Christmas-Tree-Ultra.git
cd Christmas-Tree-Ultra

# 安装依赖
pnpm install

# 复制环境变量配置
cp .env.example .env
# 编辑 .env 填入你的 R2 API 地址

# 启动开发服务器
pnpm dev
```

### 构建

```bash
pnpm build
pnpm preview
```


## 🖼️ 自定义照片

1. 将照片放入 `public/photos/` 目录
2. 命名格式：`1.jpg`, `2.jpg`, `3.jpg` ...（树顶大图命名为 `top.jpg`）
3. 修改 `src/App.tsx` 中的 `TOTAL_NUMBERED_PHOTOS` 数量

建议：使用正方形或 4:3 比例图片，单张 500KB 以内

## ⚙️ 配置说明

视觉参数可在 `src/config/index.ts` 中调整：

```typescript
CONFIG = {
  counts: {
    foliage: 15000,   // 树叶粒子数量
    ornaments: 300,   // 照片装饰数量
    lights: 400       // 彩灯数量
  },
  tree: { height: 22, radius: 9 }
}
```

## 📁 项目结构

```
src/
├── components/
│   ├── three/          # 3D 组件 (Foliage, PhotoOrnaments, FairyLights...)
│   └── ui/             # UI 组件 (SettingsPanel, LyricsDisplay...)
├── config/             # 视觉配置
├── types/              # TypeScript 类型定义
└── App.tsx             # 主应用
```

## 🙏 致谢

本项目基于 [moleculemmeng020425/christmas-tree](https://github.com/moleculemmeng020425/christmas-tree) 进行改进和增强。

### 主要改进

- ✅ 重构项目结构，组件模块化
- ✅ 添加音乐播放器和 LRC 歌词同步
- ✅ 添加设置面板（音乐选择、音量控制）
- ✅ 添加分享功能（Cloudflare R2 存储）
- ✅ 优化移动端适配
- ✅ 添加 Gzip 压缩和代码分割
- ✅ 修复多项 Bug 和性能问题

## 📄 License

本项目采用 [GPL-3.0](LICENSE) 协议开源。

基于本项目的衍生作品必须同样以 GPL-3.0 协议开源。

---

🎄 Merry Christmas! ✨
