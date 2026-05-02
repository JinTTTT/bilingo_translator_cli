#!/usr/bin/env python3
import json
import re
import sys
import readline  # noqa: F401 — enables cursor movement and history in input()
from pathlib import Path
import ollama

CONFIG_PATH = Path(__file__).resolve().parent / "config.json"

CJK_LANGUAGES = {"chinese", "japanese", "korean", "mandarin", "cantonese"}

SYSTEM_PROMPT = (
    "You are a professional translator. "
    "Output only the translation. "
    "No explanations, no notes, no alternatives, no punctuation changes unless required."
)

FIX_SYSTEM_PROMPT = (
    "You are an English grammar editor. "
    "Fix grammar, spelling, and phrasing errors in the user's text. "
    "Output only the corrected sentence. No explanations."
)

RESET  = "\033[0m"
GRAY   = "\033[90m"
YELLOW = "\033[33m"
GREEN  = "\033[32m"
BOLD   = "\033[1m"


def load_config() -> dict:
    with open(CONFIG_PATH) as f:
        return json.load(f)


def is_cjk(text: str) -> bool:
    return bool(re.search(r"[一-鿿㐀-䶿぀-ヿ]", text))


def detect_direction(text: str, languages: list) -> tuple:
    lang_a, lang_b = languages
    if lang_b.lower() in CJK_LANGUAGES and is_cjk(text):
        return lang_b, lang_a
    if lang_a.lower() in CJK_LANGUAGES and is_cjk(text):
        return lang_a, lang_b
    return lang_a, lang_b


def translate(text: str, languages: list, model: str, keep_alive: str) -> None:
    src, dst = detect_direction(text, languages)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": f"Translate the following {src} text to {dst}:\n\n{text}"},
    ]
    print(f"{GREEN}", end="", flush=True)
    for chunk in ollama.chat(model=model, messages=messages, stream=True, keep_alive=keep_alive):
        print(chunk["message"]["content"], end="", flush=True)
    print(f"{RESET}\n")


def fix(text: str, model: str, keep_alive: str) -> None:
    messages = [
        {"role": "system", "content": FIX_SYSTEM_PROMPT},
        {"role": "user",   "content": f"Fix this text:\n\n{text}"},
    ]
    print(f"{YELLOW}", end="", flush=True)
    for chunk in ollama.chat(model=model, messages=messages, stream=True, keep_alive=keep_alive):
        print(chunk["message"]["content"], end="", flush=True)
    print(f"{RESET}\n")


def run(text: str, languages: list, model: str, keep_alive: str) -> None:
    if text.lower().startswith("/fix "):
        fix(text[5:].strip(), model, keep_alive)
    else:
        translate(text, languages, model, keep_alive)


def main() -> None:
    config = load_config()
    model = config["model"]
    languages = config["languages"]
    keep_alive = config.get("keep_alive", "5m")
    lang_a, lang_b = languages

    if len(sys.argv) > 1:
        run(" ".join(sys.argv[1:]), languages, model, keep_alive)
        sys.exit(0)

    print(f"{BOLD}bilingo — {lang_a.title()} ↔ {lang_b.title()}{RESET}")
    print(f"{GRAY}Type text to translate, or use /fix to correct grammar. Ctrl+C or 'exit' to quit.{RESET}\n")

    while True:
        try:
            text = input("> ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye!")
            sys.exit(0)

        if not text:
            continue
        if text.lower() in ("exit", "quit", "q"):
            print("Goodbye!")
            sys.exit(0)

        run(text, languages, model, keep_alive)


if __name__ == "__main__":
    main()
