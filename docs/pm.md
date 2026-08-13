# PM API 修改提案

本文档列出 PM（私信）接口从新前端（React + SWR + 中文 UI）消费角度发现的需要修改的地方，
供评审与实施。当前实现位于：

- `routes/private/routes/pm.ts`
- `lib/pm/utils.ts`
- `lib/pm/type.ts`
- `lib/types/req.ts` / `lib/types/res.ts`

---

## 1. 为 PM 引入领域化稳定错误码（高优先级）

### 现状

错误响应结构已是 `{ code, error, message, statusCode }`，但 PM 目前只用通用码，
前端无法只靠 `code` 区分失败场景，只能匹配英文 `message`：

| 场景                  | 当前 code            | 当前 message                                         |
| --------------------- | -------------------- | ---------------------------------------------------- |
| 被 ban_post 禁止发信  | `NOT_ALLOWED`        | `you don't have permission to send private message`  |
| 标题/正文含不可见字符 | `BAD_REQUEST`        | `title/content contains invalid invisible character` |
| 收件人超 10 个        | `BAD_REQUEST`        | `at most 10 receivers`                               |
| 收件人不存在          | `NOT_FOUND`          | `user xxx not found`                                 |
| 发给自己              | `BAD_REQUEST`        | `cannot send private message to yourself`            |
| 被拉黑 / 隐私拒绝     | `NOT_ALLOWED`        | `send private message to this user`                  |
| 回复时会话不存在      | `NOT_FOUND`          | `conversation xxx not found`                         |
| 回复非本会话参与者    | `NOT_ALLOWED`        | `reply to this conversation`                         |
| 读/删时消息不存在     | `NOT_FOUND`          | `private message xxx not found`                      |
| 字段长度校验          | `FST_ERR_VALIDATION` | TypeBox 校验文本                                     |

### 问题

中文 UI 无法只靠 `code` 给用户准确提示，依赖英文 `message` 字符串匹配是脆弱的。

### 建议

每个预期失败模式一个稳定 `code`，前端做 `code → 中文文案` 映射，`message` 仅作兜底。
建议新增 `lib/pm/errors.ts`：

```ts
import { createError } from '@fastify/error';
import { StatusCodes } from 'http-status-codes';

/** 发件人自身被 ban_post 禁止（账户级，与收件人无关） */
export const PmSendBannedError = createError<[]>(
  'PM_SEND_BANNED',
  'you are not allowed to send private message',
  StatusCodes.FORBIDDEN,
);

/** 收件人侧拒绝：被拉黑 / 隐私 none / 隐私 friends（故意合并，保护隐私） */
export const PmSendNotAllowedError = createError<[]>(
  'PM_SEND_NOT_ALLOWED',
  'cannot send private message to this user',
  StatusCodes.FORBIDDEN,
);

export const PmReceiverNotFoundError = createError<[string]>(
  'PM_RECEIVER_NOT_FOUND',
  'user %s not found',
  StatusCodes.NOT_FOUND,
);

export const PmSendSelfError = createError<[]>(
  'PM_SEND_SELF',
  'cannot send private message to yourself',
  StatusCodes.BAD_REQUEST,
);

export const PmTooManyReceiversError = createError<[]>(
  'PM_TOO_MANY_RECEIVERS',
  'at most 10 receivers',
  StatusCodes.BAD_REQUEST,
);

export const PmContentInvalidError = createError<[string]>(
  'PM_CONTENT_INVALID',
  '%s contains invalid invisible character',
  StatusCodes.BAD_REQUEST,
);

/** 会话/消息不存在，或当前用户无权访问（故意合并为 404，避免探测） */
export const PmConversationNotFoundError = createError<[string]>(
  'PM_CONVERSATION_NOT_FOUND',
  'private message %s not found',
  StatusCodes.NOT_FOUND,
);
```

替换对照：

| code                        | HTTP | 场景                              | 前端中文文案             |
| --------------------------- | ---- | --------------------------------- | ------------------------ |
| `PM_SEND_BANNED`            | 403  | 发件人被 ban_post 禁止            | 你当前无法发送私信       |
| `PM_SEND_NOT_ALLOWED`       | 403  | 被拉黑 / 隐私 none / 隐私 friends | 无法给该用户发送私信     |
| `PM_RECEIVER_NOT_FOUND`     | 404  | 收件人不存在                      | 收件人不存在             |
| `PM_SEND_SELF`              | 400  | 发给自己                          | 不能给自己发私信         |
| `PM_TOO_MANY_RECEIVERS`     | 400  | 收件人超 10 个                    | 收件人最多 10 个         |
| `PM_CONTENT_INVALID`        | 400  | 标题/正文含非法字符               | 内容包含非法字符         |
| `PM_CONVERSATION_NOT_FOUND` | 404  | 会话/消息不存在或无权访问         | 私信不存在               |
| `RATE_LIMIT_EXCEEDED`       | 429  | 发送限流（复用现有，不改）        | 操作过于频繁，请稍后再试 |

**隐私约定（需注意，勿破坏现状）**：

- `被拉黑 / 隐私 none / 隐私 friends` 合并为同一个 `PM_SEND_NOT_ALLOWED`，
  不向发件人泄露对方具体隐私配置。
- 「消息不存在」与「你不是参与者」合并为同一个 `PM_CONVERSATION_NOT_FOUND`（404），
  避免探测他人会话是否存在。因此 `assertCanReply` 中的「非参与者」分支建议也统一返回
  该 404，而不是 `403`。

字段长度校验（title ≤ 75、content ≤ 1000、receivers 1–10）继续由 TypeBox 校验产生
`FST_ERR_VALIDATION`（400），前端会先本地校验拦截，此项无需改后端。

---

## 2. 移除 `GET /pm/conversations/:msgID` 的自动已读副作用（高优先级）

### 现状

`lib/pm/utils.ts` 的 `getConversation` 开头：

```ts
const rootID = msg.msgRelated;
await markConversationRead(uid, rootID); // ← 副作用
```

路由 schema 的 `description` 也写着「会将会话内发给当前用户的消息标记为已读」。

### 问题

- GET 应幂等、无副作用。新前端用 SWR，默认在窗口重新聚焦、断线重连、重新挂载时自动
  revalidate，会导致用户只是切标签页回来就可能把未读会话「误标已读」。
- 后端已有独立的 `PUT /pm/conversations/:msgID/read`，语义重复。

### 建议

1. 删除 `getConversation` 内的 `markConversationRead` 调用。
   （`markConversationRead` 函数本身保留，供 `markConversationReadByMessageID` 与
   `PUT /read` 路由使用。）
2. 更新路由 schema：`summary` 保持「获取私信会话详情」，删除 `description` 中自动已读说明。
3. 前端契约改为：进入会话后显式调用 `PUT /pm/conversations/:msgID/read`。

（若担心老调用方依赖，可退化为 opt-in `?markRead=true`，默认不标。推荐直接移除。）

---

## 3. 收件人支持 user ID（高优先级）

### 现状

`CreatePrivateMessage.receivers` 只接受 `string[]`（username），`resolveReceivers` 走
`fetchSlimUserByUsername`。后端**没有用户搜索接口**（只有 subjects/characters/persons）。

### 问题

- 写信页只能「最近联系人（15 个）快捷选择」或「手动输入完整 username」，没有搜索/自动补全。
- 输错一个字符即 404；用户改名后 username 失效。

### 建议

`lib/types/req.ts` 的 `CreatePrivateMessage` 增加 ID 传参，与 username 二选一：

```ts
receiverIDs: t.Optional(
  t.Array(t.Integer(), { minItems: 1, maxItems: 10, description: '收件人 user id 列表，与 receivers 二选一' }),
),
```

- `receivers` 与 `receiverIDs` 必须且只能提供一个。
- 数量上限均为 10（去重后）。
- ID 分支复用已有的 `fetchSlimUsersByIDs`（带缓存）；其余校验（不能发自己、拉黑/隐私、
  上限）与 username 分支一致。

备选（若允许 breaking change，PM 尚未对老前端开放）：直接把 `receivers` 改成
`t.Array(t.Integer())`。推荐前者以保持兼容。

### 可选：用户搜索接口（独立后续项，不阻塞）

写信页收件人自动补全需要用户搜索，但现无用户搜索接口，且 Meilisearch 无 `users` 索引：

- 轻量方案：MySQL `username/nickname LIKE` 查询（需评估性能与隐藏/封禁用户过滤）。
- 标准方案：新增 Meilisearch `users` 索引 + 索引管线（较重，涉及用户隐私数据进搜索）。

---

## 4. 其他可选优化（不阻塞）

### 4.1 socket `pm` 事件载荷太薄

**现状**：事件载荷为 `{ msgID, related }`，前端更新未读数还需再请求 `/p1/pm`。

**建议**：事件里带上未读计数（复用 `notify` 事件的 `{ count }` 模式）或发件人预览，
减少一次往返。

### 4.2 `getMailboxStatus` 计数语义不一致

**现状**：`inbox`/`outbox` 返回**消息条数**（`count(*)`），而列表接口的 `total` 是
**会话数**（`countDistinct(msgRelated)`）。

**建议**：在 schema description 写清口径，或统一。前端 V1 主要用 `unread`，影响小。
