# PRD：Generative UI Playground

> **状态**：已定稿（基于 GlassPortal 扩展，2026-11-17）  
> **原则**：不新开无关项目；在现有 GlassPortal 上增加独立模块；做成生成→预览→评估→迭代闭环，而不是普通 AI 聊天框。  
> **实现进度**：第二阶段（生成闭环）开发中 — `/generative-ui` Workspace 已落地。

---

## 0. 人话版摘要（30 秒看懂）

做一个 **AI 设计工作台**：你用一句话描述想要的网页 → AI 听懂需求 → 生成「页面图纸」（结构化 UI Schema）→ 在浏览器里真实画出来 → AI/规则挑毛病打分 → 自动改一版 → 留下历史和分数，方便演示和面试讲解。

| 技术说法 | 人话 |
| --- | --- |
| Design Intent Parser | 先听懂你要什么（页面类型、风格、组件清单） |
| UI Schema | 页面图纸（JSON），不是随便一段可执行代码 |
| Component Registry / Renderer | 只允许用登记过的积木搭页面（安全） |
| Critique | 设计评审：布局、层级、间距、字体、颜色、完整度 |
| Revision Agent | 按评审意见自动改一稿 |
| Eval Dashboard | 成绩单 + 实验记录本 |

---

## 1. 产品基本信息

| 项 | 内容 |
| --- | --- |
| 产品名称 | Generative UI Playground |
| 产品定位 | 基于大语言模型的自然语言 UI 生成与质量评估工具 |
| 目标用户 | 前端开发者、AI 应用开发者、设计师 |
| 核心目标 | 自然语言 → 可预览、可修改、可评估的 Web UI |
| 开发方式 | **基于现有 GlassPortal 扩展**（同仓、同部署） |
| 入口路由 | `/generative-ui`（实现时固定此路径） |
| 第一阶段目标 | 单人可演示的 Web MVP |
| 明确不做（MVP） | RLHF / DPO / 模型微调；任意执行模型返回的 JS；把门户主站改成聊天页 |

### 1.1 与现有项目的关系

| 现有资产 | 复用方式 | 优先级 |
| --- | --- | --- |
| GlassPortal | 主前端、组件、API Routes、Vercel 部署、KV 存储模式、Schema→Renderer 心智模型 | 最高 |
| Python / Pandas 数据处理经验 | 第四阶段：评估统计、CSV/报告（可独立脚本） | 高 |
| Dify / Coze Agent 实践 | 参考多步骤：解析→生成→检查→修正 | 高 |
| 桌面 GUI / 自动化工具经验 | 仅参考任务流，不搬代码 | 低 |

**不合并成巨型单体，不重写 GlassPortal 的 Notion 门户主链路。**

---

## 2. 现有仓库基线（GlassPortal）

### 2.1 技术栈

- Next.js 14 App Router + TypeScript + React 18  
- Tailwind CSS、framer-motion、lucide-react  
- Notion API（`@notionhq/client`）  
- 存储：Upstash / Vercel KV（`src/lib/kv-json.ts`），本地回退 `.data/`  
- 部署：Vercel  

### 2.2 已有能力（可复用）

- **结构化块 → 白名单渲染**：`parser.ts` + `PortalRenderer`（与 UI Schema → Renderer 同构）  
- Studio 双栏预览 + 手机分步向导  
- `GlassCard` / 主题预设 / Executive 视觉规范  
- KV 文档读写模式（branding / plan）  
- 服务端 Route Handler 模式  

### 2.3 技术差距（本产品要补齐）

- 无 LLM 调用与 Prompt 工程  
- 无通用 UI Schema / Zod 校验  
- 无 Critique / Revision / 生成历史 / 评估看板  
- 顾问 Auth 在浏览器本地 → **不能**保护模型 API Key（Key 必须仅服务端）  

---

## 3. 核心功能需求

### 模块 A：Design Intent Parser（设计意图解析）

**用户输入示例：**

> Create a modern SaaS analytics dashboard with a sidebar, KPI cards, revenue chart and recent transactions. Use a clean minimal style.

**系统提取字段：**

| 字段 | 示例 | 人话 |
| --- | --- | --- |
| 页面类型 | SaaS Dashboard | 这是什么页 |
| 视觉风格 | Minimal | 长什么样 |
| 布局结构 | Sidebar + Main | 骨架怎么排 |
| 页面组件 | KPI、Chart、Table | 要有哪些积木 |
| 主色调 | Neutral / Blue | 主色感觉 |
| 响应式要求 | Desktop + Mobile | 要不要适配手机 |

输出：**结构化 JSON（DesignIntent）**，作为后续生成输入。

---

### 模块 B：UI Generator（UI 生成）

- 根据解析结果调用 **服务端** LLM API（OpenAI-compatible）。  
- **优先生成受约束的 UI Schema**，再渲染成 React；第一版不以「任意 React 源码执行」为主路径。  
- 至少三种视觉风格：**Minimal / Modern SaaS / Editorial**；并支持 **Night Sky（暗黑极客夜空）**。  
- Workspace 可对 **背景 / 卡片 / 表格** 分层调色（互不绑死）。  
- 支持常见布局与组件：侧栏、卡片、按钮、图表、表格等。  
- 保存：原始 Prompt、解析结果、模型版本、生成结果（可追踪）。  

**Schema 示例：**

```json
{
  "pageType": "dashboard",
  "theme": "minimal",
  "layout": {
    "type": "sidebar-main",
    "sidebar": true
  },
  "components": [
    {
      "type": "kpi-card",
      "title": "Total Revenue",
      "value": "$24,800"
    },
    {
      "type": "chart",
      "chartType": "line",
      "title": "Revenue Overview"
    },
    {
      "type": "table",
      "title": "Recent Transactions"
    }
  ]
}
```

**安全红线：** 不允许未经验证的模型代码在主应用中直接执行。

---

### 模块 C：UI Renderer（实时渲染）

- UI Schema → React Component Registry（白名单）。  
- 预览尺寸：**Desktop / Tablet / Mobile**。  
- 支持主题/风格切换与常见布局组件。  
- 生成后展示**真实渲染结果**（不是截图占位）。  

---

### 模块 D：UI Critique（设计质量检查）

模型以 UI Reviewer 角色分析；并配合**确定性规则检查**。

| 评估维度 | 检查内容 | 人话 |
| --- | --- | --- |
| Layout | 布局是否合理 | 排得乱不乱 |
| Visual Hierarchy | 视觉层级是否清晰 | 眼睛先看哪 |
| Spacing | 间距是否统一 | 挤不挤、空不空 |
| Typography | 字体层级是否合理 | 标题/正文分得清不清 |
| Color | 配色是否协调 | 颜色打架吗 |
| Completeness | 是否缺少用户要求的组件 | 有没有漏做 |

**输出：** 总分、各维分数、具体问题、修改建议、是否建议重新生成。

**诚信要求：**  
- 评估必须来自**真实规则结果**和/或**真实模型调用**。  
- **禁止**用静态假数据冒充评估。  
- 对外表述：第一版是辅助评估，**不是**经人工标注验证的客观审美金标准。  

---

### 模块 E：Revision（自动修改）

- 根据 Critique 生成修改指令。  
- 将指令 + 原 Schema 交给模型 → 新 Schema → 重新渲染。  
- 展示修改前后两个版本。  
- 记录每次修改的 Prompt 与评分。  

---

### 模块 F：Eval Dashboard（评估看板）

- 记录每次生成任务。  
- 保存 Prompt、模型、版本、评估结果。  
- 展示不同风格评分差异、成功率、平均分、改前改后变化。  
- 支持导出 **JSON / CSV**。  

---

## 4. 页面结构（仅四个核心页）

| 页面 | 路径（建议） | 职责 | 人话 |
| --- | --- | --- | --- |
| Workspace | `/generative-ui` | 输入需求、选风格、生成、实时预览 | 设计草稿间 |
| UI Inspector | `/generative-ui/inspector` | 组件树、布局/颜色/字体结构 | 看图纸细节 |
| Critique & Revision | `/generative-ui/critique` | 问题、建议、前后对比、一键改稿 | 评审 + 改稿 |
| Evaluation Dashboard | `/generative-ui/dashboard` | 历史、分数、导出 | 成绩单 |

可由 Workspace 内 Tab/分栏承载 Inspector / Critique，但信息架构上必须具备上述四块能力。

---

## 5. 技术架构

### 5.1 选型

| 层级 | 技术选型 | 人话 |
| --- | --- | --- |
| 前端 | Next.js、React、TypeScript、Tailwind | 沿用 GlassPortal |
| UI | 现有 Glass/Executive 组件优先；Shadcn **按需后期** | 先别大换皮 |
| 后端 | Next.js API Routes（主）；Python 仅用于后期统计脚本 | 少造轮子 |
| 模型 | OpenAI-compatible LLM API；Key 仅服务端环境变量 | 钥匙锁后台 |
| 结构化输出 | JSON Schema + Zod 校验 | 图纸要过安检 |
| UI 渲染 | React Component Registry | 白名单积木 |
| 存储 MVP | 现有 KV（`kv-json`）文档模型 | 先跑通 |
| 存储目标 | PostgreSQL / Supabase（与下表对齐） | 数据多了再迁 |
| 图表 | Recharts | Dashboard / chart 组件 |
| 部署 | Vercel | 不变 |

### 5.2 流水线

```
User Prompt
    → Design Intent Parser
    → Structured UI Schema
    → UI Generator (LLM)
    → Schema Validator
    → React Component Renderer
    → Live UI Preview
    → UI Critique / Evaluation（规则 + 真模型）
    → Revision Agent
    → New UI Version
    → Evaluation History & Dashboard
```

### 5.3 推荐目录（增量，不拆仓）

```
src/app/generative-ui/           # 四块产品面
src/app/api/genui/               # intent / generate / critique / revise / runs / dashboard / export
src/components/genui/            # Renderer、DeviceFrame、CritiquePanel、History…
src/lib/genui/                   # types、schema(Zod)、prompts、llm、critique、revision、stores
src/config/genui.ts              # 模型名、风格、分数阈值、限额
```

---

## 6. 数据模型

### 6.1 逻辑表（目标形态 / 与 PRD 对齐）

| 数据表 | 核心字段 | 人话 |
| --- | --- | --- |
| projects | id、name、created_at | 项目夹 |
| generations | prompt、design_spec、ui_schema、model、status | 每一次生成 |
| evaluations | generation_id、scores、issues、feedback | 成绩单 |
| revisions | generation_id、revision_prompt、new_schema | 改稿记录 |
| eval_cases | input_prompt、expected_components、style、tags | 标准考题（≥20） |

### 6.2 MVP 物理存储（KV Key）

```
genui:run:{runId}
genui:rev:{revisionId}
genui:eval:{evaluationId}
genui:index:runs:{ownerKey}
genui:index:evals:recent
```

接口与字段按「逻辑表」设计，便于迁 Supabase。

---

## 7. API 设计

| Method | Path | 作用 | 人话 |
| --- | --- | --- | --- |
| POST | `/api/genui/intent` | NL → DesignIntent | 听懂 |
| POST | `/api/genui/generate` | 生成 Schema + 落库 | 画第一稿 |
| POST | `/api/genui/critique` | 规则 + 真 LLM 评审 | 打分挑刺 |
| POST | `/api/genui/revise` | 按评审生成新版 | 自动改稿 |
| GET | `/api/genui/runs` | 历史列表 | 翻历史 |
| GET | `/api/genui/runs/[runId]` | 详情（含版本与评估） | 看某一单 |
| GET | `/api/genui/dashboard` | 聚合统计 | 看板 |
| GET | `/api/genui/export` | 导出 JSON/CSV | 交作业 |

**约定：** 无 Key / LLM 失败必须返回明确错误；**不得**写入假 Evaluation。

---

## 8. 分阶段计划与验收

### 第一阶段：检查现有项目 ✅

- 输出架构分析、可复用清单、差距、改造方案。  
- **不直接改业务代码（分析阶段）。**  

### 第二阶段：UI 生成闭环（下一步实现）

- Prompt 输入、意图解析、LLM 结构化输出、Schema Renderer、三风格、多尺寸预览。  

**验收：**

- [ ] 一句话生成完整可预览页面（真 LLM）  
- [ ] ≥3 种风格  
- [ ] Desktop / Tablet / Mobile 可切换  
- [ ] 非法 Schema 被拒绝；不执行任意 JS  
- [ ] API Key 不出现在客户端  
- [ ] 每次生成可追踪（run / revision）  
- [ ] GlassPortal `/`、`/p/[id]` 无回归  

### 第三阶段：AI 评估与迭代

- Critique 六维、Revision、前后对比、生成历史。  

**验收：**

- [ ] 六维分析有真实输出  
- [ ] 至少自动修改一次  
- [ ] 改前改后可比较评分/问题  
- [ ] 历史可回放 Schema  

### 第四阶段：评估数据与演示

- ≥20 条测试 Prompt；导出报告；部署线上 Demo。  

**建议测试场景：**

| 场景 | 目标 |
| --- | --- |
| SaaS 数据后台 | 复杂布局 |
| 极简产品落地页 | 视觉层级 |
| 电商商品详情 | 组件完整度 |
| Editorial 内容站 | 风格多样性 |
| 移动端管理页 | 响应式 |

**验收：**

- [ ] 历史 + 导出 JSON/CSV  
- [ ] 线上 Demo 可演示完整闭环  
- [ ] 面试可讲清：生成质量 / 自动评估 / 迭代变好  

---

## 9. 打动招聘方的三个重点

1. **生成质量**：同一 Prompt，不同风格是否都达标？  
2. **自动评估**：能否具体指出 UI 问题（不是空泛「再优化」）？  
3. **迭代能力**：Critique → Revision 后，第二版是否明显更好？  

---

## 10. 环境变量（实现时写入 `.env.example`）

```
# Generative UI — server only
OPENAI_API_KEY=
# 或兼容网关
# OPENAI_BASE_URL=
GENUI_MODEL=gpt-4o-mini
```

---

## 11. 文档修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-11-17 | 首版定稿：合并仓库分析 + 产品 PRD；同仓 `/generative-ui`；Schema 优先；KV→Postgres 路径；四阶段与验收标准 |

---

**下一步：** 产品负责人确认本文档后，回复「开始第二阶段」，再在仓库中实现 Workspace + Intent + Generate + Renderer + 三风格预览。
