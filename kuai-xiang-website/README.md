# 软件快响 · 三套首页选型包

面向领导选型的静态首页方案。三套页面共用同一套 `css/`、`js/`、`images/`，保留统一的红山开源页头与页尾，中间内容版式完全不同。

## 打开方式

用浏览器直接打开任意文件即可（无需构建）：

| 文件 | 方案 | 气质 |
|------|------|------|
| `index-a.html` | 冲刺轨道 | 斜切速度感、跑道任务条、光扫描动效 |
| `index-b.html` | 脉冲指挥 | 雷达脉冲、Bento 能力拼版、列表指挥台 |
| `index-c.html` | 光速瀑布 | 杂志大字报、光束叙事、通栏任务条目 |

也可在本目录启动本地服务：

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080/index-a.html`（或 b / c）。

## 目录结构

```
kuai-xiang-website/
  index-a.html
  index-b.html
  index-c.html
  css/common.css          # 页头页尾与基础变量
  css/home-a.css          # 方案 A
  css/home-b.css          # 方案 B
  css/home-c.css          # 方案 C
  js/common.js
  js/home.js
  images/logo-osredm.svg
  images/qr-placeholder.svg
  images/icons/           # 全新图标（非红山旧图标）
  images/decor/           # 动态装饰图
```

## 设计要点

- 主色突出「快」：热橙红 `#FF3D1F` + 明亮科技蓝 `#0A7CFF`
- 内容信息与旧版接近：定位、数据、流程、任务、成果、专家审阅
- 版式刻意避开旧蓝白任务卡片门户布局
- 含 CSS 动效：速度线、脉冲环、光扫、数字滚动、滚动显现、跑马灯等
- 已做移动端自适应（折叠导航、栅格降级）
