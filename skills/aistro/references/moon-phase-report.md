# Moon Phase Report (月相报告)

## Overview

Generate a lunar influence reading combining the current moon phase with the user's natal chart. This is a concise report — shorter than other report types.

## Input Required

- User's birth data (from SKILL.md)
- Target date (default: today)

## Moon Phase Determination

Determine the current moon phase for the target date:

| Phase | Chinese | Emoji | Approximate Timing |
|---|---|---|---|
| New Moon | 新月 | 🌑 | Day 0 |
| Waxing Crescent | 眉月 | 🌒 | Day 1–6 |
| First Quarter | 上弦月 | 🌓 | Day 7 |
| Waxing Gibbous | 盈凸月 | 🌔 | Day 8–13 |
| Full Moon | 满月 | 🌕 | Day 14 |
| Waning Gibbous | 亏凸月 | 🌖 | Day 15–20 |
| Last Quarter | 下弦月 | 🌗 | Day 21 |
| Waning Crescent | 残月 | 🌘 | Day 22–28 |

Use lunar cycle knowledge: a full cycle ≈ 29.5 days. Use known recent new moon dates as reference anchors to calculate the current phase.

## Retrograde Planet Check

Determine which planets are currently retrograde on the target date. Common retrogrades:
- Mercury retrograde (3× per year, ~3 weeks each)
- Venus retrograde (~every 18 months, ~40 days)
- Mars retrograde (~every 26 months, ~2.5 months)
- Jupiter retrograde (~4 months/year)
- Saturn retrograde (~4.5 months/year)
- Uranus, Neptune, Pluto retrograde (~5-6 months/year)

## Output Structure

### Summary (≤40 words)

Prompt pattern (from original):
> 我的星盘是[userStars]，今天的月相是[moonPhase]，生成一个简报，这个报告应该结合月相的影响和我的星盘特点，特别关注于事业、感情、财富等。要求：1.字数控制在40个以内，并且只有一段话 2.只是着重于事业、感情、财富等方向，并不是一定要有相关内容

- Combine moon phase influence with user's natal chart
- Focus on career, love, wealth directions
- ≤40 words, single paragraph
- Only mention these areas if relevant — not all need to be present

### Retrograde Readings

For each currently retrograde planet, generate:

Prompt pattern (from original):
> 我的星盘是[userStars]，我的[planet]是逆行的，生成行星逆行的解读报告。要求：1.生成该行星逆行相对于我的影响报告，字数控制在60个以内

- ≤60 words per planet
- Combine the general retrograde meaning with the user's specific natal placement of that planet
- Single paragraph

## Output Format

```markdown
# 🌙 Moon Phase Report

**Date:** [target date]
**Current Phase:** [Phase Name] [emoji] — [Phase Chinese Name]

## Summary
[≤40 words, single paragraph, combining moon phase + natal chart]

## Planetary Retrogrades

### ☿ Mercury Retrograde
[≤60 words, retrograde impact on user]

### ♄ Saturn Retrograde
[≤60 words, retrograde impact on user]

[...for each retrograde planet]
```

If no planets are currently retrograde, output:

```markdown
## Planetary Retrogrades
No planets currently in retrograde. The energy flows freely today.
```
