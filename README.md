# bilingo_translator_cli

A lightweight command-line translation tool that translates bidirectionally between **English and Chinese** using a local LLM via [Ollama](https://ollama.com). No internet required after setup — everything runs on your machine.

## Features

- **Auto-detection** — just type; it figures out whether to translate English → Chinese or Chinese → English
- **Grammar fix mode** — prefix with `/fix` to correct grammar instead of translating
- **One-shot mode** — pass text directly as an argument, get output, and exit
- **Streaming output** — responses appear token-by-token, no waiting
- **Color-coded output** — translations in green, grammar fixes in yellow
- **Scrollable history** — output stays in the terminal window as you work

## Requirements

- Ubuntu 22.04 (or any Linux distro)
- [Ollama](https://ollama.com) installed and running
- `qwen2.5:7b` model pulled
- Python 3.10+

## Setup

**1. Install Ollama**

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**2. Pull the model**

```bash
ollama pull qwen2.5:7b
```

**3. Install the Python dependency**

```bash
pip install ollama
```

**4. Install the CLI command**

```bash
chmod +x translator.py
sudo ln -sf "$(pwd)/translator.py" /usr/local/bin/translator
```

Or without sudo, install to user PATH:

```bash
mkdir -p ~/.local/bin
ln -sf "$(pwd)/translator.py" ~/.local/bin/translator
```

## Usage

**Interactive mode**

```bash
translator
```

```
bilingo — English ↔ Chinese
Type text to translate, or use /fix to correct grammar. Ctrl+C or 'exit' to quit.

> The meeting has been postponed to next Monday.
会议已推迟到下周一。

> 我想学习更多关于机器学习的知识
I want to learn more about machine learning.

> /fix what you wanted eat today dinner?
What did you want to eat for dinner today?
```

**One-shot mode**

```bash
translator Hello, how are you?
translator /fix what do he do for living?
```

Type `exit`, `quit`, or press `Ctrl+C` to quit interactive mode.

## Configuration

Edit `config.json` in the project directory to change the model or language pair:

```json
{
  "model": "qwen2.5:7b",
  "languages": ["english", "chinese"]
}
```

| Key | Description |
|---|---|
| `model` | Any Ollama model name |
| `languages` | Two-element list — the language pair to translate between |

## Model

Recommended models:

| Model | VRAM | Notes |
|---|---|---|
| `qwen2.5:7b` | ~4.7 GB | Default, fast, excellent Chinese |
| `qwen2.5:14b` | ~8.5 GB | Higher quality, needs more VRAM |

## License

MIT
