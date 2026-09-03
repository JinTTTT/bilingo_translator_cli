import { TRANSLATOR_CONFIG } from '../config.js';

const CHINESE_CHARACTER_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;

const SYSTEM_PROMPT = [
  'You are a professional translator.',
  'Translate faithfully without adding or removing information.',
  'When translating to Chinese, use Simplified Chinese.',
  'Output only the translation.',
  'No explanations, no notes, no alternatives, no punctuation changes unless required.',
].join(' ');

export function detectTranslationDirection(text) {
  return CHINESE_CHARACTER_PATTERN.test(text)
    ? { sourceLanguage: 'Chinese', targetLanguage: 'English' }
    : { sourceLanguage: 'English', targetLanguage: 'Simplified Chinese' };
}

export async function streamTranslation(text, onUpdate) {
  if (!TRANSLATOR_CONFIG.apiKey.trim()) {
    throw new Error('Add your DeepSeek API key to src/config.js first.');
  }

  const { sourceLanguage, targetLanguage } = detectTranslationDirection(text);

  const response = await fetch(`${TRANSLATOR_CONFIG.host}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TRANSLATOR_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: TRANSLATOR_CONFIG.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Translate the following ${sourceLanguage} text to ${targetLanguage}:\n\n${text}`,
        },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.1,
      stream: true,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    let message = details;
    try {
      message = JSON.parse(details)?.error?.message || details;
    } catch {
      // Keep the original response when it is not JSON.
    }
    throw new Error(message || `DeepSeek returned HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error('DeepSeek returned an empty response.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let translation = '';

  const consumeLine = (line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith('data:')) return;
    const data = trimmedLine.slice(5).trim();
    if (!data || data === '[DONE]') return;

    const part = JSON.parse(data);
    if (part.error) throw new Error(part.error.message || String(part.error));
    translation += part.choices?.[0]?.delta?.content ?? '';
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
  const result = translation.trim();
  if (!result) throw new Error('DeepSeek returned an empty translation.');
  return result;
}
