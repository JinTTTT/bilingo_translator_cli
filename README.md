# Bilingo

Bilingo is a small Linux desktop translator for English and Chinese. It uses a
local [Ollama](https://ollama.com/) model, so translated text stays on your
machine.

The application intentionally supports only two workflows:

- Highlight text and press `Ctrl+Alt+E` to translate it immediately.
- Press `Ctrl+Alt+I` to open an empty translation window.

The compact window opens in the top-right corner, grows with its content, and
hides when it loses focus. Use the pin button to keep it open. In the input
field, press `Enter` to translate or `Shift+Enter` to insert a new line.

## Requirements

- Linux with an X11 desktop session
- Node.js 18 or newer and npm
- Rust installed through [rustup](https://rustup.rs/)
- Ollama running locally
- The `qwen2.5:7b` model (about 4.7 GB on disk and approximately 5 GB of VRAM)

On Ubuntu 22.04, install the native Tauri dependencies with:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev libgtk-3-dev librsvg2-dev libxdo-dev
```

Install Rust and the model if they are not already available:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
ollama pull qwen2.5:7b
```

## Run in development

Install the project-local JavaScript dependencies once:

```bash
npm install
```

Ensure Ollama is running, then start Bilingo:

```bash
ollama serve
PATH="$HOME/.cargo/bin:$PATH" WEBKIT_DISABLE_DMABUF_RENDERER=1 npm run tauri dev
```

If `ollama serve` reports that port `11434` is already in use, the service is
already running. The Bilingo terminal must remain open while using the
development build; stop it with `Ctrl+C`.

## Configuration

Runtime settings are kept in [`src/config.js`](src/config.js):

```js
export const TRANSLATOR_CONFIG = {
  host: 'http://127.0.0.1:11434',
  model: 'qwen2.5:7b',
  languages: ['english', 'chinese'],
  keepAlive: '5m',
};
```

`keepAlive` controls how long Ollama retains the model in VRAM after the last
translation. With the default value, it unloads after approximately five
minutes of inactivity.

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
  lib/translate.js                  Direction detection and Ollama streaming
  config.js                         Model and window settings
src-tauri/
  src/main.rs                       Shortcuts and native window lifecycle
  tauri.conf.json                   Tauri permissions and bundle settings
```

## License and attribution

Bilingo is licensed under GPL-3.0 because its interface and desktop integration
are derived from [Pot Desktop](https://github.com/pot-app/pot-desktop). See
[`UPSTREAM.md`](UPSTREAM.md) for the exact upstream version and retained scope,
and [`LICENSE`](LICENSE) for the full license text.
