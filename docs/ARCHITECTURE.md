# Architecture

WorkBae is intentionally small and local-first.

## Components

- `macos/WorkBaeApp.m` creates the native AppKit window, embeds `WKWebView`, opens native file panels, and handles local file exports.
- `src/index.html` contains the app views and accessible controls.
- `src/styles.css` contains the WorkBae editorial visual system.
- `src/app.js` parses WhatsApp exports, manages local state, generates contribution entries, communicates with Ollama, and formats exports.
- `scripts/build-macos.command` assembles and ad-hoc signs a universal `.app` bundle.
- `scripts/package-release.command` creates a versioned ZIP for release.

## Data flow

1. The user explicitly chooses a WhatsApp `.txt` export.
2. The native wrapper reads the selected text file and passes its content to the embedded app.
3. The parser recognizes timestamped messages and stores them in local WebKit storage.
4. The rule-based formatter filters messages by selected date and sender identity.
5. If requested, the selected day's transcript is posted to a local Ollama server.
6. The user reviews the entries and explicitly exports Markdown or CSV through a native save panel.

No hosted backend is part of the application.

## Native bridge

Messages between JavaScript and macOS use the `daybook` WebKit message-handler name for backward compatibility with early WorkBae builds. It is an internal implementation detail and does not affect the product name.

## Local storage

WorkBae currently uses WebKit local storage. This keeps the MVP dependency-free, but it is not intended as an encrypted records database. Users should avoid importing data they are not authorized to process and should protect their macOS account.

## Network boundary

The only application request is the optional Ollama call to `127.0.0.1:11434`. The macOS bundle permits local networking for that purpose. There is no analytics or remote API client.
