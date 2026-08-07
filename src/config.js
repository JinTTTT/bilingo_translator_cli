export const TRANSLATOR_CONFIG = Object.freeze({
  host: 'http://127.0.0.1:11434',
  model: 'qwen2.5:7b',
  languages: ['english', 'chinese'],
  keepAlive: '5m',
});

export const WINDOW_LAYOUT = Object.freeze({
  width: 300,
  minimumHeight: 190,
  maximumHeight: 470,
  inputMaximumHeight: 72,
  outputMaximumHeight: 200,
});
