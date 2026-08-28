import test from 'node:test';
import assert from 'node:assert/strict';
import { startDictation, isSpeechSupported, speechErrorMessage } from '../src/lib/speech.ts';

/**
 * The Web Speech API needs a real browser and a real microphone, so these
 * tests drive a fake SpeechRecognition instead. That is enough to cover the
 * behaviour that actually broke voice input: the engine ends a session on
 * every pause, and nothing restarted it.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Records every instance constructed, so a test can assert that a *new*
 * recognition was spawned (i.e. the session restarted) rather than the old
 * one lingering. */
function installFakeSpeech({ startThrowsOnce = false } = {}) {
  const instances = [];
  let throwNext = startThrowsOnce;

  class FakeRecognition {
    constructor() {
      this.lang = '';
      this.continuous = false;
      this.interimResults = false;
      this.maxAlternatives = 1;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this.onstart = null;
      this.started = false;
      this.aborted = false;
      instances.push(this);
    }
    start() {
      if (throwNext) { throwNext = false; throw new Error('already started'); }
      this.started = true;
      this.onstart?.();
    }
    stop() { this.started = false; this.onend?.(); }
    abort() { this.aborted = true; this.started = false; }

    // helpers the tests drive
    emitError(code) { this.onerror?.({ error: code }); }
    emitEnd() { this.started = false; this.onend?.(); }
    emitResult(transcript, isFinal) {
      this.onresult?.({
        resultIndex: 0,
        results: { length: 1, 0: { 0: { transcript }, isFinal, length: 1 } }
      });
    }
  }

  globalThis.window = { SpeechRecognition: FakeRecognition, isSecureContext: true, location: { hostname: 'localhost' } };
  return instances;
}

test('reports support when the browser exposes a recogniser', () => {
  installFakeSpeech();
  assert.equal(isSpeechSupported(), true);
});

test('silence is never surfaced as an error', async () => {
  const instances = installFakeSpeech();
  const errors = [];
  const session = startDictation('en', {
    onTranscript: () => {},
    onError: (code) => errors.push(code),
    onListeningChange: () => {}
  });

  // Chrome fires this whenever nobody speaks for a few seconds — the old
  // code showed it as "I didn't catch anything", which is what made a
  // working microphone look broken.
  instances[0].emitError('no-speech');
  assert.deepEqual(errors, []);
  session.stop();
});

test('the session restarts itself after the engine ends on a pause', async () => {
  const instances = installFakeSpeech();
  const session = startDictation('en', {
    onTranscript: () => {},
    onError: () => {},
    onListeningChange: () => {}
  });
  assert.equal(instances.length, 1);

  instances[0].emitEnd(); // engine gives up at a natural pause
  await sleep(400);

  // A second instance means dictation actually resumed. Before the fix this
  // stayed at 1 and the microphone was dead until the user clicked again.
  assert.equal(instances.length, 2, 'expected a fresh recogniser after onend');
  assert.equal(instances[1].started, true);
  session.stop();
});

test('stop() ends the session for good — no resurrection', async () => {
  const instances = installFakeSpeech();
  const session = startDictation('en', {
    onTranscript: () => {},
    onError: () => {},
    onListeningChange: () => {}
  });

  session.stop();
  instances[0].emitEnd();
  await sleep(400);

  assert.equal(instances.length, 1, 'stopped session must not restart');
});

test('permission denial stops the session instead of looping the prompt', async () => {
  const instances = installFakeSpeech();
  const errors = [];
  startDictation('en', {
    onTranscript: () => {},
    onError: (code) => errors.push(code),
    onListeningChange: () => {}
  });

  instances[0].emitError('not-allowed');
  instances[0].emitEnd();
  await sleep(400);

  assert.deepEqual(errors, ['not-allowed']);
  assert.equal(instances.length, 1, 'must not retry after an explicit denial');
});

test('a throwing start() never claims to be listening', async () => {
  const instances = installFakeSpeech({ startThrowsOnce: true });
  const states = [];
  const session = startDictation('en', {
    onTranscript: () => {},
    onError: () => {},
    onListeningChange: (v) => states.push(v)
  });

  // The old code returned a handle regardless, so the UI showed a red
  // "listening" mic over a recogniser that had never started.
  assert.equal(states.includes(true), false, 'must not report listening when start() threw');

  await sleep(600);
  assert.equal(instances.length, 2, 'expected a retry after the failed start');
  session.stop();
});

test('final transcripts reach the caller', () => {
  const instances = installFakeSpeech();
  const heard = [];
  const session = startDictation('en', {
    onTranscript: (text, isFinal) => heard.push([text, isFinal]),
    onError: () => {},
    onListeningChange: () => {}
  });

  instances[0].emitResult('what is sdg 17', false);
  instances[0].emitResult('what is sdg 17', true);
  assert.deepEqual(heard, [['what is sdg 17', false], ['what is sdg 17', true]]);
  session.stop();
});

test('continuous mode is on, so a pause mid-sentence does not end capture', () => {
  const instances = installFakeSpeech();
  const session = startDictation('en', {
    onTranscript: () => {},
    onError: () => {},
    onListeningChange: () => {}
  });
  assert.equal(instances[0].continuous, true);
  assert.equal(instances[0].interimResults, true);
  session.stop();
});

test('language selection maps to an Indian English/Tamil/Hindi locale', () => {
  const instances = installFakeSpeech();
  const s1 = startDictation('ta', { onTranscript: () => {}, onError: () => {}, onListeningChange: () => {} });
  assert.equal(instances[0].lang, 'ta-IN');
  s1.stop();

  const s2 = startDictation('xx', { onTranscript: () => {}, onError: () => {}, onListeningChange: () => {} });
  assert.equal(instances[1].lang, 'en-IN', 'unknown language falls back to en-IN');
  s2.stop();
});

test('no-speech maps to no visible message', () => {
  assert.equal(speechErrorMessage('no-speech'), '');
  assert.match(speechErrorMessage('not-allowed'), /blocked/i);
});
