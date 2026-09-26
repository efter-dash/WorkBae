# Privacy

WorkBae is a local-first application. Its core features do not require an account, analytics service, or hosted backend.

## Data WorkBae handles

When you import a WhatsApp export, WorkBae reads the text messages in that file so it can identify dates, participants, and likely work contributions. The app stores imported chats, settings, and saved logs in its local WebKit website-data container on your Mac.

WorkBae does not request your WhatsApp password, read WhatsApp's encrypted database, or monitor chats in the background.

## Local AI

If you enable Local AI, WorkBae sends the selected day's transcript to Ollama at `http://127.0.0.1:11434`. Ollama and the chosen model run on your Mac. WorkBae does not intentionally send that content to an external AI provider.

Models are separate software with their own licenses and behavior. Review generated text before using it as an official work record.

## Exports

Markdown and CSV files are created only when you choose to export. After that, you control where those files are stored or shared.

## Your responsibility

Client conversations can contain confidential or personal information. Obtain any permission required by your agreements and local law before importing or sharing them. Do not attach real chat exports to public GitHub issues.

## Clearing local data

Use **Reset local data** in WorkBae settings when available, or remove WorkBae's website data using macOS storage/privacy controls. Deleting the app alone may not remove WebKit's stored website data.
