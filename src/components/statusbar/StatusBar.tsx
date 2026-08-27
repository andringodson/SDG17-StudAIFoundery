'use client';

import { useEffect } from 'react';
import { useStatusBar, type StatusState } from './StatusBarContext';

const STATE_COLOR: Record<StatusState, string> = {
  idle: 'bg-brand-royal',
  normal: 'bg-brand-royal',
  warning: 'bg-status-warn',
  error: 'bg-status-error',
  complete: 'bg-status-complete'
};

const STEP_MARK: Record<string, string> = {
  pending: '○',
  active: '◐',
  done: '✓',
  failed: '✕',
  skipped: '–'
};

export function StatusBar() {
  const { snapshot, visible, cancel, toggleExpanded, expanded } = useStatusBar();

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key !== 'Escape') return;
      if (document.body.classList.contains('modal-open')) return;
      if (snapshot.cancellable) {
        ev.preventDefault();
        cancel('Cancelled with the Escape key.');
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cancel, snapshot.cancellable]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[120] border-t border-line-strong bg-surface-1/95 backdrop-blur-md shadow-[0_-14px_40px_rgb(2_10_20_/_0.5)]"
      data-state={snapshot.state}
    >
      <div className="mx-auto w-[min(100%-2rem,80rem)] py-2">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`h-3.5 w-3.5 flex-none rounded-full ${STATE_COLOR[snapshot.state]} ${
              snapshot.state === 'normal' ? 'animate-pulse' : ''
            }`}
            aria-hidden="true"
          />

          <div className="min-w-[11rem] flex-1">
            <p className="text-sm font-bold leading-tight">{snapshot.title}</p>
            <p className="truncate text-xs text-text-3">{snapshot.detail}</p>
          </div>

          <div
            className="relative h-2 flex-[2] min-w-[6rem] overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={snapshot.indeterminate ? undefined : Math.round(snapshot.progress)}
            aria-label="Operation progress"
          >
            <span
              className={`block h-full rounded-r ${STATE_COLOR[snapshot.state]} ${
                snapshot.indeterminate ? 'w-1/3 animate-[indet_1.15s_ease-in-out_infinite]' : ''
              }`}
              style={snapshot.indeterminate ? undefined : { width: `${snapshot.progress}%`, transition: 'width 0.28s ease' }}
            />
          </div>
          <span className="w-10 font-mono text-xs font-bold">
            {snapshot.indeterminate ? '' : `${Math.round(snapshot.progress)}%`}
          </span>

          {snapshot.cancellable && (
            <button
              type="button"
              onClick={() => cancel()}
              className="flex min-h-[36px] items-center gap-2 rounded-full border border-status-error/50 bg-status-error/15 px-3 text-sm font-semibold text-red-200 hover:bg-status-error/25"
            >
              Cancel{' '}
              <kbd className="rounded border border-current px-1 text-[0.7em] opacity-75">Esc</kbd>
            </button>
          )}

          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={expanded}
            aria-controls="status-panel"
            aria-label="Toggle diagnostic details"
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-text-2 hover:bg-white/10"
          >
            {expanded ? '▾' : '▴'}
          </button>
        </div>

        {expanded && (
          <div id="status-panel" className="mt-2 grid gap-4 border-t border-line pt-2 sm:grid-cols-2">
            <div>
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-text-3">Steps</h4>
              <ol className="grid gap-1">
                {snapshot.steps.map((step, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                      step.state === 'active'
                        ? 'bg-brand-cyan/10 text-brand-cyan'
                        : step.state === 'done'
                          ? 'text-status-complete'
                          : step.state === 'failed'
                            ? 'text-red-300'
                            : step.state === 'skipped'
                              ? 'opacity-50'
                              : 'text-text-3'
                    }`}
                  >
                    <span className="w-4 text-center font-bold">{STEP_MARK[step.state]}</span>
                    <span className="flex-1">{step.label}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-text-3">Activity log</h4>
              <ul className="grid max-h-44 gap-0.5 overflow-y-auto font-mono text-xs">
                {snapshot.log.map((entry, i) => (
                  <li
                    key={i}
                    className={`flex gap-2 ${
                      entry.tone === 'start'
                        ? 'text-brand-cyan'
                        : entry.tone === 'ok'
                          ? 'text-status-complete'
                          : entry.tone === 'warn'
                            ? 'text-status-warn'
                            : entry.tone === 'error'
                              ? 'text-red-300'
                              : 'text-text-3'
                    }`}
                  >
                    <span className="opacity-60">{entry.time}</span>
                    <span>{entry.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      <p role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
        {snapshot.title}. {snapshot.detail}
      </p>
    </div>
  );
}
