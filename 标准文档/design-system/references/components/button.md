# Button (按钮)

## Overview

Buttons allow users to take an action or make a choice with a single tap. Choose the button type based on **importance level**, then choose the size based on its position in the layout.

**Designer:** 钱宇楠

---

## Classification (重要等级)

Buttons are divided into three importance levels:


| Level         | 中文    | Style                   | Usage                                                    |
| ------------- | ----- | ----------------------- | -------------------------------------------------------- |
| **Primary**   | 重要    | Solid fill, white text  | Page's single most important action; max 1 per container |
| **Secondary** | 次要    | Gray bg, black/red text | Neutral or directional operations on modules/cards       |
| **Tertiary**  | 幽灵/文字 | Text or icon only       | Low-priority; high-density areas (nav bar, toolbars)     |


### Primary Button Styles


| Style   | Background | Token                 | Text  | Token                |
| ------- | ---------- | --------------------- | ----- | -------------------- |
| Default | `#2E58FF`  | `color-brand-primary` | White | `color-text-inverse` |


### Secondary Button Styles


| Style          | Background                        | Text                         | When                                |
| -------------- | --------------------------------- | ---------------------------- | ----------------------------------- |
| Default (默认)   | Gray (`color-background-weak`)    | Black (`color-text-primary`) | Neutral action                      |
| Tendency (倾向性) | Gray (`color-background-weak`)    | Red — `color-brand-primary`  | Directional/recommended action      |
| Special (交易场景) | Gray card interior                | —                            | Inside gray trading card containers |
| White bg       | White — `color-foreground-layer1` | —                            | When page background is gray        |


### Tertiary / Text Button Styles

- Text button (文本按钮): text-only, no background, no fixed size
- Icon button: icon-only, no fixed size
- No loading state on text/icon buttons

---

## Size (高度尺寸)

Four sizes, chosen by position in layout:


| Size       | Height | Font Size | Corner Radius | H-Padding | Icon Size | Icon Gap |
| ---------- | ------ | --------- | ------------- | --------- | --------- | -------- |
| **Large**  | 44px   | 16px      | 4px           | 20px      | 20px      | 2px      |
| **Medium** | 36px   | 14px      | 4px           | 16px      | 16px      | 2px      |
| **Small**  | 28px   | 13px      | 4px           | 12px      | 16px      | 2px      |
| **XSmall** | 24px   | 12px      | 2px           | 8px       | 12px      | 2px      |


**Token mapping:**


| 属性                                     | 值    | Token                       |
| -------------------------------------- | ---- | --------------------------- |
| Font Size — Large                      | 16px | `font-size-base`            |
| Font Size — Medium                     | 14px | `font-size-medium`          |
| Font Size — Small                      | 13px | `font-size-small`           |
| Font Size — XSmall                     | 12px | `font-size-extra-small`     |
| Corner Radius — Large / Medium / Small | 4px  | `radius-medium`             |
| Corner Radius — XSmall                 | 2px  | `radius-small`              |
| H-Padding — Large                      | 20px | `margin-extra-loose`¹       |
| H-Padding — Medium                     | 16px | `padding-extra-loose`       |
| H-Padding — Small                      | 12px | `padding-loose`             |
| H-Padding — XSmall                     | 8px  | `padding-base`              |
| Icon Size — Large                      | 20px | `sizing-square-medium`      |
| Icon Size — Medium / Small             | 16px | `sizing-square-base-small`  |
| Icon Size — XSmall                     | 12px | `sizing-square-extra-small` |
| Icon Gap (all sizes)                   | 2px  | `margin-extra-tight`        |


> ¹ 20px H-Padding 无对应 `padding-` token；最近匹配为 `margin-extra-loose`（20px）。

> Position guide:
>
> - **44px** → page-level, fixed bottom toolbar, page header card
> - **36px** → large module, card
> - **28px** → small module, list, small card
> - **24px** → nav bar, high-density toolbar

---

## Capsule Button (胶囊按钮)

A pill-shaped variant of the standard button. Available in large (44px) size. Uses full-radius (height/2) for outer corners → `radius-circle`.

- Non-capsule variant also available ("非胶囊") with standard 4px radius → `radius-medium`
- Large button: min horizontal padding 20px
- Width is configurable based on business context

---

## Icon in Button

Icon support follows the size rules above:


| Button Size | Icon Size | Token                       | Gap to Text | Token                |
| ----------- | --------- | --------------------------- | ----------- | -------------------- |
| 44px        | 20px      | `sizing-square-medium`      | 2px         | `margin-extra-tight` |
| 36px        | 16px      | `sizing-square-base-small`  | 2px         | `margin-extra-tight` |
| 28px        | 16px      | `sizing-square-base-small`  | 2px         | `margin-extra-tight` |
| 24px        | 12px      | `sizing-square-extra-small` | 2px         | `margin-extra-tight` |


Single-icon-only buttons follow the same size rules. Reference icons from `assets/icons/`.

---

## States

### Loading (加载)

- Replaces button label with a spinner; **button size does not change**
- Text/icon-only buttons do **not** have a loading state


| Button type      | Light mode overlay                      | Dark mode overlay                             |
| ---------------- | --------------------------------------- | --------------------------------------------- |
| Primary (solid)  | bg + 10% white                          | bg + 6% white                                 |
| Secondary (gray) | bg + `color-click` (`rgba(0,0,0,0.10)`) | bg + `color-click` (`rgba(255,255,255,0.10)`) |


> Primary 按钮 loading 叠色为白色覆盖，无对应 token；Secondary 使用 `color-click`。

### Disabled (禁用)


| Button type         | Background              | Token                       | Text opacity | Token                         |
| ------------------- | ----------------------- | --------------------------- | ------------ | ----------------------------- |
| Primary (solid red) | `rgba(46,88,255,0.50)`  | `color-background-disabled` | 24%          | `color-text-quaternary` 透明度参考 |
| Secondary (gray)    | `color-background-weak` | `color-background-weak`     | 18%          | —                             |


### Pressed (按下)


| Button type         | Overlay            | Token         |
| ------------------- | ------------------ | ------------- |
| Primary / Secondary | `rgba(0,0,0,0.10)` | `color-click` |


---

## Usage Rules


|     | Rule                                                                     |
| --- | ------------------------------------------------------------------------ |
| ✅   | Max **1 primary button** per container/page                              |
| ✅   | Primary at 44px for page-bottom toolbars; smaller sizes for cards        |
| ✅   | Secondary can appear multiple times in the same container                |
| ✅   | Text/icon buttons for nav bar, high-density toolbars                     |
| ✅   | Width is configurable (adjustable left/right padding for business needs) |
| ❌   | Never use more than one primary button in the same visual container      |
| ❌   | Don't use primary button for low-importance actions                      |
| ❌   | Text/icon buttons don't have a loading state — don't add one             |
| ❌   | White-bg button is only for use on gray page backgrounds                 |


---

## Typical Scenarios


| Scenario                                    | Button type   | Size |
| ------------------------------------------- | ------------- | ---- |
| Page's single main CTA (non-fixed position) | Primary       | 44px |
| Top card prominent action                   | Primary       | 44px |
| Fixed bottom toolbar                        | Primary       | 44px |
| Card inline action                          | Secondary     | 36px |
| List row action                             | Secondary     | 28px |
| Nav bar action                              | Tertiary/text | 24px |


---

## Examples

Button variants