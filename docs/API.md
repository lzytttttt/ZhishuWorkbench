# 知枢 · 后端接口契约 v1

前端通过 `src/services` 中的服务契约访问所有 AI 能力。切换到 **真实接口** 模式后，下列 HTTP 接口全部相对于网关地址（默认 `/api`）。

> 设计原则：**LLM 接口完全兼容 OpenAI Chat Completions**，因此可以直接对接 vLLM、Ollama、LM Studio、各类兼容网关；
> 检索与 Badcase 两组接口为知枢自定义，可按需逐步实现——未实现前，前端可继续使用“本地”后端。

---

## 1. 对话生成

### `POST /chat/completions`

OpenAI 兼容。前端会发送：

```json
{
  "model": "qwen2.5-7b-instruct",
  "messages": [{ "role": "system", "content": "..." }, { "role": "user", "content": "..." }],
  "temperature": 0.4,
  "max_tokens": 600,
  "stream": true,
  "stream_options": { "include_usage": true }
}
```

| 请求头 | 说明 |
| --- | --- |
| `Authorization: Bearer <token>` | 生产环境由网关 / 校园 SSO 注入；开发可由 Vite 代理注入 |
| `X-Zhishu-Scenario` | 业务场景（见下表），供网关路由、审计、配额与灰度使用；可在设置中关闭 |

- `stream: true` 时返回 `text/event-stream`，逐条 `data: {choices:[{delta:{content}}]}`，以 `data: [DONE]` 结束。
- 若网关忽略 `stream` 而直接返回 JSON，前端也能兼容。

**业务场景 `X-Zhishu-Scenario`**

| 场景 | 页面 | 建议策略 |
| --- | --- | --- |
| `rag.closed` | 开卷考场 · 闭卷考生 | 不挂载知识库 |
| `rag.open` | 开卷考场 · 开卷考生 | 低温度，强制引用 |
| `tribunal.answer` | 三堂会审 | 按席位路由到不同底座 |
| `tutor.reply` | 备课 · 试运行 | 课堂教学智能体，输出须经 Verifier |
| `verifier.judge` | 安全护栏 · 所有输出复核 | 使用独立模型，`temperature: 0` |
| `rubric.score` | 双量规评价 | 仅形成性评估，须教师终审 |

### `GET /models`

OpenAI 兼容：`{ "data": [{ "id": "..." }] }`。用于连通性检测与模型选择。

---

## 2. RAG 检索

### `POST /rag/index`

```json
{ "collection": "school-history", "chunks": [{ "id": "1", "text": "……", "source": "校史馆档案" }] }
```

成功返回 `204` 或任意 JSON。同一 `collection` 重复调用视为整体覆盖。

### `POST /rag/search`

```json
// 请求
{ "collection": "school-history", "query": "学校图书馆是哪一年建成的？", "k": 2 }
// 响应
{ "hits": [{ "id": "2", "text": "……", "source": "校史馆档案", "score": 0.83 }] }
```

`score` 越大越相关；无结果时返回 `{ "hits": [] }`（前端将引导模型诚实回答“我不知道”）。

---

## 3. Badcase 评估集

| 方法 | 路径 | 请求体 | 响应 |
| --- | --- | --- | --- |
| `GET` | `/badcases` | — | `{ "items": Badcase[] }` |
| `POST` | `/badcases` | `{ "items": NewBadcase[] }` | `{ "items": Badcase[] }`（服务端生成 `id / status / createdAt`） |
| `PATCH` | `/badcases/:id` | `{ "status": "found" \| "attributed" \| "fixed" \| "regression" }` | `204` |
| `DELETE` | `/badcases/:id` | — | `204` |

```ts
interface NewBadcase {
  question: string;
  model: string;
  excerpt: string;
  kind: 'hallucination' | 'logic' | 'bias' | 'format';
}
interface Badcase extends NewBadcase {
  id: string;
  status: 'found' | 'attributed' | 'fixed' | 'regression';
  createdAt: number; // 毫秒时间戳
}
```

---

## 4. 课堂实时同步

课堂采用**事件溯源**：教师与学生只追加事件，课堂状态由前端 `services/classroom/reducer.ts` 从完整事件日志推导。后端只需做到“可靠存储 + 按序广播 + 身份鉴权”，无需理解业务。

| 方法 | 路径 | 请求体 | 响应 |
| --- | --- | --- | --- |
| `POST` | `/classroom/sessions` | `{ "lessonId": "lego" }` | `{ "code": "K7Q2MZ" }`（同时写入 `session.open` 事件） |
| `GET` | `/classroom/sessions/:code/events` | — | `{ "events": Envelope[] }`；课堂不存在返回 `404` |
| `POST` | `/classroom/sessions/:code/events` | `{ "actor": "...", "event": ClassEvent }` | `{ "event": Envelope }`（服务端填写 `id / ts`） |
| `GET` | `/classroom/sessions/:code/stream?since=<ts>` | — | `text/event-stream`，见下 |
| `POST` | `/classroom/sessions/:code/presence` | `{ "studentId": "stu_..." }` | `204`；只广播、不入日志 |

**SSE 消息**（每条 `data:` 一个 JSON）：

```json
{ "type": "event", "event": { "id": "...", "ts": 1763780000000, "actor": "teacher", "event": { "type": "activity.start", "activity": { } } } }
{ "type": "presence", "studentId": "stu_ab12", "at": 1763780000000 }
```

连接建立时，服务端应先补发 `ts > since` 的历史事件，再推送实时事件；前端断线后以指数退避重连并携带最新 `since`，按事件 `id` 去重。

```ts
interface Envelope { id: string; ts: number; actor: 'teacher' | string; event: ClassEvent }

type ClassEvent =
  | { type: 'session.open'; lessonId: string }                 // 仅教师
  | { type: 'session.close' }                                  // 仅教师
  | { type: 'student.join'; student: { id; nickname; avatar; joinedAt } }
  | { type: 'activity.start'; activity: PollActivity | AuditActivity | ChatActivity } // 仅教师
  | { type: 'activity.stop' }                                  // 仅教师
  | { type: 'poll.vote'; activityId: string; option: number }
  | { type: 'poll.reveal'; activityId: string; reveal: boolean } // 仅教师
  | { type: 'aifree.set'; on: boolean; task?: string }         // 仅教师
  | { type: 'badcase.submit'; submission: Submission }
  | { type: 'badcase.review'; submissionIds: string[]; status: 'accepted' | 'rejected'; comment?: string } // 仅教师
  | { type: 'usage.report'; prompts: number; blocked: number };
```

**服务端必须做的校验**（原型中由客户端自报 `actor`，生产环境不可信任）：

1. `actor` 由服务端根据登录态 / 加入时签发的课堂令牌填写，忽略请求体中的值。
2. 标注“仅教师”的事件只接受教师身份。
3. 学生只能以自己的身份投票、提交、上报用量；`student.join` 中的 `id` 必须等于其身份。
4. 昵称再次做隐私过滤（电话、证件号等），并限制事件频率，防止刷屏。
5. 课堂结束后拒绝写入；事件日志按学校数据留存制度定期清理。

**隐私设计**：学习伙伴的聊天内容只留在学生设备上，课堂里只同步 `usage.report` 的计数。

---

## 5. 错误约定

| HTTP 状态 | 前端错误码 | 前端行为 |
| --- | --- | --- |
| 401 / 403 | `auth` | 提示检查鉴权 |
| 429 | `rate_limit` | GET 自动退避重试 1 次 |
| 5xx | `server` | GET 与对话生成自动重试 1 次 |
| 超时 | `timeout` | 默认 30 秒（仅约束首个响应，不限制流式时长） |

响应体建议：`{ "error": { "code": "string", "message": "人类可读说明" } }`。

**安全校验采用 fail-closed**：Verifier 服务不可用或返回无法解析时，前端一律拦截，不把内容送达学生。

---

## 5. 安全与隐私建议

1. **不要把模型密钥放进浏览器。** 生产环境由校内网关统一鉴权；开发环境用 `.env.local` 中的 `PROXY_API_KEY` 由 Vite 代理注入。
2. 网关侧落实：学生身份脱敏、红灯隐私过滤、按场景配额、调用审计留痕（对应报告中的“透明度义务”）。
3. 高利害场景（总结性评分、招生筛选）不应开放 `rubric.score` 之外的自动评分接口。
4. 优先部署本地 / 教育专网开源模型，并以国家审定教材与校本资料作为 RAG 授信知识源。
