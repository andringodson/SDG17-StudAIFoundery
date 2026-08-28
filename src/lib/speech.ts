/**
 * Voice input via the browser's built-in Web Speech API.
 *
 * Chosen over a cloud speech service deliberately: it needs no API key, no
 * billing account, and no server round-trip, and the audio never leaves the
 * user's machine — which matters for a feature that listens to a microphone.
 * (Google's Cloud Speech-to-Text was the original request, but it rejects API
 * keys outright: it requires OAuth2/service-account credentials and a
 * billing-enabled GCP project.)
 *
 * Support is real but uneven — Chrome, Edge, and Safari implement it; Firefox
 * does not. isSpeechSupported() gates the UI so the button is simply absent
 * where it would not work, rather than present and broken.
 *
 * The session below owns the awkward parts of this API — the parts that made
 * the first version look deaf:
 *   - Chrome ends recognition at the first natural pause, and again after a
 *     few seconds of silence ('no-speech'). One start() therefore listens
 *     briefly and then stops for good, so anything but an immediate short
 *     phrase was lost. This restarts itself until the caller says stop.
 *   - start() throws if the instance is already running. The old code caught
 *     that and returned a handle anyway, so the UI lit up "listening" while
 *     nothing was actually running. Exactly one instance is live here, and
 *     the listening state is driven by the engine's own onstart/onend.
 */

interface SpeechRecognitionAlternativeLike { transcript: string }
interface SpeechRecognitionResultLike { 0: SpeechRecognitionAlternativeLike; isFinal: boolean; length: number }
interface SpeechRecognitionEventLike { resultIndex: number; results: { length: number; [i: number]: SpeechRecognitionResultLike } }
interface SpeechRecognitionErrorEventLike { error: string }

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechSupported(): boolean {
  return getCtor() !== null;
}

/** Speech recognition requires a secure context. Anything other than
 * localhost must be HTTPS, or the API exists but never yields a result —
 * worth distinguishing from "your microphone is broken". */
export function isSecureContextForSpeech(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext === true || window.location.hostname === 'localhost';
}

/**
 * Asks for microphone access explicitly, resolving true once granted.
 *
 * start() does prompt on its own, but it returns immediately while the
 * prompt is still open — so the UI flipped to "listening" before permission
 * existed, and a slow accept meant the session had already ended. Requesting
 * first makes the order deterministic. The stream is closed straight away;
 * recognition opens its own.
 */
export async function ensureMicPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

/** True when the microphone is already granted, so hands-free listening can
 * start without springing an unprompted permission dialog on someone. */
export async function hasMicPermission(): Promise<boolean> {
  try {
    const permissions = (navigator as Navigator & { permissions?: Permissions }).permissions;
    if (permissions?.query) {
      // 'microphone' isn't in every lib.dom's PermissionName union yet.
      const status = await permissions.query({ name: 'microphone' as PermissionName });
      if (status.state === 'granted') return true;
      if (status.state === 'denied') return false;
    }
  } catch { /* Permissions API missing, or doesn't know 'microphone' */ }

  // Fallback: device labels are only exposed once permission was granted.
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((d) => d.kind === 'audioinput' && d.label !== '');
  } catch {
    return false;
  }
}

/** BCP-47 tags for the languages the assistant already offers. */
const LOCALE: Record<string, string> = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' };

export interface DictationSession {
  /** Stops for good — no restart. */
  stop: () => void;
  /** Swaps recognition language mid-session (restarts under the hood). */
  setLanguage: (language: string) => void;
}

export interface DictationCallbacks {
  /** Transcript so far; `isFinal` marks a completed utterance. */
  onTranscript: (text: string, isFinal: boolean) => void;
  /** Real, user-actionable failures only — routine silence never lands here. */
  onError: (code: string) => void;
  /** Driven by the engine's own start/end, so it can't claim to be
   * listening when it isn't. */
  onListeningChange: (listening: boolean) => void;
}

/**
 * Starts a self-sustaining dictation session. Returns null when the browser
 * has no implementation. Callers must hold the session and call stop().
 */
export function startDictation(language: string, cb: DictationCallbacks): DictationSession | null {
  const Ctor = getCtor();
  if (!Ctor) return null;

  let stopped = false;
  let current: SpeechRecognitionLike | null = null;
  let lang = LOCALE[language] ?? 'en-IN';
  let restartTimer: ReturnType<typeof setTimeout> | null = null;

  function spawn() {
    if (stopped) return;

    const recognition = new Ctor!();
    recognition.lang = lang;
    // Continuous so a pause mid-sentence doesn't end the session. Chrome
    // still ends it on longer silences; onend restarts below.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => { if (!stopped) cb.onListeningChange(true); };

    recognition.onresult = (event) => {
      let text = '';
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) continue;
        text += result[0].transcript;
        if (result.isFinal) isFinal = true;
      }
      if (text.trim()) cb.onTranscript(text.trim(), isFinal);
    };

    recognition.onerror = (event) => {
      // 'no-speech' is simply Chrome reporting silence — someone reading the
      // panel before speaking triggers it every time. Showing it as an error
      // is what made voice input look broken; onend restarts instead.
      // 'aborted' is our own stop().
      if (event.error === 'no-speech' || event.error === 'aborted') return;

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        stopped = true; // denied — restarting would just spam the user
      }
      cb.onError(event.error);
    };

    recognition.onend = () => {
      if (current === recognition) current = null;
      cb.onListeningChange(false);
      if (stopped) return;
      // Restarting synchronously inside onend makes Chrome throw
      // InvalidStateError, hence the tick of delay.
      restartTimer = setTimeout(spawn, 250);
    };

    try {
      recognition.start();
      current = recognition;
    } catch {
      // Already-running, or a transient engine failure. Back off and retry
      // rather than reporting a listening state that isn't real.
      cb.onListeningChange(false);
      if (!stopped) restartTimer = setTimeout(spawn, 400);
    }
  }

  spawn();

  return {
    stop() {
      stopped = true;
      if (restartTimer) clearTimeout(restartTimer);
      const recognition = current;
      current = null;
      try { recognition?.abort(); } catch { /* already dead */ }
      cb.onListeningChange(false);
    },
    setLanguage(next: string) {
      const resolved = LOCALE[next] ?? 'en-IN';
      if (resolved === lang) return;
      lang = resolved;
      // onend's restart picks up the new lang.
      try { current?.stop(); } catch { /* nothing running */ }
    }
  };
}

/** Maps the spec's error codes to something a person can act on. */
export function speechErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access is blocked. Allow it for this site in your browser settings (the icon at the left of the address bar), then try again.';
    case 'no-speech':
      return ''; // never surfaced — the session restarts instead
    case 'audio-capture':
      return 'No microphone was found. Check that one is connected and not in use by another app.';
    case 'network':
      return 'Voice input needs a network connection and could not reach the speech service.';
    case 'aborted':
      return '';
    default:
      return 'Voice input stopped unexpectedly. Please try again or type your question.';
  }
}
