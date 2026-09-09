# 软件快响 · 三套蓝色三维首页

## 如何预览（重要）

下载并解压 `kuai-xiang-homes.zip` 后，进入 **`kuai-xiang-website`** 目录。

### 方式一：直接打开（推荐，无需命令）

直接双击：

- `index-a.html`（模版1）
- `index-b.html`（模版2）
- `index-c.html`（模版3）

Three.js 已内置在 `js/vendor/`，双击即可看立体动效。

### 方式二：本机启动服务

**Windows：** 双击 `start.bat`  
**Mac / Linux：**

```bash
cd kuai-xiang-website
chmod +x start.sh
./start.sh
```

或手动：

```bash
cd kuai-xiang-website
python3 -m http.server 8080 --bind 127.0.0.1
```

然后在**你自己电脑的浏览器**打开：

- http://127.0.0.1:8080/index-a.html
- http://127.0.0.1:8080/index-b.html
- http://127.0.0.1:8080/index-c.html

> 注意：若命令是在 Cursor 云端终端执行的，你本机浏览器访问不了该服务。请在下载解压后的本机目录执行，或直接双击 HTML。

若 8080 被占用，可换端口：

```bash
python3 -m http.server 5500 --bind 127.0.0.1
```

## 下载

https://github.com/wsztaotao/sharpcompress/raw/cursor/kuai-xiang-home-f6e5/kuai-xiang-homes.zip

## 三套模版

| 文件 | 名称 | 三维差异 |
|------|------|----------|
| `index-a.html` | 冲刺轨道 | 轨道平台指标 + 能量环八步 |
| `index-b.html` | 蓝焰航道 | 能量柱阵列 + 蛇形管线八步 |
| `index-c.html` | 极速棱镜 | 蜂巢棱柱 + 纵向轨道八步 |

「软件快响」Hero 及以上保持原样；三维仅用于下方动能区与八步闭环。

## 数据接口

```js
KuaiXiang3D.updateMetric('tasks', 700);
KuaiXiang3D.updateMetrics({ tasks: 700, makers: 1200 });
KuaiXiang3D.setFlowStep(2); // 0-7
```
