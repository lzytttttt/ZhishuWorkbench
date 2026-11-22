# 知枢 · AI Native 教学工作台

> 基于调研报告《面向 AI Native 时代的 K-12 人工智能通识课程大纲设计》构建的教学工作台前端原型。
> 不按年级划分，而是按 **工程范式深度（感知 → 提示词 → 上下文 → 工作流）× 螺旋认知环（提问 → 探究 → 判断 → 创造）** 组织全部内容。

> **当前版本：v0.2**

## v0.2 新增

- **认知心率**：顶栏实时显示全站 AI 调用状态。调用中升至 110–130 bpm；失败或 Verifier 拦截后 6 秒内心律不齐；AI-Free 时拉成平线，结束时“除颤”一次。
- **纸上声响**：纸、印章、骰子、心跳等音效全部由 WebAudio 即时合成，无音频文件；支持 auto / on / off 三态。
- **印章与印章抽屉**：采纳、驳回、定稿、下课等关键决策以“盖章”反馈，并记录谁在什么对象上盖了什么章，形成可追溯的透明度审计。
- **AI-Free 落闸**：进入 AI-Free 时纸帘落下、朱砂线扫过；结束时需拉动红绳，避免误触。
- **课程螺旋图**：把四条范式轨道 × 四个认知阶段卷成一条路径，支持已授课 / 已验证 / Badcase 三种课程印章。
- **刮刮卡与配线架**：学生端投票揭晓改为刮开涂层；接口页新增配线架，一眼看清三堂会审与 Verifier 的模型接线。

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173 ，默认 Mock 模式，无需任何后端
npm run build      # 类型检查 + 生产构建
```

### 连接真实模型

```bash
cp .env.example .env.local
# 编辑 .env.local：
#   VITE_PROXY_TARGET=http://localhost:11434/v1   # 例如本地 Ollama / vLLM / 校内网关
#   VITE_DEFAULT_MODEL=qwen2.5:7b
#   PROXY_API_KEY=...                            # 如需要，仅代理侧可见
npm run dev
```

然后在左侧栏 **接口** 页切换到“真实接口”，点“测试连接”，再“保存并应用”。

### 体验课堂直播（老师 + 学生）

1. 左侧栏进入 **课堂**，选择课程后点“开启课堂”，得到 6 位课堂码。
2. 点“↗ 打开学生端”（可以多点几次，每个标签页就是一名学生），选昵称加入。
3. 回到老师标签页发起投票 / 共建审计 / 学习伙伴，或点顶栏 **AI-Free** 让全班进入纸笔推演。

默认的“本机课堂”通过 `localStorage + BroadcastChannel` 在**同一浏览器的多个标签页**间同步；跨设备的真实课堂需要实现 `docs/API.md` 第 4 节的 `/classroom` 接口，并在“接口”页把“课堂同步”切到远程。学生端地址：`#/student/<课堂码>`。

| 课堂活动 | 老师端 | 学生端 |
| --- | --- | --- |
| 课堂投票 | 模板 / 自定义题目、实时柱状图、参与率、揭晓答案 | 大按钮作答，揭晓前可改，揭晓后看结果与正确答案 |
| 共建 Badcase | 全班审计热力图、同句提交自动合并、采纳进入 Badcase 库 / 驳回并留言 | 审计画笔 + **必填核查依据**，查看老师的审阅结果 |
| 学习伙伴 | 选择课程与四种教育提示词功能；只看提问 / 拦截次数 | 输入复核 → 生成 → 输出复核 → 送达（通过复核前不显示） |
| AI-Free | 与顶栏开关联动，下发独立推演任务 | 整屏切换为宣纸草稿模式，所有 AI 功能暂停 |
| 透明度声明 | — | 自动汇总提示词迭代，填写核查与改写说明，生成声明并自评等级 |

技术栈：React 18 + TypeScript + Vite 5 · Three.js（@react-three/fiber + drei）· 原生 SVG / Canvas。

## 数据与接口层

```
页面 / 实验室
   │  useServices()  ← 唯一入口，页面不感知 Mock 还是真实后端
   ▼
服务契约 services/types.ts
   ├─ LLMProvider        stream() / chat() / listModels()
   ├─ RetrievalProvider  index() / search()
   ├─ VerifierProvider   check()                  ← 双层校验，fail-closed
   ├─ RubricEvaluator    scorePrompt()            ← 大模型失败自动回退规则
   ├─ BadcaseRepository  list() / addMany() / updateStatus() / remove()
   └─ ClassroomService   create() / load() / publish() / subscribe() / ping()  ← 事件溯源
   │
   ▼  container.ts 依据配置装配 + 统一挂载遥测
┌──────────── Mock（默认）────────────┐  ┌──────────── 真实接口 ────────────┐
│ MockLLM：脚本化示例 + 模拟流式      │  │ OpenAICompatibleLLM（SSE 流式）   │
│ LocalRetriever：二元组检索          │  │ HttpRetriever → /rag/*           │
│ LayeredVerifier：规则层             │  │ LayeredVerifier：LLM 审查 + 规则  │
│ HeuristicEvaluator：可解释规则      │  │ LLMRubricEvaluator（JSON 校验）  │
│ LocalBadcaseRepository：localStorage│  │ HttpBadcaseRepository → /badcases│
└─────────────────────────────────────┘  └──────────────────────────────────┘
```

- **场景标签 `Scenario`**：每次调用携带业务场景（如 `rag.open`、`verifier.judge`）。Mock 据此返回教学示例；真实模式通过 `X-Zhishu-Scenario` 透传给网关做路由与审计。
- **提示词集中管理**：`services/prompts.ts`，便于教研审阅与版本化。
- **调用遥测**：每次 AI 调用的场景 / 模型 / 耗时 / Tokens / 结果都会进入“接口”页的调用日志，可作为“AI 使用透明度”的课堂素材。
- **健壮性**：超时、取消（AbortController）、GET 指数退避重试、非幂等请求不重试、乐观更新失败回滚、返回结构校验。
- **安全**：密钥只存 sessionStorage；推荐由 Vite 代理或校内网关注入；Verifier 失败即拦截。

完整后端契约见 [docs/API.md](docs/API.md)。

## 功能模块

| 报告要素 | 产品映射 |
| --- | --- |
| LLM 为“认知心脏”的五件套架构 | **驾驶舱**：Three.js 跳动的认知心脏 + 全感官 / 加油站 / 手脚 / 刹车 |
| 三大课堂铁律 · AI-Free Thinking | 顶栏全局 **AI-Free 时段** 开关，界面切换为朱砂红，认知心脏“休眠” |
| 不少于 25% 无 AI 时段 · 教育提示词四大功能 | **备课编排台**：AI-Free 占比校验、系统提示词生成、**试运行**（流式对话 + Verifier 复核） |
| 教学化降维 | **降维实验室** 6 个沙盒；“开卷考场”已接入 LLM + RAG 服务 |
| 鉴赏力优先 · Badcase 飞轮 | **三堂会审**：4 个教学案例 + **自定义实时提问**（三个模型席位并行） |
| 双量规 | **双量规评价**：规则 / 大模型预评 + 教师逐项终审（AI 建议格子带标记） |
| 四级风险 · Verifier · 灰度回滚 | **安全护栏**：Verifier 校验流水线已接入服务层 |
| 数据与接口 | **接口**：模式切换、模型网关、会审席位、检索与持久化后端、调用日志、接口契约 |

## 目录结构

```
src/
├── fun/           # 体验层：认知心率 · 印章 · 音效 · AI-Free 落闸
├── services/      # 数据与接口层
│   ├── types.ts / errors.ts / config.ts / prompts.ts
│   ├── container.ts / ServiceContext.tsx / telemetry.ts
│   ├── http/        # fetch 封装、超时、重试、SSE 解析
│   ├── llm/         # MockLLM · OpenAICompatibleLLM
│   ├── retrieval/   # LocalRetriever · HttpRetriever
│   ├── verifier/    # LayeredVerifier
│   ├── evaluator/   # HeuristicEvaluator · LLMRubricEvaluator
│   ├── storage/     # LocalBadcaseRepository · HttpBadcaseRepository
│   └── classroom/   # 事件模型 · reducer · LocalClassroom · HttpClassroom
├── student/       # 学生端：加入、投票、共建审计、学习伙伴、AI-Free、透明度声明
├── hooks/         # useHashRoute · useStream · useClassSession · useNow
├── data/          # 报告内容结构化
├── store/         # 应用状态（AI-Free、Badcase、备课方案）· 教师课堂主持
├── three/         # Three.js 场景
├── labs/          # 降维实验沙盒
├── pages/         # 8 个功能页面
├── components/    # 通用组件
└── styles/        # 视觉系统
docs/API.md        # 后端接口契约
```
