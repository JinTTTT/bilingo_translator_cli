import { invoke } from '@tauri-apps/api/tauri';

import { TRANSLATOR_CONFIG } from '../config.js';

const CHINESE_CHARACTER_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;
const FIX_COMMAND_PATTERN = /^\/fix(?:\s+|$)/iu;

const TRANSLATION_PROMPT = [
  'You are a professional translator.',
  'Translate faithfully without adding or removing information.',
  'When translating to Chinese, use Simplified Chinese.',
  'Output only the translation.',
  'No explanations, no notes, no alternatives, no punctuation changes unless required.',
].join(' ');

const REFINEMENT_PROMPT = [
  'You are an expert English and Chinese editor.',
  'Rewrite the provided text in the same language.',
  'Correct grammar, spelling, word choice, and sentence structure.',
  'Make the result natural, clear, concise, and appropriate for professional communication such as email.',
  'When the input is fragmented or rambling, preserve its central intended meaning and organize it into a coherent sentence or short passage.',
  'Do not invent facts, names, numbers, promises, or details.',
  'Output only the improved text with no explanations, notes, labels, or alternatives.',
].join(' ');

export function detectTranslationDirection(text) {
  return CHINESE_CHARACTER_PATTERN.test(text)
    ? { sourceLanguage: 'Chinese', targetLanguage: 'English' }
    : { sourceLanguage: 'English', targetLanguage: 'Simplified Chinese' };
}

export function isRefinementRequest(text) {
  return FIX_COMMAND_PATTERN.test(text.trim());
}

export function prepareTextRequest(text) {
  const normalizedText = text.trim();
  if (isRefinementRequest(normalizedText)) {
    const content = normalizedText.replace(FIX_COMMAND_PATTERN, '').trim();
    if (!content) throw new Error('Enter text after /fix.');

    const language = CHINESE_CHARACTER_PATTERN.test(content) ? 'Chinese' : 'English';
    return {
      mode: 'refine',
      systemPrompt: REFINEMENT_PROMPT,
      userPrompt: `Refine this ${language} text:\n\n${content}`,
    };
  }

  const { sourceLanguage, targetLanguage } = detectTranslationDirection(normalizedText);
  return {
    mode: 'translate',
    systemPrompt: TRANSLATION_PROMPT,
    userPrompt: `Translate the following ${sourceLanguage} text to ${targetLanguage}:\n\n${normalizedText}`,
  };
}

export async function streamTextResponse(text, onUpdate) {
  const request = prepareTextRequest(text);
  const apiKey = await invoke('get_api_key');

  const response = await fetch(`${TRANSLATOR_CONFIG.host}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: TRANSLATOR_CONFIG.model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      thinking: { type: 'disabled' },
      temperature: request.mode === 'refine' ? 0.2 : 0.1,
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
  let responseText = '';

  const consumeLine = (line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith('data:')) return;
    const data = trimmedLine.slice(5).trim();
    if (!data || data === '[DONE]') return;

    const part = JSON.parse(data);
    if (part.error) throw new Error(part.error.message || String(part.error));
    responseText += part.choices?.[0]?.delta?.content ?? '';
    onUpdate(responseText);
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
  const result = responseText.trim();
  if (!result) throw new Error('DeepSeek returned an empty response.');
  return result;
}
