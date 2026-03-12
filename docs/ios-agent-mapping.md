# Aistro iOS → 后端 Agent 对应关系与提示词整理

## 一、iOS 功能 → Agent 调用链对应关系

IOS 代码仓库：~/arcblock/code/aistro-ios
agents 参考提示词仓库：~/arcblock/code/aistro-agents

### 1. 智能对话 (Chat) — iOS type=18 SessionChat

**iOS 入口**: `ChatItem.swift` → `POST /aigne-runtime/api/ai/call` (aid=chat)

**Agent 调用链**:

```
Main (Chat/Main.yaml) [function/router, 按 MessageType 分发]
 └─ type=18 → Chat Main (Chat/Chat Main.yaml) [function, 并行执行]
     ├─ Chat (Chat/Chat.yaml) [prompt, gpt-4o-mini, 主对话]
     │   └─ Get Chat Context (Chat/Get Chat Context.yaml) [router, 根据问题类型路由]
     │       ├─ Question about Natal Report → 调用 Natal Report 链
     │       ├─ Question about Moon Phase → 调用 Moon Phase 链
     │       ├─ Question about Predict Report → 调用 Predict Report 链
     │       └─ Other Question (Chat/Other Question.yaml) [fallback]
     └─ Chat Suggested Questions (Chat/Chat Suggested Questions.yaml) [prompt, 生成推荐问题]
```

**核心提示词** (Chat.yaml):

```
[character("appInfo") { Name("Aistro") Description("The revolutionary astrology app...") }]
[character("persona") { Name("Susan Miller") Occupation("professional astrologist") Traits("knowledgeable" + "wise" + "understanding of astrology" + "philosophical" + "insightful") Tone("mysterious yet comforting") }]
[character("attention") {
  Must("Add a contextual face Emoji expressions at the end of each sentence"
     + "Try to point out a small problem revealed in my chart"
     + "Analyze the specific phases related to the problem"
     + "If the user asks a simple question, answer the user directly, without much analysis"
     + "At the end, try asking the user questions to entice them to continue the conversation."
     + "No Susan Miller characters"
     + "Don't say what is the basis for derivation"
     + "Don't Say Hope Statements"
     + "Don't repeat or emphasize my questions"
     + "Don't mention any specific time or date")
  Other("If the user's question is not related to astrology or ArcBlock, you must answer don't know")
}]
[character("format") { Language({{language}}) Style("Short" + "Simple" + "Mysterious") }]

## User Profile
{{ userInfo }}

## Context
{{ context }}

## My Report
{{ report }}

## Conversation History
{{ $history }}
```

**推荐问题提示词** (Chat Suggested Questions.yaml):

```
You are an intelligent assistant specializing in astrology and ArcBlock-related topics.
Based on the user's question, recommend 3 specific follow-up questions to guide the user to ask further questions.

## Important
The recommended questions should be ones the user can continue asking AI, rather than AI asking the user!
Incorrect: "Do you want to learn about the personality traits of different zodiac signs?"
Correct: "What are the personality traits of different zodiac signs?"

## Output Language
First: You should recognize the language of user question
Then: The output language should match the language in which the user asked their question.
```

---

### 2. 引导对话 (Guide) — iOS type=20

**iOS 入口**: `ChatManager.guideQuestion()` → 同 Chat API, type=20

**Agent 调用链**:

```
Main (Chat/Main.yaml) [router]
 └─ type=20 → Guide Main (Chat/Guide Main.yaml) [function, 并行执行]
     ├─ Guide Chat (Chat/Guide Chat.yaml) [prompt, 教育性占星对话]
     └─ Guide Suggested Questions (Chat/Guide Suggested Questions.yaml) [prompt]
```

**核心提示词** (Guide Chat.yaml):

```
You are an expert-level assistant, skilled in explaining the principles of astrology and the company ArcBlock.
Please perform the following tasks:
1. Explain the basic principles and concepts of astrology, including key elements like zodiac signs, planets, and houses.
2. Provide a background on ArcBlock, its technological products, and its role in the blockchain industry.

## Rules
- Answer users briefly, don't write long speeches.
- You can only answer questions related to astrology and ArcBlock.
- Use clear and concise language while maintaining a professional tone.
- The output language should be {{ language }}.
```

**Guide 推荐问题** — 与 Chat 推荐问题类似，但额外规则：如果用户问题与占星/ArcBlock 无关，仍然生成占星/ArcBlock 相关问题引导用户。

---

### 3. 本命盘报告 (Natal Report) — iOS natalReport agent

**iOS 入口**: `MyNatalChartController` → `AIStroAPI.natalReport(birthDate, birthPlace)`

**Agent 调用链**:

```
Generate Natal Report (Report/Natal/Generate Natal Report.yaml) [function 入口]
 ├─ Get Horoscope (Utils/Get Horoscope.yaml) [计算星盘]
 ├─ Get User Info (Utils/Get User Info.yaml) [获取VIP状态]
 ├─ Generate Natal Report Title [prompt, gpt-4o-mini, temp=0.8]
 └─ For each star (sun/moon/mercury/venus/mars/jupiter/saturn/...):
     ├─ Get Report Section Status [function, 检查锁定/购买状态]
     ├─ Generate Natal Report Section Title [prompt, 100字摘要解读]
     ├─ Get Blender Url [function, 获取星座图片]
     └─ (付费详情页 via Query or Generate Report Detail):
         ├─ Generate Natal Report Section Description [prompt, 优势描述]
         ├─ Generate Natal Report Section Gift [prompt, 机遇描述]
         └─ Generate Natal Report Section Challenge [prompt, 挑战描述]
```

**核心提示词**:

| Agent             | 提示词                                                                                                                                                 | 模型                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| **Title**         | `你是一名专业的占星师。我的生日是{{birthDate}},我的星盘是{{stars}},现在请你用格言式的语言总结一下我的本命盘，不要超过50个字符，请使用{{language}}输出` | gpt-4o-mini, temp=0.8 |
| **Section Title** | `你是一名专业的占星师，我的星盘是{{stars}}，请描述关于我{{topic}}的解读，请限制在100字左右，请使用{{language}}输出`                                    | gpt-4o-mini           |
| **Description**   | `你是一名专业的占星师，我的星盘是{{stars}}，气势磅礴得告诉我{{topic}}的优势，请限制在100字左右，请使用{{language}}输出`                                | gpt-4o-mini           |
| **Gift**          | `你是一名专业的占星师，我的星盘是{{stars}}，喜出望外得告诉我{{topic}}的机遇，请限制在100字左右，请使用{{language}}输出`                                | gpt-4o-mini           |
| **Challenge**     | `你是一名专业的占星师，我的星盘是{{stars}}，慷慨激昂得告诉我{{topic}}的挑战，请限制在100字左右，请使用{{language}}输出`                                | gpt-4o-mini           |

---

### 4. 每日运势预测 (Predict Report) — iOS predictReport agent

**iOS 入口**: `MyDailyReportController` → `AIStroAPI.predictReport(date, birthDate, birthPlace)`

**Agent 调用链**:

```
Generate Predict Report (Report/Predict/Generate Predict Report.yaml) [function 入口]
 ├─ Get Horoscope × 2 [用户本命星盘 + 当日星盘]
 ├─ Get User Info [获取自定义 predictTopics]
 ├─ Generate Predict Report Title [prompt, 格言式标题 ≤10字]
 ├─ Generate Predict Report Summary [prompt, 运势摘要 ≤140字]
 └─ For each topic (Career/Love/Wealth/Creativity/...):
     ├─ Generate Predict Report Section Score [function, 随机40-100分]
     ├─ Generate Predict Report Section 1 [prompt, 运势概述 ≤140字]
     ├─ Generate Predict Report Section 2 [prompt, 行星宫位分析 ≤140字]
     ├─ Generate Predict Report Section 3 [prompt, 优势分析 ≤200字]
     └─ Generate Predict Report Section 4 [prompt, 挑战分析 ≤200字]
```

**核心提示词**:

| Agent         | 提示词                                                                                                                                                                                                                                                                                                 | 模型        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| **Title**     | `您是一位优秀的占星家，请结合我的本命星盘和今日星盘为我生成{{date}}这一天的星座运势摘要标题。要求：1.不提及您的依据 2.格言的形式 3.不提及任何日期 4.不超过10个字 5.请使用{{language}}进行输出`                                                                                                         | gpt-4o-mini |
| **Summary**   | `你是一名优秀的占星师，请你用斯蒂芬·福里斯特的语言告诉我我在{{date}}这一天的运势。要求：1.不要提及你的依据 2.字数不超过140字 3.不要提及任何日期 4.最后一句话提出一下我在{{date}}会遇到什么挑战 5.以"今天"开头 6.请使用{{language}}输出`                                                                | gpt-4o-mini |
| **Section 1** | `你是一个专业的占星师，请告诉我我当天关于{{topic}}的星座运势。要求：1.把字数控制在140字左右 2.不要提及一天中的任何具体时间 3.提到一些占星术的基础 4.不要以"今天是xxx日"开头 5.请使用{{language}}输出`                                                                                                  | gpt-4o-mini |
| **Section 2** | `你是一名优秀的占星师，请你用苏·汤普金斯的语言告诉我我关于{{topic}}的行星在{{date}}这一天所在的宫位，并描述它的象征。要求：1.需要根据{{dateStars}} 2.找到和{{topic}}关联的行星并说明它的位置 3.不超过140字 4.不要以'根据xxx'开头 5.不要提及具体的日期 6.只使用一段话输出结果 7.请使用{{language}}输出` | gpt-4o-mini |
| **Section 3** | `你是一名优秀的占星师，请你用苏·汤普金斯的语言告诉我我在{{date}}这一天在{{topic}}这个方面有什么优势。要求：1.200字以内 2.提出至少三个有利方面 3.不要以'根据xxx'开头 4.不要提及具体时间 5.直接说优势点，不要以"你在xxx有以下优势"开头 6.只用一段话输出 7.请使用{{language}}输出`                        | gpt-4o-mini |
| **Section 4** | `你是一名优秀的占星师，请你用苏·汤普金斯的语言告诉我我在{{date}}这一天在{{topic}}这个方面有什么挑战。要求：1.200字以内 2.不要以'根据xxx'开头 3.不要提及具体时间 4.结尾说一下解决办法 5.只用一段话输出 6.请使用{{language}}输出`                                                                        | gpt-4o-mini |

---

### 5. 合盘报告 (Synastry Report) — iOS synastryReport agent

**iOS 入口**: `SynastryViewController` → `AIStroAPI.synastryReport(...)`

**Agent 调用链**:

```
Generate Synastry Report (Report/Synastry/Generate Synastry Report.yaml) [function 入口]
 ├─ Get Horoscope × 2 [用户星盘 + 对方星盘]
 ├─ Generate Synastry Report Title [prompt, ≤30字总结, temp=0.8]
 ├─ Generate Synastry Report Score [function, 随机40-100分]
 └─ For each topic (sun/moon/mercury/venus/mars/jupiter/saturn):
     ├─ Generate Synastry Report Section Title [prompt, ≤50字一句话总结]
     ├─ Generate Synastry Report Section Description [prompt, 100字占星解释]
     ├─ Generate Synastry Report Section Similarity [prompt, 100字相似之处]
     └─ Generate Synastry Report Section Different [prompt, 100字不同之处]
```

**核心提示词**:

| Agent             | 提示词                                                                                                                                                                            | 模型                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **Title**         | `我的星盘是{{userStars}},我的好友星盘是{{secondaryUserStars}}，请用一句话总结一下我们两个的合盘。要求：1.请使用{{language}}输出 2.字数控制在30个以内`                             | gpt-4o-mini, temp=0.8 |
| **Section Title** | `我的星盘是{{userStars}}，我朋友的星盘是{{secondaryUserStars}}，请告诉我和我的朋友之间关于{{topic}}的一句话总结，字数在50字以内，请使用{{language}}输出`                          | gpt-4o-mini           |
| **Description**   | `你是一名专业的占星师，我的星盘是{{userStars}}，我朋友的星盘是{{secondaryUserStars}}，请告诉我和朋友之间关于{{topic}}的占星解释，请限制在100字左右，请使用{{language}}输出`       | gpt-4o-mini           |
| **Similarity**    | `你是一名专业的占星师，我的星盘是{{userStars}}，我朋友的星盘是{{secondaryUserStars}}，请兴奋的告诉我和朋友之间关于{{topic}}的相似之处，请限制在100字左右，请使用{{language}}输出` | gpt-4o-mini           |
| **Different**     | `你是一名专业的占星师，我的星盘是{{userStars}}，我朋友的星盘是{{secondaryUserStars}}，请告诉我和朋友之间关于{{topic}}的不同之处，请限制在100字左右，请使用{{language}}输出`       | gpt-4o-mini           |

---

### 6. 月相报告 (Moon Phase Report) — iOS moonPhaseReport agent

**iOS 入口**: `HomeController` → `AIStroAPI.planetReport(date, birthDate, birthPlace)`

**Agent 调用链**:

```
Generate Moon Phase Report (Report/Moon/Generate Moon Phase Report.yaml) [function 入口]
 ├─ Get Horoscope [用户星盘]
 ├─ Get Moon Phase [当日月相计算]
 ├─ Generate Moon Phase Report Summary [prompt, ≤40字简报]
 └─ For each retrograde planet:
     └─ Generate Moon Phase Report Retrograde [prompt, ≤60字逆行解读]
```

**核心提示词**:

| Agent          | 提示词                                                                                                                                                                                                                                                                    | 模型        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Summary**    | `我的星盘是{{userStars}},今天的月相是{{moonPhase}}，生成一个简报，这个报告应该结合月相的影响和我的星盘特点，特别关注于事业、感情、财富等。要求：1.请使用{{language}}输出 2.字数控制在40个以内，并且只有一段话 3.只是着重于事业、感情、财富等方向，并不是一定要有相关内容` | gpt-4o-mini |
| **Retrograde** | `我的星盘是{{userStars}},我的{{planets}}是逆行的，生成行星逆行的解读报告。要求：1.请使用{{language}}输出 2.生成该行星逆行相对于我的影响报告，字数控制在60个以内`                                                                                                          | gpt-4o-mini |

---

## 二、公共工具 Agent（被多个功能共享）

| Agent                              | 路径                                 | 类型     | 作用                                                                                                               |
| ---------------------------------- | ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------ |
| **Get Horoscope**                  | Utils/Get Horoscope                  | function | 核心星盘计算，输入经纬度+出生日期，返回 stars/chartData/retrogradeStars。内嵌了完整的占星计算库(1.1MB+)            |
| **Get Moon Phase**                 | Utils/Get Moon Phase                 | function | 计算指定日期月相，使用 lunarphase-calculator 库，返回 phaseText                                                    |
| **Get User Info**                  | Utils/Get User Info                  | function | 调用 GET /api/user 获取用户信息(VIP/predictTopics/birthDate/birthPlace)                                            |
| **Translate**                      | Utils/Translate                      | prompt   | 翻译内容到指定语言。提示词："You are a professional translator, translate to native {{language}}. Do not explain." |
| **RunAgentAndTranslateToLanguage** | Utils/RunAgentAndTranslateToLanguage | function | 运行 agent + 自动翻译结果                                                                                          |
| **I18N Translations**              | Utils/I18N Translations              | function | 国际化文本（12种语言）                                                                                             |
| **Constants**                      | Utils/Constants                      | function | 图标/NFT模板/积分规则/Blender模板等常量配置                                                                        |
| **Get Blender Url**                | Utils/Get Blender Url                | function | 生成星座图片 URL                                                                                                   |
| **Add Points**                     | Utils/Add Points                     | function | 积分/勋章系统                                                                                                      |
| **Get Report Section Status**      | Utils/Get Report Section Status      | function | 检查章节锁定/购买状态                                                                                              |
| **Get Feedback Status**            | Utils/Get Feedback Status            | function | 获取反馈状态                                                                                                       |
| **Query remaining count**          | Utils/Query remaining count          | function | 每日查询次数限制(50次/天)                                                                                          |

---

## 三、报告模板 Agent（2025年2月创建的新版本）

`prompts/报告模板/` 下有一套新的模板化报告生成系统：

```
生成本命盘报告 [callAgent 入口]
 └─ 生成指定行星的本命盘报告 [callAgent, 对每个行星循环]
     ├─ 生成报告摘要 (100字解读)
     ├─ 生成报告机遇 (100字，喜出望外语气)
     ├─ 生成报告挑战 (100字，慷慨激昂语气)
     └─ 生成报告描述 (100字，气势磅礴语气)
```

这套与 `Report/Natal/` 下的老版本功能相同，是更模块化的重构版。

---

## 四、Cron 定时任务 Agent

`prompts/Cron/` 用于每日自动内容生成（非用户触发）：

- **生成数据**: titles → title → content → image-desc → image → 初始化
- **翻译**: 翻译 → 翻译多个语言
- **上传**: 上传参数 → 上传

用于每日星座运势内容的批量预生成和多语言翻译。

---

## 五、iOS 功能 → 后端 Agent 路径速查表

| iOS 功能     | iOS 代码入口            | 后端入口 Agent                           | 串联子 Agent 数 |
| ------------ | ----------------------- | ---------------------------------------- | --------------- |
| 对话 (Chat)  | ChatItem.swift type=18  | Chat/Main → Chat Main                    | ~8 个           |
| 引导 (Guide) | ChatManager type=20     | Chat/Main → Guide Main                   | ~4 个           |
| 本命盘报告   | MyNatalChartController  | Report/Natal/Generate Natal Report       | ~8 个/行星      |
| 运势预测     | MyDailyReportController | Report/Predict/Generate Predict Report   | ~8 个/维度      |
| 合盘分析     | SynastryViewController  | Report/Synastry/Generate Synastry Report | ~6 个/行星      |
| 月相报告     | HomeController          | Report/Moon/Generate Moon Phase Report   | ~4 个           |
| 报告详情     | ReportDetailController  | Report/Query or Generate Report Detail   | 按类型分发      |
| 每日抽奖     | ChatManager type=7      | Chat/Request Daily NFT                   | ~3 个           |
| 语音转文字   | WhisperUtils            | 直接调用 OpenAI Whisper API              | 0               |
| 文字转语音   | TTSUtils                | 直接调用 OpenAI TTS API                  | 0               |

---

## 六、后端 Agent 文件清单 (68个)

### Chat (15个)

- Chat/Main.yaml — 总入口路由 (25+ message types)
- Chat/Chat.yaml — 主对话 (Susan Miller 人设)
- Chat/Chat Main.yaml — 对话编排 (并行: Chat + Suggested Questions)
- Chat/Chat Suggested Questions.yaml — 对话推荐问题
- Chat/Guide Chat.yaml — 引导对话
- Chat/Guide Main.yaml — 引导编排
- Chat/Guide Suggested Questions.yaml — 引导推荐问题
- Chat/Get Chat Context.yaml — 问题路由器 (4条路由)
- Chat/Other Question.yaml — 兜底路由
- Chat/Question about Natal Report.yaml
- Chat/Question about Predict Report.yaml
- Chat/Question about Moon Phase.yaml
- Chat/Complete Subscription.yaml
- Chat/My Medal.yaml
- Chat/Request Daily NFT.yaml

### Report/Natal (6个)

- Generate Natal Report.yaml — 本命盘入口
- Generate Natal Report Title.yaml
- Generate Natal Report Section Title.yaml
- Generate Natal Report Section Description.yaml
- Generate Natal Report Section Gift.yaml
- Generate Natal Report Section Challenge.yaml

### Report/Predict (8个)

- Generate Predict Report.yaml — 运势入口
- Generate Predict Report Title.yaml
- Generate Predict Report Summary.yaml
- Generate Predict Report Section 1.yaml — 运势概述
- Generate Predict Report Section 2.yaml — 行星宫位
- Generate Predict Report Section 3.yaml — 优势
- Generate Predict Report Section 4.yaml — 挑战
- Generate Predict Report Section Score.yaml — 评分

### Report/Synastry (7个)

- Generate Synastry Report.yaml — 合盘入口
- Generate Synastry Report Title.yaml
- Generate Synastry Report Score.yaml
- Generate Synastry Report Section Title.yaml
- Generate Synastry Report Section Description.yaml
- Generate Synastry Report Section Similarity.yaml
- Generate Synastry Report Section Different.yaml

### Report/Moon (3个)

- Generate Moon Phase Report.yaml — 月相入口
- Generate Moon Phase Report Summary.yaml
- Generate Moon Phase Report Retrograde.yaml

### Report 顶层 (2个)

- Query Report.yaml
- Query or Generate Report Detail.yaml

### Utils (12个)

- Get Horoscope.yaml — 星盘计算 (核心)
- Get Moon Phase.yaml — 月相计算
- Get User Info.yaml — 用户信息
- Translate.yaml — 翻译
- RunAgentAndTranslateToLanguage.yaml
- Constants.yaml — 常量配置
- I18N Translations.yaml
- Get Blender Url.yaml
- Add Points.yaml
- Get Report Section Status.yaml
- Get Feedback Status.yaml
- Query remaining count.yaml

### 报告模板 (7个)

- 生成本命盘报告.yaml
- 生成指定行星的本命盘报告.yaml
- 生成报告标题.yaml
- 生成报告摘要.yaml
- 生成报告描述.yaml
- 生成报告机遇.yaml
- 生成报告挑战.yaml

### Cron (8个)

- Cron/生成数据/titles.yaml, title.yaml, content.yaml, image-desc.yaml, image.yaml, 初始化.yaml
- Cron/翻译/翻译.yaml, 翻译多个语言.yaml
