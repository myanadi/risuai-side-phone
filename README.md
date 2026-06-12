# 📱 Side Phone — RisuAI Plugin

A virtual smartphone interface plugin for [RisuAI](https://github.com/kwaroran/Risuai). 
Extracts character behavior from RP output and renders it as smartphone data across 
5 separate app screens — extending the character's life beyond the chat window.

## ✨ Features

- **5 app interfaces** — Twitter / Search / Messages / Calls / Notes
- **Auto extraction** — Pulls character behavior from RP turns into app-specific data
- **Character × chat isolation** — Each character/chatroom has separate phone state
  (`phone:c{ci}:chat{chi}:` key prefix)
- **Independent rendering layer** — Mobile UI overlay separate from main chat
- **State persistence** — App data accumulates over RP sessions
- **Configurable** — Auto mode, owner detection, array caps, first-run extraction depth

## ⚙️ Plugin Arguments

| Arg | Type | Default | Description |
|---|---|---|---|
| `auto_mode` | int | 0 | Auto-extract every turn (0=off, 1=on) |
| `comment_model` | string | submodel | Model to use for extraction |
| `owner_name` | string | (auto) | Phone owner name (auto-detect if empty) |
| `array_cap` | int | 25 | Max entries per app (15-50) |
| `first_run_turns` | int | 3 | RP turns to scan on first run (1-10) |

## 🚀 Installation

1. Download `Side_Phone.js`
2. In RisuAI: **Settings → Plugins → Import Plugin**
3. Configure arguments in plugin settings
4. Enable

## 🛠️ Tech Stack

- Vanilla JavaScript
- RisuAI Plugin API v3.0
- State management via `pluginStorage` with character/chat-scoped keys
- Developed with AI-assisted workflow (Claude/GPT)

## 📝 Why This Plugin

AI character roleplay typically happens within the chat window only. But real people 
also search, message others, and leave private notes between conversations. This plugin 
reflects RP output into a separate mobile UI layer — extending the character's "life" 
into spaces outside the chat. Inspired by the design principle of an earlier plugin 
(Webnovel Community) that also reflects RP output into a separate UI surface.

## 🇰🇷 한국어 요약

AI 캐릭터의 일상을 채팅창 외부 공간으로 확장하는 가상 스마트폰 인터페이스 플러그인입니다. 
RP 출력에서 캐릭터의 행동·관심사·관계망을 추출해 트위터·검색·메시지·전화·메모 5개 앱에 
자동 매핑하며, 캐릭터·채팅방 단위로 상태를 분리 저장합니다.

## 📜 License

MIT — see [LICENSE](LICENSE)

## 🔗 Links

- Author Portfolio: https://app.notion.com/p/Portfolio-377742607f3c811fb73ce8226a96ae64
- RisuAI: https://github.com/kwaroran/Risuai
