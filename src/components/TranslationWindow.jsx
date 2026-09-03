import { writeText } from '@tauri-apps/api/clipboard';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import { appWindow, LogicalSize } from '@tauri-apps/api/window';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { TRANSLATOR_CONFIG, WINDOW_LAYOUT } from '../config.js';
import { isRefinementRequest, streamTextResponse } from '../lib/translate.js';

const ICON_PATHS = {
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  pin: <><path d="m9 4 6 6m-8.5 1.5 6 6M14 3l7 7-4 1-5.5 5.5-4-4L13 7z" /><path d="m7.5 16.5-4 4" /></>,
  trash: <><path d="M4 7h16M9 3h6l1 4H8zM6 7l1 14h10l1-14M10 11v6m4-6v6" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
};

function Icon({ name }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name]}
    </svg>
  );
}

export default function TranslationWindow() {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [status, setStatus] = useState('Ready');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const shellRef = useRef(null);
  const sourceRef = useRef(null);
  const outputRef = useRef(null);
  const requestIdRef = useRef(0);
  const isRefining = isRefinementRequest(sourceText);

  useLayoutEffect(() => {
    const fitTextarea = (element, maximumHeight) => {
      if (!element) return;
      element.style.height = '0px';
      const nextHeight = Math.min(Math.max(element.scrollHeight, 26), maximumHeight);
      element.style.height = `${nextHeight}px`;
      element.style.overflowY = element.scrollHeight > maximumHeight ? 'auto' : 'hidden';
    };

    fitTextarea(sourceRef.current, WINDOW_LAYOUT.inputMaximumHeight);
    fitTextarea(outputRef.current, WINDOW_LAYOUT.outputMaximumHeight);

    const frame = window.requestAnimationFrame(() => {
      const contentHeight = Math.ceil(shellRef.current?.scrollHeight ?? 220);
      const windowHeight = Math.min(
        Math.max(contentHeight, WINDOW_LAYOUT.minimumHeight),
        WINDOW_LAYOUT.maximumHeight,
      );
      void appWindow.setSize(new LogicalSize(WINDOW_LAYOUT.width, windowHeight));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [sourceText, translatedText, isTranslating]);

  const translate = useCallback(async (text = sourceText) => {
    const normalizedText = text.trim();
    if (!normalizedText) {
      sourceRef.current?.focus();
      return;
    }

    const requestId = ++requestIdRef.current;
    setTranslatedText('');
    setStatus(isRefinementRequest(normalizedText) ? 'Refining…' : 'Translating…');
    setIsTranslating(true);

    try {
      const result = await streamTextResponse(normalizedText, (partialResult) => {
        if (requestId === requestIdRef.current) {
          setTranslatedText(partialResult);
        }
      });
      if (requestId === requestIdRef.current) {
        setTranslatedText(result);
        setStatus('Complete');
      }
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setStatus('DeepSeek unavailable');
        setTranslatedText(error instanceof Error ? error.message : String(error));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsTranslating(false);
      }
    }
  }, [sourceText]);

  useEffect(() => {
    const unlistenPromise = listen('translation-request', ({ payload }) => {
      const nextText = payload?.text ?? '';
      requestIdRef.current += 1;
      setSourceText(nextText);
      setTranslatedText('');
      setStatus('Ready');
      setIsTranslating(false);

      window.setTimeout(() => {
        void appWindow.setFocus();
      }, 80);

      if (payload?.autoTranslate && nextText.trim()) {
        void translate(nextText);
      } else {
        window.setTimeout(() => {
          sourceRef.current?.focus();
        }, 80);
      }
    });

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [translate]);

  useEffect(() => {
    const handleKeyboard = (event) => {
      if (event.key === 'Escape') {
        void appWindow.hide();
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  const clear = () => {
    requestIdRef.current += 1;
    setSourceText('');
    setTranslatedText('');
    setStatus('Ready');
    setIsTranslating(false);
    sourceRef.current?.focus();
  };

  const togglePin = async () => {
    const nextPinned = !isPinned;
    await invoke('set_pinned', { pinned: nextPinned });
    setIsPinned(nextPinned);
  };

  return (
    <main ref={shellRef} className="window-shell">
      <header className="titlebar" data-tauri-drag-region>
        <button
          className={`icon-button pin-button ${isPinned ? 'active' : ''}`}
          aria-label={isPinned ? 'Unpin window' : 'Keep window open'}
          title={isPinned ? 'Unpin window' : 'Keep window open'}
          onClick={() => void togglePin()}
        >
          <Icon name="pin" />
        </button>
        <span className="window-title" data-tauri-drag-region>Translate & Refine</span>
        <button className="icon-button" aria-label="Close" onClick={() => void appWindow.hide()}>
          <Icon name="close" />
        </button>
      </header>

      <section className="translation-card input-card">
        <div className="card-heading">
          <span>Input</span>
          <div className="card-actions">
            <button className="icon-button small" aria-label="Copy input" onClick={() => void writeText(sourceText)}>
              <Icon name="copy" />
            </button>
            <button className="icon-button small" aria-label="Clear" onClick={clear}>
              <Icon name="trash" />
            </button>
          </div>
        </div>
        <textarea
          ref={sourceRef}
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void translate();
            }
          }}
          placeholder="Translate text, or use /fix to refine it…"
          spellCheck
        />
        <button className="translate-button" disabled={isTranslating || !sourceText.trim()} onClick={() => void translate()}>
          <span>{isTranslating ? (isRefining ? 'Refining…' : 'Translating…') : (isRefining ? 'Refine' : 'Translate')}</span>
          <Icon name="arrow" />
        </button>
      </section>

      <section className="translation-card output-card">
        <div className="card-heading">
          <span>{isRefining ? 'Refinement' : 'Translation'}</span>
          <button
            className="icon-button small"
            aria-label="Copy translation"
            disabled={!translatedText}
            onClick={() => void writeText(translatedText)}
          >
            <Icon name="copy" />
          </button>
        </div>
        <textarea ref={outputRef} value={translatedText} readOnly placeholder="The result will appear here." />
      </section>

      <footer>
        <span className={`status-dot ${isTranslating ? 'active' : ''}`} />
        <span>{status}</span>
        <span className="model-name">{TRANSLATOR_CONFIG.model}</span>
      </footer>
    </main>
  );
}
