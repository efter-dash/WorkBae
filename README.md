# WorkBae

<p align="center"><img src="src/workbae-logo.jpg" width="180" alt="WorkBae logo"></p>

WorkBae is a private, local macOS work-log companion for people who coordinate client work in WhatsApp. Import an exported chat, choose a date, and turn your own messages into an editable daily or monthly contribution log.

Chats stay on your Mac. WorkBae does not ask for WhatsApp credentials, scrape WhatsApp, or send chat content to a hosted service. Its optional AI feature connects only to a local [Ollama](https://ollama.com/) model.

## Features

- Imports common iPhone and Android WhatsApp `.txt` exports
- Identifies your contributions across Bangla, Banglish, and English
- Creates editable, categorized work-log entries
- Exports a single day or an entire month as Markdown or CSV
- Stores clients, messages, and saved logs locally
- Uses a deterministic formatter when local AI is unavailable
- Optionally summarizes with Ollama and the lightweight `qwen3:1.7b` model
- Runs as a native macOS app with an early-2000s editorial interface

## Download and open

Download the ZIP from the repository's **Releases** page, unzip it, and move `WorkBae.app` to Applications.

The community build is ad-hoc signed, not Apple-notarized. On first launch, Control-click `WorkBae.app`, choose **Open**, then confirm. macOS 13 Ventura or newer is required. The release is universal and supports Apple Silicon and Intel Macs.

See [Installation](docs/INSTALLATION.md) for detailed steps and troubleshooting.

## Daily workflow

1. In WhatsApp, open a client chat and choose **Export Chat → Without Media**.
2. Import the exported `.txt` file into WorkBae.
3. In **Settings**, enter every display name that represents you in the chat.
4. Select a date and review the suggested contribution entries.
5. Edit, add, or remove entries, then save the day.
6. Export the selected day or month as Markdown or CSV.

Re-importing a newer copy of the same chat updates the message history without duplicating identical messages.

## Build from source

Requirements: macOS 13+, Xcode Command Line Tools, and Node.js.

```sh
git clone https://github.com/efter-dash/WorkBae.git
cd WorkBae
./scripts/build-macos.command
```

The app is written to `outputs/WorkBae.app`. The build script creates a universal binary and applies a local ad-hoc signature.

To make a versioned release ZIP:

```sh
./scripts/package-release.command
```

## Local AI

Local AI is optional. WorkBae defaults to `qwen3:1.7b`, chosen to remain practical on an 8 GB Apple Silicon Mac. It processes only the selected day's messages, uses a 4K context window, disables extended thinking, and asks Ollama to unload the model after each result.

See [Local AI setup](docs/LOCAL_AI.md) for the full walkthrough.

## Privacy

WorkBae is designed around manual WhatsApp exports. It does not bypass WhatsApp encryption or access WhatsApp's internal database. Read [PRIVACY.md](PRIVACY.md) before using real client conversations.

## Project documentation

- [Installation](docs/INSTALLATION.md)
- [Local AI setup](docs/LOCAL_AI.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Release guide](docs/RELEASING.md)
- [Changelog](CHANGELOG.md)

## License

WorkBae is available under the [MIT License](LICENSE).
