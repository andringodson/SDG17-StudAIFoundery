'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export type StatusState = 'idle' | 'normal' | 'warning' | 'error' | 'complete';

export interface StatusStep {
  label: string;
  state: 'pending' | 'active' | 'done' | 'failed' | 'skipped';
}

export interface StatusLogEntry {
  time: string;
  message: string;
  tone?: 'start' | 'ok' | 'warn' | 'error';
}

interface StatusSnapshot {
  state: StatusState;
  title: string;
  detail: string;
  progress: number; // 0..100, meaningless while indeterminate
  indeterminate: boolean;
  steps: StatusStep[];
  log: StatusLogEntry[];
  cancellable: boolean;
}

interface RunStep {
  label: string;
  weight?: number;
  work: (ctx: RunContext) => Promise<void> | void;
}

interface RunContext {
  progress: (fraction: number) => void;
  indeterminate: () => void;
  log: (message: string, tone?: StatusLogEntry['tone']) => void;
  get cancelled(): boolean;
}

interface RunConfig {
  title: string;
  detail?: string;
  doneText?: string;
  steps: RunStep[];
}

interface StatusBarApi {
  snapshot: StatusSnapshot;
  visible: boolean;
  run: (config: RunConfig) => Promise<void>;
  cancel: (reason?: string) => void;
  toggleExpanded: () => void;
  expanded: boolean;
}

const StatusBarCtx = createContext<StatusBarApi | null>(null);

function initialSnapshot(): StatusSnapshot {
  return {
    state: 'idle',
    title: '',
    detail: '',
    progress: 0,
    indeterminate: false,
    steps: [],
    log: [],
    cancellable: false
  };
}

function stamp(): string {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
}

export function StatusBarProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<StatusSnapshot>(initialSnapshot());
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const cancelledRef = useRef(false);
  const runIdRef = useRef(0);

  const appendLog = useCallback((message: string, tone?: StatusLogEntry['tone']) => {
    setSnapshot((s) => ({ ...s, log: [...s.log, { time: stamp(), message, tone }].slice(-100) }));
  }, []);

  const cancel = useCallback(
    (reason = 'Cancelled by user.') => {
      cancelledRef.current = true;
      appendLog(reason, 'warn');
    },
    [appendLog]
  );

  const run = useCallback(
    async (config: RunConfig) => {
      const myRunId = ++runIdRef.current;
      cancelledRef.current = false;
      setVisible(true);
      setExpanded(false);

      const totalWeight = config.steps.reduce((s, x) => s + (x.weight ?? 1), 0) || 1;
      let done = 0;

      setSnapshot({
        state: 'normal',
        title: config.title,
        detail: config.detail ?? '',
        progress: 0,
        indeterminate: false,
        cancellable: true,
        steps: config.steps.map((s) => ({ label: s.label, state: 'pending' })),
        log: [{ time: stamp(), message: `▶ ${config.title} started`, tone: 'start' }]
      });

      const isStale = () => runIdRef.current !== myRunId;

      const markCancelled = (fromIndex: number) => {
        setSnapshot((s) => ({
          ...s,
          state: 'warning',
          title: 'Cancelled',
          detail: 'Operation stopped before it finished.',
          steps: s.steps.map((st, idx) => (idx >= fromIndex ? { ...st, state: 'skipped' } : st))
        }));
        setTimeout(() => { if (!isStale()) setVisible(false); }, 3200);
      };

      for (let i = 0; i < config.steps.length; i += 1) {
        if (isStale()) return;
        if (cancelledRef.current) { markCancelled(i); return; }

        const step = config.steps[i]!;
        const weight = step.weight ?? 1;
        const base = done / totalWeight;

        setSnapshot((s) => ({
          ...s,
          detail: step.label,
          steps: s.steps.map((st, idx) => (idx === i ? { ...st, state: 'active' } : st))
        }));
        appendLog(`${step.label}…`);

        const ctx: RunContext = {
          get cancelled() {
            return cancelledRef.current;
          },
          progress: (fraction: number) => {
            if (cancelledRef.current || isStale()) return;
            const pct = Math.min(100, Math.max(0, (base + Math.min(1, Math.max(0, fraction)) * weight / totalWeight) * 100));
            setSnapshot((s) => ({ ...s, progress: pct, indeterminate: false }));
          },
          indeterminate: () => {
            if (isStale()) return;
            setSnapshot((s) => ({ ...s, indeterminate: true }));
          },
          log: appendLog
        };

        try {
          await step.work(ctx);
          if (isStale()) return;
          if (cancelledRef.current) { markCancelled(i); return; }
          done += weight;
          setSnapshot((s) => ({
            ...s,
            progress: (done / totalWeight) * 100,
            indeterminate: false,
            steps: s.steps.map((st, idx) => (idx === i ? { ...st, state: 'done' } : st))
          }));
        } catch (err) {
          if (isStale()) return;
          const message = err instanceof Error ? err.message : String(err);
          setSnapshot((s) => ({
            ...s,
            state: 'error',
            title: 'Failed',
            detail: message,
            steps: s.steps.map((st, idx) => (idx === i ? { ...st, state: 'failed' } : st))
          }));
          appendLog(`✕ ${step.label} — ${message}`, 'error');
          setTimeout(() => { if (!isStale()) setVisible(false); }, 4200);
          throw err;
        }
      }

      if (isStale()) return;
      setSnapshot((s) => ({
        ...s,
        state: 'complete',
        title: 'Complete',
        detail: config.doneText ?? 'Done',
        progress: 100,
        indeterminate: false,
        cancellable: false
      }));
      appendLog(`✓ ${config.doneText ?? 'Complete'}`, 'ok');
      setTimeout(() => { if (!isStale()) setVisible(false); }, 1800);
    },
    [appendLog]
  );

  const toggleExpanded = useCallback(() => setExpanded((v) => !v), []);

  const api: StatusBarApi = { snapshot, visible, run, cancel, toggleExpanded, expanded };

  return <StatusBarCtx.Provider value={api}>{children}</StatusBarCtx.Provider>;
}

export function useStatusBar(): StatusBarApi {
  const ctx = useContext(StatusBarCtx);
  if (!ctx) throw new Error('useStatusBar must be used within StatusBarProvider');
  return ctx;
}
