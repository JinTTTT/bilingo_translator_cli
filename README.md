# Bilingo

Bilingo is a small Linux desktop translator for English and Chinese. It uses
DeepSeek V4 Flash through the official DeepSeek API.

The application supports three workflows:

- Highlight text and press `Ctrl+Alt+E` to translate it immediately.
- Press `Ctrl+Alt+I` to open an empty translation window.
- Prefix English or Chinese text with `/fix` to rewrite it naturally in the
  same language, for example `/fix When did you gone?`.

The compact window opens in the top-right corner, grows with its content, and
hides when it loses focus. Use the pin button to keep it open. In the input
field, press `Enter` to translate or `Shift+Enter` to insert a new line.

## Requirements

- Linux with an X11 desktop session
- Node.js 18 or newer and npm
- Rust installed through [rustup](https://rustup.rs/)
- A funded DeepSeek API account and API key

On Ubuntu 22.04, install the native Tauri dependencies with:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev libgtk-3-dev librsvg2-dev libxdo-dev
```

Install Rust if it is not already available:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Run in development

Install the project-local JavaScript dependencies once:

```bash
npm install
```

Create your runtime config, then paste your API key into it:

```bash
mkdir -p ~/.config/bilingo
cp config.example.json ~/.config/bilingo/config.json
```

The config should look like this:

```json
{
  "apiKey": "sk-your-api-key"
}
```

Then start Bilingo:

```bash
PATH="$HOME/.cargo/bin:$PATH" WEBKIT_DISABLE_DMABUF_RENDERER=1 npm run tauri dev
```

Do not commit or share `~/.config/bilingo/config.json`. The Bilingo terminal
must remain open while using the development build; stop it with `Ctrl+C`.

## Configuration

Your API key is read at runtime from `~/.config/bilingo/config.json`; use
[`config.example.json`](config.example.json) as the safe template:

```json
{
  "apiKey": "sk-your-api-key"
}
```

The application creates this file automatically if it is missing. It reads the
file for every request, so changing the key does not require rebuilding or
restarting Bilingo.

DeepSeek thinking mode is disabled because translation does not require it.
Text containing Chinese characters is translated to English; other text is
translated from English to Simplified Chinese. Text beginning with `/fix` is
instead corrected and rewritten in its original language. The refinement mode
also condenses fragmented or rambling text into clear, natural wording without
inventing new details.

## Checks and production build

Run the frontend build and native Rust check together:

```bash
PATH="$HOME/.cargo/bin:$PATH" npm run check
```

Build a distributable application with:

```bash
PATH="$HOME/.cargo/bin:$PATH" npm run tauri build
```

Generated packages are written below `src-tauri/target/release/bundle/`.

### Debian installation

Build and install the Ubuntu/Debian package with:

```bash
PATH="$HOME/.cargo/bin:$PATH" npm run tauri build -- --bundles deb
sudo apt install ./src-tauri/target/release/bundle/deb/bilingo_*.deb
```

The package installs an XDG autostart entry in `/etc/xdg/autostart`. Bilingo
therefore starts hidden when the graphical session begins and waits for its
global shortcuts. The package can be removed with `sudo apt remove
bilingo`.

## Project structure

```text
src/
  components/TranslationWindow.jsx  Interface and window interaction
  lib/translate.js                  Direction detection and stream handling
  config.js                         Non-secret model and window settings
src-tauri/
  src/main.rs                       Shortcuts and native window lifecycle
  tauri.conf.json                   Tauri permissions and bundle settings
config.example.json                 Safe runtime API-key template
```

## License and attribution

Bilingo is licensed under GPL-3.0 because its interface and desktop integration
are derived from [Pot Desktop](https://github.com/pot-app/pot-desktop). See
[`UPSTREAM.md`](UPSTREAM.md) for the exact upstream version and retained scope,
and [`LICENSE`](LICENSE) for the full license text.
