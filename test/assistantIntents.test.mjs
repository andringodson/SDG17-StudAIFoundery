import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyIntent } from '../src/lib/assistant/intents.ts';

test('recognises a request to speak to a human as escalate', () => {
  assert.equal(classifyIntent('I want to talk to a human please').name, 'escalate');
});

test('recognises frustration signals', () => {
  assert.equal(classifyIntent('I have asked this three times!').name, 'frustration');
  assert.equal(classifyIntent('this is useless').name, 'frustration');
});

test('recognises SDG 17 explanation requests', () => {
  assert.equal(classifyIntent('Explain the SDG 17 features').name, 'explain_sdg17');
  assert.equal(classifyIntent('what are the five pillars').name, 'explain_sdg17');
});

test('recognises progress/points requests', () => {
  assert.equal(classifyIntent('show my points').name, 'progress');
  assert.equal(classifyIntent('what is my progress').name, 'progress');
});

test('extracts the note text from a reminder request', () => {
  const i = classifyIntent('remind me to follow up tomorrow');
  assert.equal(i.name, 'create_reminder');
  assert.equal(i.params.note, 'follow up tomorrow');
});

test('ambiguous "show my performance" is flagged, not guessed', () => {
  assert.equal(classifyIntent('show my performance').name, 'ambiguous_performance');
});

test('unrecognised text falls back to unknown rather than a wrong guess', () => {
  assert.equal(classifyIntent('purple elephants dance slowly').name, 'unknown');
});

test('empty input is unknown', () => {
  assert.equal(classifyIntent('   ').name, 'unknown');
});
