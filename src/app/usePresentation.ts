import { useCallback, useEffect, useState } from 'react';

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

/**
 * Presentation mode: toggled by a button or "P"; "Esc" (or leaving browser fullscreen) exits.
 * Browser fullscreen is requested when available but not required.
 */
export function usePresentation(onTogglePlay: () => void) {
  const [presenting, setPresenting] = useState(false);

  const enter = useCallback(() => {
    setPresenting(true);
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);

  const exit = useCallback(() => {
    setPresenting(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (presenting) exit();
        else enter();
      } else if (presenting && e.key === 'Escape') {
        exit();
      } else if (presenting && e.key === ' ') {
        e.preventDefault();
        onTogglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presenting, enter, exit, onTogglePlay]);

  return { presenting, enter, exit };
}
