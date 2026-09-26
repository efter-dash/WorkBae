# Contributing to WorkBae

Thank you for helping improve WorkBae.

## Before opening an issue

- Search existing issues first.
- Never upload a real client chat, exported log, phone number, or other confidential material.
- For parser bugs, replace names, numbers, links, and message content with fictional examples while preserving the date format that triggers the problem.

## Local development

1. Install Xcode Command Line Tools and Node.js on macOS 13 or newer.
2. Fork and clone the repository.
3. Build with `WORKBAE_SKIP_OPEN=1 ./scripts/build-macos.command`.
4. Test importing a synthetic WhatsApp export and exporting both a day and a month.
5. Run the checks listed below before opening a pull request.

```sh
node --check src/app.js
plutil -lint macos/Info.plist
WORKBAE_SKIP_OPEN=1 ./scripts/build-macos.command
codesign --verify --deep --strict outputs/WorkBae.app
```

## Pull requests

- Keep changes focused and explain the user-visible result.
- Include manual test steps for UI or parser changes.
- Preserve the local-first privacy model.
- Do not introduce telemetry, remote AI calls, or chat uploads without an explicit design discussion.
- Update `CHANGELOG.md` for user-visible changes.

By contributing, you agree that your contribution will be licensed under the MIT License.
