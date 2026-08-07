import { TRANSLATOR_CONFIG } from '../config.js';

const CJK_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff]/u;

const SYSTEM_PROMPT = [
  'You are a professional translator.',
  'Output only the translation.',
  'No explanations, no notes, no alternatives, no punctuation changes unless required.',
].join(' ');

export async function streamTranslation(text, onUpdate) {
  const [languageA, languageB] = TRANSLATOR_CONFIG.languages;
  const [sourceLanguage, targetLanguage] = CJK_PATTERN.test(text)
    ? [languageB, languageA]
    : [languageA, languageB];

  const response = await fetch(`${TRANSLATOR_CONFIG.host}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: TRANSLATOR_CONFIG.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Translate the following ${sourceLanguage} text to ${targetLanguage}:\n\n${text}`,
        },
      ],
      stream: true,
      keep_alive: TRANSLATOR_CONFIG.keepAlive,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Ollama returned HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error('Ollama returned an empty response');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let translation = '';

  const consumeLine = (line) => {
    if (!line.trim()) return;
    const part = JSON.parse(line);
    if (part.error) throw new Error(part.error);
    translation += part.message?.content ?? '';
    onUpdate(translation);
  };

  while (true) {
    const { value, done } = await reader.read();
    pending += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    lines.forEach(consumeLine);
    if (done) break;
  }

  consumeLine(pending);
  return translation.trim();
}
