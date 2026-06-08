# Cola for Obsidian

Chat with [Cola AI](https://colaos.ai) directly in Obsidian. Context-aware — Cola sees what you see.

## Features

- **Sidebar Chat** — Chat with Cola without leaving Obsidian
- **File Context Awareness** — Cola automatically sees your currently open file
- **Quote Selection** — Select text and send it to Cola as a reference for your question
- **Insert to Editor** — One-click insert Cola's reply at your cursor position
- **Persistent History** — Chat messages are saved across sessions
- **Customizable Shortcuts** — All commands can be assigned custom hotkeys

## Requirements

- [Cola](https://colaos.ai) desktop app installed and running
- Cola's Obsidian channel plugin enabled (install from Cola's plugin settings)

## Usage

1. Install this plugin in Obsidian
2. Install and enable the Obsidian channel plugin in Cola's settings
3. Open the Cola sidebar (click the ribbon icon or use the command palette)
4. Start chatting — Cola will see your current file automatically

## Commands

| Command | Description |
|---------|-------------|
| Open Cola Chat | Open the Cola sidebar |
| Quote Selection to Cola | Send selected text as a quote reference |
| Send Selection to Cola | Send selected text directly |

All commands can be assigned custom hotkeys in Settings → Hotkeys → search "Cola".

## Settings

- **Send Shortcut** — Choose between `Ctrl/Cmd+Enter` or `Enter` to send messages
- **Clear Chat History** — Clears local chat history (Cola's memory is not affected)

## How It Works

This plugin connects to Cola's local channel plugin via WebSocket. Your messages are processed by Cola AI with full context of your current file, and responses are displayed in the sidebar.

The connection is local-only (127.0.0.1) — no data is sent to external servers by this plugin. Cola handles AI processing according to its own privacy settings.

## Development

```bash
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/cola/` directory.

## License

MIT
