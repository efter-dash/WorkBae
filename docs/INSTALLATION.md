# Installing WorkBae

## Install a release

1. Open the GitHub repository's **Releases** page.
2. Download `WorkBae-macOS-vX.Y.Z.zip` from the newest release.
3. Double-click the ZIP, then drag `WorkBae.app` to Applications.
4. Control-click the app, choose **Open**, then select **Open** again.

The community build is ad-hoc signed but not notarized by Apple, so the first launch requires the Control-click step. WorkBae requires macOS 13 Ventura or newer.

## Build it yourself

Install Apple's Xcode Command Line Tools and Node.js, then run:

```sh
git clone https://github.com/efter-dash/WorkBae.git
cd WorkBae
./scripts/build-macos.command
```

The finished app appears at `outputs/WorkBae.app`.

## Import a WhatsApp chat

1. Open the client conversation in WhatsApp.
2. Export the chat **without media**.
3. Save or share the resulting `.txt` file to the Mac.
4. In WorkBae, select **Choose WhatsApp export** and choose that file.
5. Open **Settings** and enter the exact sender names that represent you.

WorkBae supports common bracketed iPhone exports and dash-separated Android exports. Date order is detected from the file where possible.

## Troubleshooting

### macOS says the app cannot be opened

Control-click the app and choose **Open**. If your organization manages your Mac, its security policy may still block ad-hoc signed apps; build from source or ask your administrator.

### No messages are recognized

Confirm that you selected the exported `.txt` file rather than the enclosing ZIP, and that the messages include their original date and sender prefixes.

### Contributions are missing

Add every name used for you in that conversation under **Settings → My WhatsApp names**, separated by commas. Then select the date again.

### Local AI is unavailable

The regular formatter continues to work. For AI setup, follow [Local AI setup](LOCAL_AI.md).
