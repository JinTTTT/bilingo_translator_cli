# Bilingo

Bilingo is a small Linux desktop translator for English and Chinese. It uses
DeepSeek V4 Flash through the official DeepSeek API.

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

Create your local config, then paste your API key into `src/config.js`:

```bash
cp src/config.example.js src/config.js
```

The translator settings should look like this:

```js
export const TRANSLATOR_CONFIG = Object.freeze({
  apiKey: 'sk-your-api-key',
  host: 'https://api.deepseek.com',
  model: 'deepseek-v4-flash',
});
```

Then start Bilingo:

```bash
PATH="$HOME/.cargo/bin:$PATH" WEBKIT_DISABLE_DMABUF_RENDERER=1 npm run tauri dev
```

Do not commit or share `src/config.js` after adding your API key. The Bilingo
terminal must remain open while using the development build; stop it with
`Ctrl+C`.

## Configuration

Runtime settings are kept locally in `src/config.js`; use
[`src/config.example.js`](src/config.example.js) as the safe template:

```js
export const TRANSLATOR_CONFIG = {
  apiKey: 'sk-your-api-key',
  host: 'https://api.deepseek.com',
  model: 'deepseek-v4-flash',
};
```

DeepSeek thinking mode is disabled because translation does not require it.
Text containing Chinese characters is translated to English; other text is
translated from English to Simplified Chinese.

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

## Project structure

```text
src/
  components/TranslationWindow.jsx  Interface and window interaction
  lib/translate.js                  Direction detection and stream handling
  config.example.js                 Safe model and window settings template
  config.js                         Local settings and API key (ignored by Git)
src-tauri/
  src/main.rs                       Shortcuts and native window lifecycle
  tauri.conf.json                   Tauri permissions and bundle settings
```

## License and attribution

Bilingo is licensed under GPL-3.0 because its interface and desktop integration
are derived from [Pot Desktop](https://github.com/pot-app/pot-desktop). See
[`UPSTREAM.md`](UPSTREAM.md) for the exact upstream version and retained scope,
and [`LICENSE`](LICENSE) for the full license text.
