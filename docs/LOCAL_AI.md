# Local AI setup

WorkBae's Local AI feature is optional. Without it, the app uses its built-in rules to identify likely contributions.

## Recommended model for an 8 GB Mac

Use `qwen3:1.7b`. It is multilingual, relatively small, and a practical balance for Bangla, Banglish, and English on an 8 GB Apple Silicon Mac. WorkBae limits the context to 4K tokens and asks Ollama to unload the model after each response to reduce ongoing memory pressure.

## Setup

1. Download and install [Ollama](https://ollama.com/download).
2. Open Ollama and let it run in the menu bar.
3. Open Terminal and download the model once:

   ```sh
   ollama pull qwen3:1.7b
   ```

4. In WorkBae, open **Local AI** and select **Check connection**.
5. Import a chat, choose a date, and select **Translate & Summarize This Day**.
6. Review every generated contribution before saving it.

The initial model download uses internet access. Summarization then happens through Ollama on `127.0.0.1`.

## Performance tips

- Run Local AI only when you need a polished summary.
- Close memory-heavy apps before processing a particularly busy day.
- Keep the default 1.7B model on an 8 GB Mac; larger models can create noticeable memory pressure.
- Quit Ollama when you do not need Local AI. The rest of WorkBae will continue to function.

## Troubleshooting

Check that Ollama is open and that `ollama list` shows `qwen3:1.7b`. If a request fails, WorkBae keeps the rule-based entries so you can continue working.

Local models can omit, misread, or overstate contributions. Treat their output as a draft, not an authoritative record.
