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

/** BCP-47 tags for the languages the assistant already offers. */
const LOCALE: Record<string, string> = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' };

export interface DictationHandle {
  stop: () => void;
}

/**
 * Starts dictation. `onTranscript` fires repeatedly with the best transcript
 * so far (`isFinal` marks the last one for an utterance), letting the caller
 * show interim words as they are spoken. Returns null when unsupported.
 */
export function startDictation(
  language: string,
  onTranscript: (text: string, isFinal: boolean) => void,
  onError: (code: string) => void,
  onEnd: () => void
): DictationHandle | null {
  const Ctor = getCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = LOCALE[language] ?? 'en-IN';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    let text = '';
    let isFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (!result) continue;
      text += result[0].transcript;
      if (result.isFinal) isFinal = true;
    }
    if (text.trim()) onTranscript(text.trim(), isFinal);
  };

  recognition.onerror = (event) => onError(event.error);
  recognition.onend = onEnd;

  try {
    recognition.start();
  } catch {
    // start() throws if called while already running; treat as a no-op.
    return { stop: () => recognition.abort() };
  }

  return { stop: () => recognition.stop() };
}

/** Maps the spec's error codes to something a person can act on. */
export function speechErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was blocked. Allow it in your browser settings to use voice input.';
    case 'no-speech':
      return "I didn't catch anything — try again and speak after the button turns red.";
    case 'audio-capture':
      return 'No microphone was found. Check that one is connected.';
    case 'network':
      return 'Voice input needs a network connection and could not reach the speech service.';
    case 'aborted':
      return '';
    default:
      return 'Voice input stopped unexpectedly. Please try again or type your question.';
  }
}
