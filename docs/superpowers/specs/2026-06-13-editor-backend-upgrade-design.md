# 成熟编辑器与本地后端升级设计

## 背景

当前应用是原生 HTML、CSS、JavaScript 单页应用，数据保存在浏览器 `localStorage`。编辑器使用 `contenteditable` 和浏览器原生 `document.execCommand` 实现轻量富文本能力。近期检查发现，固定工具栏虽然都有入口，但部分命令不稳定：内联格式依赖选区状态，表格可能插入到不合适的节点中，链接和图片只是基础 `prompt`，缺少一致的数据模型和行为测试。

用户已确认本次方向为：引入成熟编辑器，并升级后端支持。目标不是继续缝补现有手写工具栏，而是把编辑器、数据持久化和后续扩展能力一起升级。

## 外部技术依据

- Tiptap 官方 React 集成文档说明其可与 Vite 工作流配合使用，并通过 `@tiptap/react`、`@tiptap/pm`、`@tiptap/starter-kit` 组成编辑器基础能力。
- Tiptap `StarterKit` 覆盖常用节点、标记和历史记录，适合作为富文本编辑器起点。
- Tiptap 官方入门建议从 StarterKit 开始，再按需要增加字符计数、占位符、图片、表格和自定义节点等扩展。
- Express 官方文档定位为 Node.js 的轻量 Web 应用框架，Express 5 要求 Node.js 18 或更高版本。
- SQLite 官方文档将其描述为小型、快速、自包含、高可靠、全功能的 SQL 数据库引擎，适合本地应用和嵌入式数据存储。

参考：

- https://tiptap.dev/docs/editor/getting-started/install/react
- https://tiptap.dev/docs/editor/extensions/functionality/starterkit
- https://tiptap.dev/docs/editor/getting-started/overview
- https://expressjs.com/en/starter/hello-world/
- https://expressjs.com/en/api/
- https://sqlite.org/

## 目标

- 将手写 `contenteditable` 编辑器替换为 Tiptap 编辑器。
- 将记录正文从散落的 HTML 字符串升级为结构化 Tiptap JSON，并保留可导出的 Markdown / HTML。
- 增加本地 Node.js 后端，用 API 管理书籍、记录、标签、封面、备份和迁移。
- 使用 SQLite 保存主要数据，避免长期依赖浏览器 `localStorage`。
- 保留当前产品气质：安静、克制、桌面优先、编辑器最高优先级。
- 保留旧数据迁移路径，让已有 `localStorage` 数据可以导入新后端。
- 为编辑器行为增加自动化测试和浏览器烟测，避免再出现“按钮有入口但功能不可靠”。

## 非目标

- 不做云同步、账号系统、多人协作或权限体系。
- 不做在线电子书阅读器。
- 不在第一阶段实现 OCR、PDF 标注、AI 摘要或全文搜索高级语法。
- 不把应用改成营销页或内容流。
- 不一次性支持复杂附件库。本阶段图片先支持 URL 和后端托管封面，编辑器正文图片上传可作为后续阶段。

## 推荐架构

升级后应用成为本地 Web 应用：

- 前端：Vite + React。
- 编辑器：Tiptap + ProseMirror。
- 后端：Node.js + Express。
- 数据库：SQLite。
- API 通信：前端通过 `/api/*` 调用本地后端。
- 数据文件：默认放在项目内 `data/reading-notes.sqlite`，后续可配置到用户文档目录。
- 静态资源：开发期由 Vite 提供前端，后端提供 API；生产/本地运行期后端可托管构建后的静态文件。

这种方案把编辑器复杂度交给成熟编辑器框架，把本地数据一致性交给 SQLite，同时仍然保持单机、本地优先的知识工作台体验。

## 编辑器设计

### 功能范围

第一阶段工具栏必须可靠支持：

- 标题：H1、H2、H3。
- 内联：加粗、斜体、下划线、删除线、行内代码。
- 块级：引用、有序列表、无序列表、代码块。
- 插入：链接、图片 URL、表格、分割线。
- 编辑：撤销、重做、清除格式。
- 状态：当前格式高亮、禁用态、保存状态、字数统计。

### Tiptap 扩展

基础扩展：

- `StarterKit`：段落、标题、列表、引用、代码块、历史等基础能力。
- `Underline`：下划线。
- `Link`：链接。
- `Image`：图片 URL。
- `Table`、`TableRow`、`TableHeader`、`TableCell`：表格。
- `Placeholder`：空内容提示。
- `CharacterCount`：字数统计。

样式继续由项目 CSS 控制，不直接使用喧闹的编辑器默认视觉。工具栏按 DESIGN.md 保持轻、短、近，桌面端固定在纸面顶部，后续可再补选区浮动工具条。

### 内容模型

每条记录分为两个可编辑区域：

- `quoteDoc`：摘录原文，仅在摘录/随笔类型中显示。
- `bodyDoc`：随笔正文或感想正文。

数据库保存 Tiptap JSON；后端或前端派生纯文本摘要、字数和 Markdown 导出内容。旧 HTML 字段迁移时转换为 Tiptap 可接收的 HTML，再保存为 JSON。

## 后端设计

### API 范围

后端提供以下资源：

- `GET /api/health`：运行状态。
- `GET /api/bootstrap`：一次性返回书籍、记录、主题、标签和应用设置。
- `GET /api/books`、`POST /api/books`、`PATCH /api/books/:id`、`DELETE /api/books/:id`。
- `GET /api/notes`、`POST /api/notes`、`PATCH /api/notes/:id`、`DELETE /api/notes/:id`。
- `GET /api/tags`、`POST /api/tags`、`PATCH /api/tags/:id`、`DELETE /api/tags/:id`。
- `POST /api/import/local-storage`：导入旧 JSON 数据。
- `GET /api/export`：导出完整备份 JSON。
- `GET /api/notes/:id/export.md`：导出单条 Markdown。

### 数据表

核心表：

- `books`
  - `id`
  - `title`
  - `author`
  - `status`
  - `cover_color`
  - `cover_image`
  - `created_at`
  - `updated_at`
- `notes`
  - `id`
  - `type`
  - `title`
  - `book_id`
  - `quote_doc_json`
  - `body_doc_json`
  - `quote_text`
  - `body_text`
  - `page`
  - `favorite`
  - `created_at`
  - `updated_at`
- `themes`
  - `id`
  - `name`
  - `color`
  - `source`
  - `created_at`
  - `updated_at`
- `note_themes`
  - `note_id`
  - `theme_id`
- `tags`
  - `id`
  - `name`
  - `created_at`
  - `updated_at`
- `note_tags`
  - `note_id`
  - `tag_id`
- `app_settings`
  - `key`
  - `value_json`

所有删除默认先保持简单硬删除，但删除书籍前需要确认并处理关联记录。第一阶段不引入软删除回收站。

### 保存策略

前端编辑器输入后防抖保存。后端以 `PATCH /api/notes/:id` 更新对应字段。保存中显示“保存中”，成功显示“已保存”，失败显示“保存失败，稍后重试”，并保留前端内存中的未保存内容，避免直接覆盖。

## 旧数据迁移

迁移入口保留在应用启动阶段：

1. 前端读取旧 `localStorage` 中的 `reading-notes-app:v1`。
2. 如果后端数据库为空，提示用户导入旧数据。
3. 前端把旧 JSON 发送到 `POST /api/import/local-storage`。
4. 后端复用现有迁移规则，转换书籍、主题、记录、标签和收藏状态。
5. 旧 HTML 内容转换成 Tiptap JSON；转换失败时保存为纯文本段落，并在导入结果中提示。
6. 导入完成后保留旧 `localStorage`，不自动清除，避免误删。

## 前端界面设计

整体布局延续当前三栏/编辑器纸面设计：

- 左侧：书架、标签、收藏、时间线。
- 中间：书籍、记录列表或编辑纸面。
- 右侧：创作侧栏、书籍元信息、标签和封面管理。

编辑器工具栏调整为稳定的命令按钮：

- 使用图标优先，文字作为必要补充。
- 按钮根据当前选区状态显示 active。
- 对不可用命令显示 disabled。
- 链接、图片和表格使用小型浮层或对话框，不再使用浏览器 `prompt`。
- 表格插入始终插入到合法块位置，不允许嵌入标题、代码或链接内部。

## 错误处理

- 后端不可用：前端显示“本地数据服务未启动”，不进入编辑误保存状态。
- 保存失败：保留当前编辑内容，显示低干扰错误状态，并提供重试。
- 数据库初始化失败：后端启动失败并输出明确错误，不创建半成品数据库。
- 导入失败：不写入部分数据；返回失败原因。
- Markdown 导出失败：不影响当前记录，提示重新尝试。

## 测试策略

自动化测试：

- 后端 API 测试：书籍、记录、标签、导入、导出、删除关联。
- 数据迁移测试：旧 v1 localStorage 数据到 SQLite 的转换。
- 编辑器序列化测试：Tiptap JSON、HTML、纯文本和 Markdown 互转。
- 前端组件测试：工具栏按钮 active/disabled 状态和命令调用。

浏览器烟测：

- 打开编辑器，输入内容，自动保存成功。
- H1/H2/H3、加粗、斜体、列表、引用、表格、链接、图片 URL、代码块全部能生效。
- 刷新页面后内容从 SQLite 恢复。
- 导出 Markdown 包含标题、元信息、摘录和正文。
- 旧数据导入后书籍、记录、标签、收藏和时间线可见。

## 分阶段实施

### 阶段 1：工程底座

- 新增 `package.json`。
- 引入 Vite + React。
- 新增 Express 后端。
- 新增 SQLite 初始化和迁移脚本。
- 保留当前静态页面作为迁移参考，不在第一步删除。

### 阶段 2：数据 API

- 实现数据库 schema。
- 实现书籍、记录、标签、主题 API。
- 实现导入旧数据和导出备份。
- 增加后端测试。

### 阶段 3：Tiptap 编辑器

- 用 React 实现编辑器页面。
- 接入 Tiptap 扩展和稳定工具栏。
- 实现自动保存、字数统计、Markdown 导出。
- 增加编辑器行为测试和浏览器烟测。

### 阶段 4：替换旧界面

- 迁移书架、记录列表、侧栏和时间线到新前端。
- 对齐 DESIGN.md 的视觉风格。
- 移除不再使用的旧手写编辑器逻辑。

## 风险与缓解

- 风险：一次性重写范围较大。
  - 缓解：按阶段保留旧页面，先让 API 和编辑器跑通，再替换列表与侧栏。
- 风险：Tiptap JSON 与旧 HTML 迁移存在边界情况。
  - 缓解：导入时保存原始 HTML 备份字段，转换失败降级为纯文本段落。
- 风险：引入构建工具后运行方式变复杂。
  - 缓解：提供 `npm run dev`、`npm run build`、`npm test` 和 README 更新。
- 风险：本地后端端口冲突。
  - 缓解：默认端口可配置，启动失败时给出清晰提示。

## 验收标准

- 旧数据可导入并在新界面中正常浏览。
- 编辑器工具栏第一阶段列出的命令全部可用且可测试。
- 内容刷新后仍从 SQLite 正确恢复。
- 单条记录可导出 Markdown。
- 应用仍符合 DESIGN.md 的桌面知识工作台风格。
- 新增测试通过，浏览器烟测通过。
