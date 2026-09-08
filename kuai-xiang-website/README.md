# 软件快响 · 三套蓝色首页（修订版）

统一蓝色系、版心加宽至 **1280px**，保留红山开源页头页尾；中间内容全部重做，避免与红山开源子站展示方式相似。

## 下载

仓库根目录：[`kuai-xiang-homes.zip`](../kuai-xiang-homes.zip)

GitHub 直链（分支）：

https://github.com/wsztaotao/sharpcompress/raw/cursor/kuai-xiang-home-f6e5/kuai-xiang-homes.zip

## 三套模版

| 文件 | 名称 | 差异点 |
|------|------|--------|
| `index-a.html` | 冲刺轨道 | 环形星座指标、八步流水线点亮、成果动能舱 |
| `index-b.html` | 蓝焰航道 | 纵向动能列、蛇形八步、晶体成果矩阵 |
| `index-c.html` | 极速棱镜 | 蜂窝指标、纵向八站轨道、层叠成果棱片 |

## 共同要求落实

1. **蓝色系**：主色 `#0088FF` / 深蓝 `#0057D9` / 电青 `#00D4FF`
2. **数据区**：不再使用红山式灰底五列横条
3. **流程**：完整 8 步（征集→遴选→公示→协议→监管→结算→关闭→完成），CSS/JS 动态点亮
4. **成果区**：扫描舱 / 晶体矩阵 / 层叠棱片，非双栏归档门户样式
5. **版心**：`--container: 1280px`（较原 1180 加宽约 100px）
6. 移动端自适应；共用 `css/` `js/` `images/`

## 本地预览

```bash
cd kuai-xiang-website
python3 -m http.server 8080
```

浏览器打开 `http://localhost:8080/index-a.html`（或 b / c）。
