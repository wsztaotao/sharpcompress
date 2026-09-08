# 软件快响 · 三套蓝色三维首页

统一蓝色系、版心 **1280px**，页头页尾保留红山开源；动能指标与八步闭环采用 **Three.js** 三维动效，数值仍在 DOM，便于接口接入。

## 下载

https://github.com/wsztaotao/sharpcompress/raw/cursor/kuai-xiang-home-f6e5/kuai-xiang-homes.zip

## 三套模版

| 文件 | 名称 | 三维差异 |
|------|------|----------|
| `index-a.html` | 冲刺轨道 | 轨道平台指标 + 能量环八步 |
| `index-b.html` | 蓝焰航道 | 能量柱阵列 + 蛇形管线八步 |
| `index-c.html` | 极速棱镜 | 蜂巢棱柱 + 纵向轨道八步 |

## 数据接口（低复杂度）

三维只负责空间表现，业务数字在 HTML 卡片中：

```js
// 单个
KuaiXiang3D.updateMetric('tasks', 700);

// 批量
KuaiXiang3D.updateMetrics({
  tasks: 700,
  makers: 1200,
  prize: { value: 9000.5, decimals: 1, suffix: 'w' }
});

// 同步当前业务阶段 0-7
KuaiXiang3D.setFlowStep(2);
```

## 本地预览

```bash
cd kuai-xiang-website
python3 -m http.server 8080
```

需通过本地服务打开（不要直接 `file://`），以便脚本与 WebGL 正常加载。

## 目录

```
css/ common + home-a/b/c
js/  common.js, home.js, three-fx.js, vendor/three.min.js
images/
index-a.html / index-b.html / index-c.html
```
