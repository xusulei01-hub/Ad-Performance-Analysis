---

## name: design-system

description: 提供项目统一的设计系统上下文 —— 设计 tokens、组件规范、页面 pattern。在构建 UI、写组件代码、做设计实现时触发，确保视觉与交互遵循同一套规则。

# Design System

本 skill 是项目的单一设计事实来源（single source of truth）。在实现任何 UI 之前，先查阅此处的 tokens、组件规范与 pattern。

---

## 全局规则 (Global Rules)

### 数字字体规则

**所有金融数字必须使用 `font-family-number`（THS Money font）。**

适用范围：股价、涨跌幅（如 `+3.25%`）、成交量、净值、收益率等。

- 数字与中文混排时，数字部分单独用 `<Text>` / `<span>` 节点包裹并应用数字字体
- 中文字符、标点、单位说明文字不使用数字字体
- 禁止在代码中硬编码字体名（如 `'DIN Alternate'`），必须通过 token 引用；fallback 链在 token 层统一管理
- 字体文件集成方式见 [references/tokens.md — THS Money font 使用说明](references/tokens.md)

---

## 组件索引 (Component Index)

图例：✅ 完整文档  🔲 占位待填充

### 导航 & 布局


| 组件            | 文档                                                                 | 状态  |
| ------------- | ------------------------------------------------------------------ | --- |
| Icon（图标库）     | [references/components/icon.md](references/components/icon.md)     | ✅   |
| Navbar（导航栏）   | [references/components/navbar.md](references/components/navbar.md) | ✅   |
| Tab Bar（底部导航） | [references/components/tabbar.md](references/components/tabbar.md) | ✅   |
| Tab（选项卡）      | [references/components/tab.md](references/components/tab.md)       | ✅   |


### 基础组件


| 组件                    | 文档                                                                                 | 状态  |
| --------------------- | ---------------------------------------------------------------------------------- | --- |
| Button（按钮）            | [references/components/button.md](references/components/button.md)                 | ✅   |
| Tag / Label（标签）       | [references/components/tag.md](references/components/tag.md)                       | ✅   |
| Input（输入框）            | [references/components/input.md](references/components/input.md)                   | ✅   |
| Card（卡片）              | [references/components/card.md](references/components/card.md)                     | ✅   |
| Modal（弹窗）             | [references/components/modal.md](references/components/modal.md)                   | ✅   |
| Bottom Sheet（底部视图）    | [references/components/bottom-sheet.md](references/components/bottom-sheet.md)     | ✅   |
| 下拉菜单（Dropdown）        | [references/components/dropdown.md](references/components/dropdown.md)             | ✅   |
| 开关（Switch）            | [references/components/switch.md](references/components/switch.md)                 | ✅   |
| NoticeBar（通知栏）        | [references/components/notice-bar.md](references/components/notice-bar.md)         | ✅   |
| Toast（提示框）            | [references/components/toast.md](references/components/toast.md)                   | ✅   |
| 多选项（Checkbox）         | [references/components/checkbox.md](references/components/checkbox.md)             | ✅   |
| 单选项（Radio）            | [references/components/radio.md](references/components/radio.md)                   | ✅   |
| 单元格列表（Cell List）      | [references/components/cell-list.md](references/components/cell-list.md)           | ✅   |
| 股票列表行（Stock List Row） | [references/components/stock-list-row.md](references/components/stock-list-row.md) | ✅   |
| 表格（Table）             | [references/components/table.md](references/components/table.md)                   | ✅   |
| 日历（Calendar）          | [references/components/calendar.md](references/components/calendar.md)             | ✅   |
| 日历Tab（CalendarTab）    | [references/components/calendar-tab.md](references/components/calendar-tab.md)     | ✅   |
| 页面指示器（PageIndicator）  | [references/components/page-indicator.md](references/components/page-indicator.md) | ✅   |
| 折叠面板（Collapse）        | [references/components/collapse.md](references/components/collapse.md)             | ✅   |
| 泳道卡片（Swimlane Card）   | [references/components/swimlane-card.md](references/components/swimlane-card.md)   | ✅   |
| 搜索（Search）            | [references/components/search.md](references/components/search.md)                 | ✅   |


### 可视化图表


| 组件              | 文档                                                                               | 状态  |
| --------------- | -------------------------------------------------------------------------------- | --- |
| 折线图 / 柱状图 / 折柱图 | [references/components/visualization.md](references/components/visualization.md) | ✅   |


### Tokens & Assets

- Tokens 规范：[references/tokens.md](references/tokens.md)
- 机器可读 tokens：[assets/tokens.json](assets/tokens.json)
- 通用图标 SVG：[assets/icons/](assets/icons/)（5 个目录，约 146 个文件）
- Tab Bar 专用图标：[assets/icons/tabbar/](assets/icons/tabbar/)（12 个 SVG，selected/outline 各 6）
- 可视化图例标记 SVG：[assets/icons/visualization/](assets/icons/visualization/)（5 个文件：legend-line / legend-bar / legend-dashed / legend-candle / legend-rg-bar）
- 组件示例图：[assets/examples/](assets/examples/)（每个组件一张 `{component}-variants.png`）

