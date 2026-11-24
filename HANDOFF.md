# 日记流：代码交接

更新：Codex，2026-11-04（UTC+8）。

## 源码与发布状态

- 公开仓库：<https://github.com/OPENSB/obsidian-diary-stream>，默认分支 `main`。
- 维护入口为可读的 `main.js` 和 `styles.css`；本仓库没有完整的原始 TypeScript 工程，也没有独立生产构建步骤。
- 用户已确认最终界面，并明确要求发布可通过 BRAT 更新的 0.1.5。0.1.5 包含前一轮功能提交 `8cf91eeecca72a2860d6d04d2ed823f4689315e6`；功能代码与已确认的 HTML 预览一致。
- `manifest.json`、`package.json` 和 `versions.json` 已同步到 0.1.5。发布资产为根级 `main.js`、`manifest.json` 和 `styles.css`。旧 0.1.4 标签和资产保留，不覆盖。
- 0.1.5 使用既有 BRAT 个人测试版渠道，没有申请 Obsidian 社区目录上架；社区后台扫描不作为本次 BRAT 发布结果。
- 用户日常库不由发布流程自动升级。此前只读核对的 Mac 日记库磁盘安装文件为旧 0.1.4，主程序和样式匹配 `0d3b9ac4ddbc1ac50b9ca42137aff5652ae60286`。用户需在 BRAT 选择 0.1.5 完成自己的更新；其他库和手机安装状态未验证。

## 已确认的交互

1. 标签显示在时间下方、正文上方。电脑顶部左右对齐，记录格子按可用宽度铺满，窄屏使用较大的格子。
2. 电脑搜索使用原生 `dialog`，左侧结果、右侧全文。手机搜索在原记录输入区展开。暂存写作草稿使用原 DOM，避免搜索时丢失输入。
3. 电脑搜索结果内无边框原位编辑。标题和标签在原位置更新，编辑控件从正文下方展开。
4. 点击控件以外的位置收起标题、标签和预览。收起标题/标签不会清空内容；尚未确认的有效标签会加入本次编辑状态，写入文件仍需点击保存。不要把收起行为改成删除内容。
5. Esc 按层级处理：先收起编辑控件，再请求结束编辑，最后才可关闭搜索。未保存的正文、标题、标签、待确认标签、附件和录音状态受退出检查保护。
6. 未保存确认支持继续、放弃和保存。保存失败或冲突不能销毁当前编辑器；输入保留，允许继续编辑或重试。保存期间禁止重复操作。
7. 搜索结果菜单、删除确认、撤销、源文件查看和图片灯箱不应被外部点击关闭搜索的逻辑打断。编辑期间锁定搜索条件，避免重绘覆盖输入。

## 实现入口

- `Composer.dismissTools()`：控件外部点击与 Esc 的收起规则。不要在文档捕获阶段移除用户正在点击的标签建议项。
- `Composer.editSignature()` / `isDirty()`：未保存修改判断。
- `DiaryStreamView.requestEditExit()`：保存/放弃/继续和失败恢复。
- `toggleSearch()` / `toggleDesktopSearch()`、`renderDesktopResults()`：两种搜索布局、草稿保留和结果选择。
- `heatWeeks()` / `renderHeat()`：按卡片宽度计算完整周数。日期选择不得因尺寸变化而丢失。
- `onClose()` / `Composer.destroy()`：清理文档事件、观察器、动画、弹层和媒体资源。保留减少动态效果支持。

## 验证与接手

```sh
npm run check
npm test
git diff --check
```

本次语法检查和 17 项自动测试通过。`tests/regression.cjs` 保留凌晨 4 点分日、完整日期、旧格式、冲突检查和换行格式回归；新增 `tests/layout.cjs`、`tests/search.cjs` 验证格子宽度、搜索退出区域和未保存状态。

本地浏览器 HTML 预览使用实际插件视图代码和只在内存中生效的示例存储。已检查桌面/手机尺寸搜索与编辑流程、原位正文位置、真实 Esc 与鼠标操作、标题/标签控件收起、保存/放弃/继续、模拟保存失败，以及删除与撤销。HTML 预览不连接真实日记库，刷新后示例恢复。

发布验收在隔离测试库中执行，不使用用户真实日记。浏览器模拟不代表 Android/iOS 真机通过。发布后需匿名读回三个精确资产 URL，并比较字节数和 SHA-256；已登录下载草稿不能替代匿名下载验收。用户日常库的升级仍由用户通过 BRAT 执行。

凌晨分日和文件排序沿用 README：凌晨 4 点前写入前一天文件，界面显示实际日期；补记不自动插回时间顺序。本轮不做旧日记批量改写。

以下编号为本轮最后一次功能代码提交；之后若仅更新文档，仓库最新 HEAD 以 GitHub 或 `git log -1` 为准。

## 2026-11-24 手机优先「柔雾软卡」改版交接（Antigravity，2026-11-24 00:32 UTC+8）

- **设计定稿**：围绕手机单手 + 输入法语音转文字 + 长段文字阅读，重构为「柔雾软卡（Soft Matte Clay）」风格，并避让 Obsidian 手机端底部原生导航栏。
- **核心改动**：
  1. **极简顶栏 + 底部抽屉**：顶部仅留月份触发（`11月 2026 ▾`）与搜索/筛选轻图标；手机端日历热力图与筛选/标签收纳为底部抽屉（支持拖动手柄下拉关闭）；桌面端保留双栏布局。
  2. **右下角悬浮圆笔 FAB + 原位展开动效**：避开 Obsidian 手机原生底部导航栏，点击右下角圆形笔按钮（或历史日期头部的 `+ 补记`）以动态坐标 `clip-path` + CSS `linear()` 临界阻尼弹簧曲线原位展开写作稿纸，同时严格支持 `prefers-reduced-motion`。
  3. **光标处图文穿插 + 折叠态底部缩略图带**：写作时在光标位置插入行内图片块（无原始 Markdown 语法干扰，保存时经 `resolveInlineImages` 原位写入 `![[...]]`）；长日记未展开时隐藏正文内原位图并在正文下方展示紧凑缩略图带（点击可开灯箱），点击右下角紧凑「展开 ⌄」后平滑舒展高度并将图片还原回文字原位。
  4. **补记双入口**：写作稿纸顶部时间胶囊可展开快捷补记面板（现在 / 昨天 / 前天 / 自定义时间 + 标记为补记开关），历史日期章节头亦提供 `+ 补记` 直达入口。
  5. **设置页新增 6 套外观色调**：`palette` 支持 `auto`（跟随 Obsidian 主题色）/ `mono` / `blue` / `green` / `violet` / `coral`，深浅模式即时生效。
- **验证与状态**：`npm run check`、`npm test`（23/23，新增 `tests/redesign.cjs` 6 项）和 `git diff --check` 全部通过；已同步版本至 `0.2.0` 供 BRAT 拉取（保留旧 0.1.4 / 0.1.5 标签与资产），尚未在 Obsidian 实机或手机真机验收。

## 2026-11-24 0.2.1 移动端真机问题修复（Antigravity）

- **修复内容**：
  1. 按钮重置权重由 `:where(.ds-root button)` 提升为 `body .ds-scope.ds-root button` + `.ds-scope.ds-root .ds-xxx`，移除 `.ds-send` 上的 `.mod-cta`，修复顶部月份触发器、搜索/筛选图标、卡片弹出菜单、「+ 补记」、快捷标签与「保存」按钮被 Obsidian 移动端原生样式覆盖的问题。
  2. 将卡片右上角 `⋯`、抽屉关闭 `×`、日历切月箭头与附件移除图标的 `data-icon` 迁至内部空 `<span>`，并将 `icons()` 跳过条件改为 `!x.querySelector("svg")`，修复图标因 `.ds-sr-only` 子节点而隐身的问题。
  3. 移除 `.ds-wrap` 的 `transform: scale(0.984)` 避免破坏日历抽屉 `position: fixed`；放弃 `clip-path` 与过冲弹簧，三个底部抽屉改为通过 Obsidian 原生 `Modal`（`DiarySheetModal`）承载，原生避让底部悬浮导航栏并正确响应安卓返回键；其余弹层接入 `app.keymap` `Scope` 逐级拦截返回。
  4. 完善 `syncViewport()`（监听 `visualViewport.resize/scroll` 与 `window.resize`、计算 `--ds-kb-lift` 与 `adjustPan` 限高兜底），修复软键盘弹出时写作抽屉顶部被顶出屏幕的问题。
  5. 移动端隐藏右下角小白色 `↑` 按钮，仅保留单个橙色写作 FAB，并支持轻点顶部「日记流」标题回到顶部。
- **验证与状态**：`npm run check`、`npm test`（28/28）及 `390×844` 移动端仿真浏览器 QA 全部通过；已发布 `0.2.1` 供 BRAT 拉取，待用户安卓真机验收。

## 2026-11-24 0.2.2 安卓真机复测问题修复（Antigravity）

- **修复内容**：
  1. 写作弹窗（`.is-write-modal`）改为顶部悬停圆角卡片（`align-items: flex-start`，紧贴状态栏下方展开，`max-height: min(52dvh, 410px)`）并在右上角「保存」旁增加自定义圆润 `×` 按钮，彻底解决安卓软键盘不收缩视口时盖住输入框的问题；日历/筛选抽屉维持底部滑出。
  2. 搜索未开启时隐藏 `.ds-entry` 并移除 `.ds-main` 的全局 `gap`，消除顶栏「11月 2026」与首个日期头之间 ~40px 的多余空白（降至 ~8px）。
  3. CSS 与 `DiarySheetModal.onOpen()` 双重隐藏 Obsidian 移动端原生黑色 `.modal-close-button`（覆盖 `body.is-phone .modal-close-button { display: flex !important; }`）。
  4. 搜索收起时先在 `.ds-search-dock` 原位淡出折叠再归位 `36×36` 搜索壳，并锁定 `.ds-search-slot` 尺寸与 `.ds-month-trigger` 不换行，修复关闭搜索时「11月 2026」闪动。
- **验证与状态**：`npm run check`、`npm test`（28/28）及严苛移动端仿真 QA（不收缩视口 340px 键盘直盖 + 原生黑色 `×` 强覆盖）全部通过；已发布 `0.2.2` 供 BRAT 拉取，待用户真机复测。

## 2026-11-24 0.2.3 手机端全屏沉浸式写作页（Antigravity）

- **改动内容**：
  1. 手机/窄屏写日记由悬浮小卡片重构为**全屏沉浸式写日记页**（纯色画布铺满 `inset: 0`，隐藏背景暗遮罩），消除上下左右灰缝与割裂感；桌面宽屏仍保持居中卡片弹窗。
  2. 顶栏精简为单行原生导航：`←` 返回 + `🕒 时间/补记 ⌄` + 右侧「保存」；输入区宽敞留白，下方仅留 1 行精简工具条并处于键盘上方。
  3. 标签交互做减法：默认不摊开 `# 输入新标签` 与常用标签条；点击 `# 标签` 按需展开（并屏蔽空输入时冗余向上补全浮层），点回正文自动收起并在正文下方保留已选标签胶囊。
  4. CSS 与 `DiarySheetModal` 的 `onOpen()` / 首帧 `rAF` 全面隐藏 `.modal` 与 `.modal-container` 内所有非内容区原生节点，根除移动端原生黑 `×`。
- **验证与状态**：`npm run check`、`npm test`（28/28）及移动端仿真 QA 通过；已发布 `0.2.3` 供 BRAT 拉取，待用户安卓真机验收。

## 2026-11-24 0.2.4 手机端写作工具栏跟随软键盘贴底（Antigravity）

- **改动内容（方案 A）**：
  1. 移除手机全屏写作页 `.ds-blocks` 的 `max-height: calc(50dvh - 110px)` 与 `flex: 0 1 auto` 硬编码上限，改为 `flex: 1 1 auto; min-height: 0; max-height: none;`，输入区撑满剩余空间，工具栏 `.ds-bar` 自动沉底并去掉多余下边框；点击 `.ds-blocks` 空白处可直接聚焦到输入末尾。
  2. 新增 `.ds-kb-probe` 探针与 `readKeyboardMetrics()` / `syncKbObservers()`，通过 `MutationObserver`（`body` / `:root` / `.app-container`）、`ResizeObserver`（底层 `ItemView` leaf）、`visualViewport` 及 Capacitor 键盘事件多路读取 Obsidian 原生 `--keyboard-height`、`--safe-area-inset-bottom`、`env(keyboard-inset-height)`、视口收缩与底层 leaf 高度差，算出不重复叠加的 `--ds-write-kb-inset` 驱动 `.ds-write-sheet` 底部避让。
  3. 键盘收起时贴屏幕底（仅避让手势条/Home Indicator），键盘弹起时工具栏紧贴键盘顶边；在 `adjustResize` 自动收缩视口的设备上自动扣除已收缩高度，避免双倍留白。
- **验证与状态**：
  - 本地检查：`npm run check`、`npm test`（29/29，新增 Android Edge-to-Edge / `adjustResize` 防重复叠加 / leaf 兜底测试）及 `git diff --check` 全部通过。
  - BRAT 发布：已发布公开 Release `0.2.4`（<https://github.com/OPENSB/obsidian-diary-stream/releases/tag/0.2.4>），匿名下载根级资产 `main.js`（160,081 B）、`manifest.json`（284 B）、`styles.css`（62,526 B）均返回 HTTP 200 且 SHA-256 与本地逐字节一致。
  - 真机验收：**用户已通过 BRAT 更新到 `0.2.4` 并在安卓真机实测确认修复**（工具栏可跟随软键盘贴底，不再悬在半空）；iOS 真机尚未验证。

## 2026-11-24 0.2.5 阅读与写作体验精修（Antigravity）

- **改动内容**：
  1. **卡片菜单新增「复制」**：右上角 `⋯` 菜单首位增加复制项（`sectionCopyText()` 提取干净副标题与正文，不含时间戳与标签行；`navigator.clipboard` + WebView `execCommand("copy")` 双路兜底并弹出提示），删除项移至菜单最底。
  2. **纯箭头展开 + 点正文即可展开**：折叠按钮去掉「展开/收起」文字改为 `28×28` 圆角小箭头；长日记折叠态下轻点正文非链接/图片区域可直接展开（自动避开划选文字），展开后再点正文不误收起。
  3. **日期头去月份 + 吸顶年月滚动切换 + 紧凑间距**：每日章节头改为单行 `日 + 星期 [+ 今天]`；顶部 `.ds-mhead` 吸顶并由 `syncVisibleMonth()` 随滚动自动更新年月（跨月/跨年自动切换，点开日历同步到当前月份）；收紧天数、卡片间距与手机卡片内边距。
  4. **草稿本地持久化 + FAB 小圆点**：按库名隔离（`ds-draft:<vault>`）在 `localStorage` 暂存未发草稿，杀后台/重载自动恢复，发送后清空；有草稿时右下角 FAB 亮提示点。
  5. **手机端编辑旧日记复用全屏写作页**：手机/窄屏 `⋯ → 编辑` 打开独立 `.ds-edit-sheet` 全屏页（保留未发新草稿、共享 `0.2.4` 键盘贴底机制与未保存离开确认）；桌面端及搜索结果原位编辑不受影响。
  6. **自动续加载 + FAB 阅读避让 + 微字数**：触底 360px 自动续加载更早 30 天；下滑阅读时 FAB 半透明轻缩避让文字，上滑或停顿约 0.9s 恢复；写作/编辑页底栏预览图标旁新增淡色实时字数（0 字时隐藏）。
- **验证与状态**：`npm run check`、`npm test`（35/35）与 `git diff --check` 通过；已发布 `0.2.5` 供 BRAT 拉取，待用户手机真机实测。

最后提交：f4361ce98facb21f4367699a77942e8078ce12e8
