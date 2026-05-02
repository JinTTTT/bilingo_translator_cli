# bilingo_cli

A lightweight command-line translation tool that translates bidirectionally between **English and Chinese** using a local LLM via [Ollama](https://ollama.com). No internet required after setup — everything runs on your machine.

## Features

- **Auto-detection** — just type; it figures out whether to translate English → Chinese or Chinese → English
- **Grammar fix mode** — prefix with `-fix:` to correct grammar instead of translating
- **Streaming output** — responses appear token-by-token, no waiting
- **Color-coded output** — translations in yellow, grammar fixes in green
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
chmod +x simple_translation.py
sudo ln -sf "$(pwd)/simple_translation.py" /usr/local/bin/bilingo
```

Or without sudo, install to user PATH:

```bash
mkdir -p ~/.local/bin
ln -sf "$(pwd)/simple_translation.py" ~/.local/bin/bilingo
```

## Usage

```bash
bilingo
```

```
Simple Translation — English ↔ Chinese
Type text to translate, or use -fix: to correct grammar. Ctrl+C or 'exit' to quit.

> The meeting has been postponed to next Monday.
会议已推迟到下周一。

> 我想学习更多关于机器学习的知识
I want to learn more about machine learning.

> -fix: what you wanted eat today dinner?
What did you want to eat for dinner today?
```

Type `exit`, `quit`, or press `Ctrl+C` to quit.

## Model

Uses `qwen2.5:7b` by default — an Alibaba model with strong Chinese language support. To use a different model, edit the `MODEL` variable at the top of `simple_translation.py`.

Recommended alternatives:

| Model | VRAM | Notes |
|---|---|---|
| `qwen2.5:7b` | ~4.7 GB | Default, fast, excellent Chinese |
| `qwen2.5:14b` | ~8.5 GB | Higher quality, needs more VRAM |

## License

MIT
