# Aistro x OpenClaw Integration Guide

[OpenClaw](https://openclaw.ai/) is an open-source AI agent that runs locally and connects to your favorite chat apps. With Aistro installed as a skill, you can bring astrology readings to Telegram, Discord, WhatsApp, and more.

## Prerequisites

- [OpenClaw](https://docs.openclaw.ai/start/getting-started) installed and running
- At least one chat platform connected (Telegram, Discord, WhatsApp, etc.)
- Aistro skill installed (see [Installation](#installation) below)

## Installation

Tell your OpenClaw bot to install the skill — just send this message directly:

```
Please run `npx skills add ArcBlock/aistro-skills` to install the Aistro skill.
```

Also available on [ClawHub](https://clawhub.ai/lban2049/aistro). After installation, restart your OpenClaw session. The skill loads automatically.

<details>
<summary><b>Troubleshooting: Exec Approval Required</b></summary>

OpenClaw requires approval before executing skill commands for security. When the bot runs Aistro, you may see:

```
Exec approval is required, but chat exec approvals are not enabled on Telegram.

Approve it from the Web UI or terminal UI, or from Discord or Telegram
if those approval clients are enabled.
```

There are two ways to handle this:

**Option A: Approve manually each time**

Approve the execution from the Web UI or terminal UI when prompted. This is the most secure approach — you review every action before it runs.

**Option B: Enable exec approvals for your channel**

If you prefer a smoother experience (especially for scheduled tasks like daily horoscopes), enable exec approvals directly in your chat channel. See the [official documentation](https://docs.openclaw.ai/tools/exec-approvals) for setup instructions.

> **Note:** Option B is recommended for the [Daily Horoscope Push](#scenario-3-daily-horoscope-push) scenario, since scheduled tasks run unattended and cannot wait for manual approval.

</details>

## Scenario 1: DM Astrology Chat

Chat with the bot privately for personalized astrology readings — birth chart analysis, daily horoscope, compatibility checks, and moon phase guidance.

### What It Looks Like

```
You:   I was born on March 15, 1990 at 2:30 PM in Beijing.
       What does my birth chart say?

Bot:   ✨ The Dreamer Who Builds ✨

       | Planet  | Sign & House         | Summary                        |
       |---------|----------------------|--------------------------------|
       | ☀️ Sun  | Pisces · House 10    | A dreamer in the public eye... |
       | 🌙 Moon | Cancer · House 2     | Emotional security through...  |
       | ...     | ...                  | ...                            |

       Type a planet name for detailed analysis, or "all" for the full report.

You:   Moon

Bot:   🌙 Moon in Cancer · House 2
       ...detailed analysis of your Moon placement...
```

### Key Features in DM

- **Full birth chart analysis** — provide your birth date, time, and place for a complete natal report
- **Daily horoscope** — ask "What's my horoscope today?" for personalized transit readings
- **Compatibility** — "Am I compatible with someone born July 22, 1988?"
- **Memory** — the bot remembers your birth data across sessions, so you only need to provide it once

### Setup

No extra configuration needed. Once Aistro is installed, DM the bot and start chatting.

> **Tip:** Tell the bot "Remember my birthday: March 15, 1990, 2:30 PM, Beijing" so it can use your birth data in future conversations automatically.

## Scenario 2: Group Zodiac Fun

Bring astrology into your group chats. Members can @mention the bot for quick zodiac-based readings — no birth time or place needed, just the zodiac sign.

### What It Looks Like

```
Alice:  @aistro What's today's vibe for Pisces?

Bot:    🐟 Pisces Today
        Mercury trine your sign brings sharp intuition.
        Trust your gut on creative decisions today.
        Lucky hour: 3-4 PM 🌊

Bob:    @aistro How compatible are Pisces and Leo?

Bot:    🐟 Pisces × 🦁 Leo
        Water meets fire — steamy but unpredictable!
        Strengths: creative spark, mutual admiration
        Watch out: Leo's directness vs Pisces' sensitivity
        Vibe score: 68/100 🔥

Carol:  @aistro Give me a one-liner for Scorpio today

Bot:    🦂 Scorpio: That thing you've been overthinking?
        Just do it. Mars has your back today. 💪
```

### Why Zodiac-Only in Groups?

Group chat keeps things **simple and social**:
- No need to share personal birth details publicly
- Low barrier — everyone knows their zodiac sign
- Fast, fun responses that spark conversation
- For full personalized readings, users can DM the bot

### Setup

1. Add the bot to your group chat

2. Configure group behavior in your OpenClaw settings:

```yaml
# openclaw.yaml (channels section)
channels:
  telegram:  # or discord, whatsapp, etc.
    groups:
      groupPolicy: allowlist
      allowedGroups:
        - "your-group-id"
      requireMention: true  # bot only responds when @mentioned
```

3. Find your group ID from OpenClaw logs when a message arrives, or use platform-specific commands

> **Tip:** Keep `requireMention: true` so the bot stays quiet unless someone asks for it. Nobody likes a chatty bot!

## Scenario 3: Daily Horoscope Push

Set up automated daily horoscope delivery — wake up to your zodiac forecast every morning.

### What It Looks Like

```
[8:00 AM - from Aistro Bot]

☀️ Good morning! Here's your daily horoscope:

🐟 Pisces — March 13, 2026
Overall: ⭐⭐⭐⭐ (78/100)

Career:  New collaboration opportunity knocks. Say yes.
Love:    Venus smiles on afternoon encounters.
Wealth:  Avoid impulse purchases before Thursday.
Health:  Stretch before that long meeting.

Have a wonderful day! 🌅
```

### Setup

#### Option A: Set Up via Chat (Recommended)

The easiest way — just tell the bot what you want in a DM:

```
You:   Send me a daily Pisces horoscope every morning at 8 AM.

Bot:   ✅ Done! I've set up a daily horoscope for Pisces.
       Schedule: Every day at 8:00 AM (Asia/Shanghai)
       Delivery: This chat
       You can say "cancel my daily horoscope" anytime to stop it.
```

More examples:

```
You:   Send a weekly Pisces + Leo summary to my Telegram group every Monday at 9 AM.
You:   Push a daily horoscope at 7:30 AM New York time.
You:   Stop my daily horoscope.
```

The bot understands natural language — just describe the schedule, zodiac sign(s), and where to deliver.

#### Option B: Set Up via CLI

For more control, use OpenClaw's built-in cron scheduler:

```bash
# Daily horoscope at 8 AM (your timezone)
openclaw cron add \
  --name "Daily Horoscope" \
  --cron "0 8 * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "Generate today's horoscope summary for Pisces. Keep it brief: overall score, plus one sentence each for career, love, wealth, and health." \
  --announce \
  --channel telegram \
  --to "your-chat-id"
```

### Configuration Options (CLI)

| Option | Description | Example |
|--------|-------------|---------|
| `--cron` | Schedule expression | `"0 8 * * *"` (daily 8 AM) |
| `--tz` | Timezone | `"Asia/Shanghai"`, `"America/New_York"` |
| `--channel` | Delivery platform | `telegram`, `discord`, `whatsapp` |
| `--to` | Target chat/user | Chat ID, channel ID, or phone number |
| `--message` | Prompt for the bot | Customize your horoscope request |

### Delivery Examples by Platform

**Telegram (DM):**
```bash
--channel telegram --to "your-user-id"
```

**Telegram (group/topic):**
```bash
--channel telegram --to "-1001234567890:topic:123"
```

**Discord (channel):**
```bash
--channel discord --to "channel:123456789"
```

**WhatsApp:**
```bash
--channel whatsapp --to "+15551234567"
```

### Manage Your Schedule

**Via chat:**

```
You:   What scheduled tasks do I have?
You:   Cancel my daily horoscope.
You:   Change my horoscope delivery to 7 AM.
```

**Via CLI:**

```bash
# List all cron jobs
openclaw cron list

# Remove a job
openclaw cron remove "Daily Horoscope"

# Pause temporarily
openclaw cron disable "Daily Horoscope"
```

## FAQ

**Can the bot remember my birth info?**
Yes, in DM conversations. OpenClaw's memory system persists data across sessions. In group chats, the bot uses zodiac signs only and does not store personal data.

**Can I use multiple chat platforms at the same time?**
Yes. OpenClaw supports running multiple channels simultaneously. Your Aistro skill works across all connected platforms.

**How do I change the horoscope delivery time?**
Just tell the bot: "Change my horoscope delivery to 7 AM." Or via CLI: remove the existing cron job and create a new one with `openclaw cron add`.

**Can I get horoscopes for multiple zodiac signs in one push?**
Yes. Adjust the `--message` parameter: `"Generate today's horoscope for Pisces, Leo, and Scorpio."`

**Is my birth data secure?**
OpenClaw runs locally on your machine. Your data stays on your device and is never sent to external servers (beyond the LLM API calls for generating responses).
