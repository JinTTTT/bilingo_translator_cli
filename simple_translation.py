#!/usr/bin/env python3
import re
import sys
import ollama

MODEL = "qwen2.5:7b"

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


def is_chinese(text: str) -> bool:
    return bool(re.search(r"[一-鿿㐀-䶿]", text))


def translate(text: str) -> None:
    if is_chinese(text):
        user_msg = f"Translate the following Chinese text to English:\n\n{text}"
    else:
        user_msg = f"Translate the following English text to Simplified Chinese:\n\n{text}"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": user_msg},
    ]

    print(f"{GREEN}", end="", flush=True)
    for chunk in ollama.chat(model=MODEL, messages=messages, stream=True):
        token = chunk["message"]["content"]
        print(token, end="", flush=True)
    print(f"{RESET}\n")


def fix(text: str) -> None:
    messages = [
        {"role": "system", "content": FIX_SYSTEM_PROMPT},
        {"role": "user",   "content": f"Fix this text:\n\n{text}"},
    ]
    print(f"{YELLOW}", end="", flush=True)
    for chunk in ollama.chat(model=MODEL, messages=messages, stream=True):
        print(chunk["message"]["content"], end="", flush=True)
    print(f"{RESET}\n")


def main() -> None:
    print(f"{BOLD}Simple Translation — English ↔ Chinese{RESET}")
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

        if text.lower().startswith("/fix "):
            fix(text[5:].strip())
        else:
            translate(text)


if __name__ == "__main__":
    main()
