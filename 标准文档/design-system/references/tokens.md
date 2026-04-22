# Design Tokens

机器可读版本见 `[../assets/tokens.json](../assets/tokens.json)`。  
透明度用 `rgba()` 表示，`light` / `dark` 分别对应浅色/深色模式。

---

## Color

### 品牌色


| Token                 | 说明     | Light     | Dark      |
| --------------------- | ------ | --------- | --------- |
| `color-brand-primary` | 品牌主色常态 | `#2E58FF` | `#527DFF` |


### 涨跌色


| Token                       | 说明             | Light              | Dark                     |
| --------------------------- | -------------- | ------------------ | ------------------------ |
| `color-price-up`            | A股上涨           | `#FF2436`          | `#FF2436`                |
| `color-price-down`          | A股下跌           | `#07AB4B`          | `#07AB4B`                |
| `color-price-even`          | A股平/停牌/集合竞价确认下 | `rgba(0,0,0,0.84)` | `rgba(255,255,255,0.84)` |
| `color-deal-price-down`     | 交易业务-下跌        | `#4691EE`          | `#3D76B8`                |
| `color-price-down-weakness` | A股下跌-色弱模式      | `#0CA3B0`          | `#15A9B6`                |


### 状态色


| Token                  | 说明    | Light     | Dark      |
| ---------------------- | ----- | --------- | --------- |
| `color-status-success` | 成功    | `#07AB4B` | `#07AB4B` |
| `color-status-error`   | 失败/危险 | `#FF2436` | `#FF2436` |
| `color-status-warning` | 警示    | `#FF9500` | `#FF9500` |
| `color-status-info`    | 消息/通知 | `#3366FF` | `#3366FF` |


### 文字/图标颜色


| Token                   | 说明      | Light              | Dark                     |
| ----------------------- | ------- | ------------------ | ------------------------ |
| `color-text-primary`    | 一级文本色   | `rgba(0,0,0,0.84)` | `rgba(255,255,255,0.84)` |
| `color-text-secondary`  | 二级文本色   | `rgba(0,0,0,0.60)` | `rgba(255,255,255,0.60)` |
| `color-text-tertiary`   | 三级文本色   | `rgba(0,0,0,0.40)` | `rgba(255,255,255,0.40)` |
| `color-text-quaternary` | 四级文本色   | `rgba(0,0,0,0.24)` | `rgba(255,255,255,0.24)` |
| `color-text-inverse`    | 彩底白字/反色 | `#FFFFFF`          | `#FFFFFF`                |
| `color-text-link`       | 文字链     | `#4167D9`          | `#4167D9`                |


> 以下黑底文本色不区分深色/浅色模式，固定值。


| Token                           | 说明      | 值                        |
| ------------------------------- | ------- | ------------------------ |
| `color-text-inverse-primary`    | 黑底一级文本色 | `rgba(255,255,255,0.84)` |
| `color-text-inverse-secondary`  | 黑底二级文本色 | `rgba(255,255,255,0.60)` |
| `color-text-inverse-tertiary`   | 黑底三级文本色 | `rgba(255,255,255,0.40)` |
| `color-text-inverse-quaternary` | 黑底四级文本色 | `rgba(255,255,255,0.24)` |


### 背景色


| Token                     | 说明               | Light     | Dark      |
| ------------------------- | ---------------- | --------- | --------- |
| `color-background-layer1` | 页面一级背景色（最底层）     | `#F5F5F5` | `#0F0F0F` |
| `color-foreground-layer1` | 页面一级前景色（大卡等模块背景） | `#FFFFFF` | `#1C1C1C` |
| `color-background-layer2` | 页面二级背景色（浮窗背景）    | `#F5F5F5` | `#212121` |
| `color-foreground-layer2` | 页面二级前景色（活动视图）    | `#FFFFFF` | `#2B2B2B` |
| `color-background-layer3` | 页面对话框背景色         | `#FFFFFF` | `#2B2B2B` |


### 元素背景色


| Token                         | 说明          | Light              | Dark                     |
| ----------------------------- | ----------- | ------------------ | ------------------------ |
| `color-background-weak`       | 元素背景色       | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.06)` |
| `color-background-weak2`      | 二级元素背景色     | `rgba(0,0,0,0.02)` | `rgba(255,255,255,0.02)` |
| `color-background-weak-solid` | 二级元素背景色（实色） | `#F9F9F9`          | `#212121`                |
| `color-background-overlay`    | 灰卡内包裹卡片颜色   | `#FFFFFF`          | `rgba(255,255,255,0.06)` |


### 蒙层


| Token                          | 说明            | Light              | Dark               |
| ------------------------------ | ------------- | ------------------ | ------------------ |
| `color-background-mask-level1` | 一级蒙层（新功能气泡引导） | `rgba(0,0,0,0.80)` | `rgba(0,0,0,0.80)` |
| `color-background-mask-level2` | 二级蒙层（常用弹窗）    | `rgba(0,0,0,0.60)` | `rgba(0,0,0,0.60)` |
| `color-background-mask-level3` | 三级蒙层（下拉菜单遮罩）  | `rgba(0,0,0,0.24)` | `rgba(0,0,0,0.24)` |


### 其他元素


| Token                         | 说明              | Light                  | Dark                    |
| ----------------------------- | --------------- | ---------------------- | ----------------------- |
| `color-background-nav`        | 导航栏背景色          | `#2E58FF`              | `#1C1C1C`               |
| `color-background-brand-weak` | 红色背景色-弱化        | `rgba(46,88,255,0.10)` | `rgba(82,125,255,0.20)` |
| `color-background-disabled`   | 背景颜色禁用态         | `rgba(46,88,255,0.50)` | `rgba(82,125,255,0.50)` |
| `color-background-kbtab`      | 看板 Tab 选中背景色 ⚠️ | `#FFFFFF`              | `#3B3B3B`               |


### 交互反馈


| Token         | 说明          | Light              | Dark                     |
| ------------- | ----------- | ------------------ | ------------------------ |
| `color-hover` | PC 悬停（手炒暂无） | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.05)` |
| `color-click` | 点击          | `rgba(0,0,0,0.10)` | `rgba(255,255,255,0.10)` |


### 分割线


| Token           | 说明       | Light              | Dark                     |
| --------------- | -------- | ------------------ | ------------------------ |
| `color-divider` | 列表/组件分割线 | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` |


### 基础灰阶


| Token           | Light     | Dark      |
| --------------- | --------- | --------- |
| `color-grey-01` | `#E6E6E6` | `#292929` |
| `color-grey-02` | `#D1D1D1` | `#3B3B3B` |
| `color-grey-03` | `#B3B3B3` | `#575757` |
| `color-grey-04` | `#9C9C9C` | `#6E6E6E` |
| `color-grey-05` | `#858585` | `#858585` |


### 辅助色


| Token             | 说明    | 色值        |
| ----------------- | ----- | --------- |
| `color-red`       | 品牌主色  | `#2E58FF` |
| `color-orange`    | 辅助色   | `#FF661A` |
| `color-yellow`    | 辅助色   | `#FF9500` |
| `color-green`     | 辅助色   | `#07AB4B` |
| `color-cyan`      | 辅助色   | `#14CCBD` |
| `color-acidblue`  | 辅助色   | `#29A6FF` |
| `color-blue`      | 辅助色   | `#3366FF` |
| `color-indigo`    | 辅助色   | `#4433FF` |
| `color-purple`    | 辅助色   | `#B341D9` |
| `color-gold`      | 辅助色   | `#CCA670` |
| `color-blue-grey` | 标签-蓝灰 | `#5C78CC` |
| `color-red-grey`  | 标签-英股 | `#E06677` |
| `color-gold-02`   | 标签-金色 | `#BF864D` |


### 辅助色透明（标签背景色）


| Token                        | 色值（Light = Dark）        |
| ---------------------------- | ----------------------- |
| `color-transparent-red`      | `rgba(46,88,255,0.10)`  |
| `color-transparent-orange`   | `rgba(255,102,26,0.10)` |
| `color-transparent-yellow`   | `rgba(255,149,0,0.10)`  |
| `color-transparent-green`    | `rgba(7,171,75,0.10)`   |
| `color-transparent-cyan`     | `rgba(20,204,189,0.10)` |
| `color-transparent-acidblue` | `rgba(41,166,255,0.10)` |
| `color-transparent-blue`     | `rgba(51,102,255,0.10)` |
| `color-transparent-indigo`   | `rgba(68,51,255,0.10)`  |
| `color-transparent-purple`   | `rgba(179,65,217,0.10)` |
| `color-transparent-gold`     | `rgba(191,134,77,0.10)` |


### 可视化


| Token                         | 说明        | 色值                 |
| ----------------------------- | --------- | ------------------ |
| `color-visualization-primary` | 折柱默认色     | `#3366FF`          |
| `color-visualization-01`      | 可视化色      | `#FF4019`          |
| `color-visualization-02`      | 可视化色      | `#FF9500`          |
| `color-visualization-03`      | 可视化色      | `#62B312`          |
| `color-visualization-04`      | 可视化色      | `#14CCBD`          |
| `color-visualization-05`      | 可视化色      | `#199FFF`          |
| `color-visualization-06`      | 可视化色      | `#4433FF`          |
| `color-visualization-07`      | 可视化色      | `#FF33AA`          |
| `color-visualization-08`      | 可视化色      | `#CC41D9`          |
| `color-visualization-09`      | 平/中性色/光标等 | `#858585`          |
| `color-visualization-divider` | 可视化网格线    | `rgba(0,0,0,0.06)` |
| `color-visualization-tooltip` | 表内看板背景    | `#3B3B3B`          |


---

## Spacing

### 内部边距（Padding）


| Token                 | 说明           | 值      |
| --------------------- | ------------ | ------ |
| `padding-none`        | 贴边边距 0       | `0`    |
| `padding-super-tight` | 最小标签等小元素内部边距 | `1px`  |
| `padding-extra-tight` | 小标签等小元素内部边距  | `2px`  |
| `padding-tight`       | 元素内部边距       | `4px`  |
| `padding-base-tight`  | 元素内部边距       | `6px`  |
| `padding-base`        | 元素内部边距       | `8px`  |
| `padding-base-loose`  | 卡片内部边距       | `10px` |
| `padding-loose`       | 卡片内部边距       | `12px` |
| `padding-extra-loose` | 超宽松          | `16px` |
| `padding-super-loose` | 极宽松          | `24px` |


### 间距（Margin）


| Token                | 说明          | 值      |
| -------------------- | ----------- | ------ |
| `margin-none`        | 间距 0        | `0`    |
| `margin-extra-tight` | 间距-紧凑       | `2px`  |
| `margin-tight`       | 间距-紧凑       | `4px`  |
| `margin-base-tight`  | 间距-紧凑       | `6px`  |
| `margin-base`        | 间距-默认       | `8px`  |
| `margin-base-loose`  | 大组件间距、大模块间距 | `12px` |
| `margin-loose`       | 大间距         | `16px` |
| `margin-extra-loose` | 大间距         | `20px` |
| `margin-super-loose` | 大间距         | `24px` |


## Typography

### Font Family


| Token                    | 说明           | 值                |
| ------------------------ | ------------ | ---------------- |
| `font-family-ios-cn`     | iOS 中文字体     | `PingFang SC`    |
| `font-family-ios-en`     | iOS 英文字体     | `San Francisco`  |
| `font-family-android-cn` | Android 中文字体 | `Noto Sans`      |
| `font-family-android-en` | Android 英文字体 | `Roboto`         |
| `font-family-number`     | 数字字体         | `THS Money font` |


#### THS Money font 使用说明

**适用场景：** 所有金融数字——股价、涨跌幅、成交量、净值、收益率等。中文字符、标点、单位（如"元""%"后的文字说明）不使用此字体。

**字体性质：** 公司私有字体，不开源，无公开 CDN 地址。

**集成方式（按平台）：**


| 平台           | 方式                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| iOS 原生       | 将 `.ttf` / `.otf` 字体文件添加到 Xcode 项目，Info.plist 注册 `UIAppFonts`，代码中使用 `font(name: "THSMoneyFont-Regular", ...)` |
| Android 原生   | 字体文件放入 `res/font/`，XML 中 `fontFamily="@font/ths_money_font"`                                                  |
| React Native | 字体文件放入各平台原生目录后 link，JS 中 `fontFamily: 'THSMoneyFont-Regular'`                                                 |
| Web / H5     | `@font-face` 引用内网/CDN 路径（需向字体管理员申请部署地址）                                                                       |


> Fallback 顺序：`THS Money font` → `DIN Alternate`（形态相近的开源替代）→ `monospace`。

### Font Size


| Token                   | 说明              | 值      |
| ----------------------- | --------------- | ------ |
| `font-size-super-large` | 重要信息、导航大标题、资讯标题 | `24px` |
| `font-size-extra-large` | 栏目大标题           | `20px` |
| `font-size-large`       | 模块一级标题          | `18px` |
| `font-size-base`        | 模块二级标题          | `16px` |
| `font-size-medium`      | 模块三级内容          | `14px` |
| `font-size-small`       | 数据信息            | `13px` |
| `font-size-extra-small` | 辅助信息、描述等        | `12px` |
| `font-size-super-small` | 中标签             | `11px` |
| `font-size-xxs`         | 小标签/坐标等         | `10px` |
| `font-size-xxxs`        | 极小标签            | `9px`  |


### Line Height


| Token                     | 说明                | 值      |
| ------------------------- | ----------------- | ------ |
| `line-height-super-large` | 重要信息、导航大标题、资讯标题   | `30px` |
| `line-height-extra-large` | 栏目大标题、首页 1/2 卡标题  | `24px` |
| `line-height-large`       | 模块一级标题            | `22px` |
| `line-height-base`        | 模块二级标题            | `20px` |
| `line-height-medium`      | 模块三级内容、1/2 卡片模块内容 | `18px` |
| `line-height-small`       | 数据信息              | `16px` |
| `line-height-extra-small` | 中标签               | `14px` |
| `line-height-super-small` | 极小标签              | `12px` |
| `line-height-xxs`         | 极小标签              | `10px` |


### Font Weight


| Token                 | 说明              | 值     |
| --------------------- | --------------- | ----- |
| `font-weight-regular` | 常规字重，内容文本       | `400` |
| `font-weight-medium`  | 中黑，标题等强调场景      | `500` |
| `font-weight-bold`    | 中粗，重点强化，行情指数等场景 | `600` |


### 字号与行高配对


| 层级           | font-size | line-height                          |
| ------------ | --------- | ------------------------------------ |
| 导航大标题 / 资讯标题 | `24px`    | `30px`                               |
| 栏目大标题        | `20px`    | `24px`                               |
| 模块一级标题       | `18px`    | `22px`                               |
| 模块二级标题       | `16px`    | `20px`                               |
| 模块三级内容       | `14px`    | `18px`                               |
| 数据信息         | `13px`    | `16px`                               |
| 辅助信息 / 描述    | `12px`    | —                                    |
| 中标签          | `11px`    | `14px`                               |
| 小标签 / 坐标     | `10px`    | `10px`                               |
| 极小标签         | `9px`     | `9px`（无对应 line-height token，直接使用原始值） |


## Radius


| Token                | 说明         | 值      |
| -------------------- | ---------- | ------ |
| `radius-none`        | 无圆角        | `0`    |
| `radius-extra-small` | 标签等元素圆角    | `1px`  |
| `radius-small`       | 标签等元素圆角    | `2px`  |
| `radius-medium`      | 按钮、二级模块圆角  | `4px`  |
| `radius-large`       | 大圆角        | `6px`  |
| `radius-extra-large` | 弹窗、底部视图圆角  | `8px`  |
| `radius-xxl`         | 弹窗、底部视图圆角  | `10px` |
| `radius-xxxl`        | 弹窗、底部视图圆角  | `12px` |
| `radius-circle`      | 全圆角，营销场景按钮 | `50%`  |


## Sizing

### 方形容器（Square）


| Token                       | 说明       | 值      |
| --------------------------- | -------- | ------ |
| `sizing-square-super-small` | 系统图标-10  | `10px` |
| `sizing-square-extra-small` | 系统图标-12  | `12px` |
| `sizing-square-small`       | 系统图标-14  | `14px` |
| `sizing-square-base-small`  | 系统图标-16  | `16px` |
| `sizing-square-medium`      | 系统图标-20  | `20px` |
| `sizing-square-base`        | 系统图标-24  | `24px` |
| `sizing-square-large`       | 宫格图标-32  | `32px` |
| `sizing-square-extra-large` | 同顺商场应用图标 | `48px` |


### 描边（Border）

> 注意：第一档（`0.33px` 标签描边）在 Figma 中无别名变量，直接使用原始值。


| Token                       | 说明          | 值        |
| --------------------------- | ----------- | -------- |
| —                           | 标签描边（无别名变量） | `0.33px` |
| `sizing-border-extra-small` | 二级 Tab 描边   | `0.5px`  |
| `sizing-border-small`       | 描边-粗        | `1px`    |


## Shadow


| Token                     | 说明     | 值                               |
| ------------------------- | ------ | ------------------------------- |
| `shadow-elevation-small`  | 卡片阴影-小 | `0 0 8px 0 rgba(0,0,0,0.12)`    |
| `shadow-elevation-medium` | 卡片阴影   | `0 4px 12px 0 rgba(0,0,0,0.12)` |
| `shadow-elevation-large`  | 拖放的阴影  | `0 0 20px 0 rgba(0,0,0,0.12)`   |
