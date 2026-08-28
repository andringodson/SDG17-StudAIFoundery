import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyIntent } from '../src/lib/assistant/intents.ts';
import { detectAssistantLanguage, findSupportKnowledge } from '../src/lib/assistant/knowledge.ts';

test('recognises a request to speak to a human as escalate', () => {
  assert.equal(classifyIntent('I want to talk to a human please').name, 'escalate');
});

test('recognises frustration signals', () => {
  assert.equal(classifyIntent('I have asked this three times!').name, 'frustration');
  assert.equal(classifyIntent('this is useless').name, 'frustration');
});

test('recognises SDG 17 explanation requests', () => {
  assert.equal(classifyIntent('Explain the SDG 17 features').name, 'explain_sdg17');
  assert.equal(classifyIntent('what is sdg').name, 'explain_sdg17');
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

test('uses the verified knowledge base for platform navigation', () => {
  const answer = findSupportKnowledge('How does the interactive global map work?');
  assert.match(answer.text, /five illustrative regional profiles/i);
  assert.equal(answer.actions[0].href, '/#map');
});

test('points to the real Connect feature for matching and messaging', () => {
  const answer = findSupportKnowledge('How do I find an investor and send a message?');
  assert.match(answer.text, /Connect is real/i);
  assert.equal(answer.actions[0].href, '/connect');
});

test('does not invent unavailable pitch/document features', () => {
  const answer = findSupportKnowledge('Can I share a pitch deck or documents?');
  assert.match(answer.text, /not certain this feature is currently available/i);
});

test('detects Tamil and Hindi script while preserving English as the default', () => {
  assert.equal(detectAssistantLanguage('SDG 17 என்ன?'), 'ta');
  assert.equal(detectAssistantLanguage('SDG 17 क्या है?'), 'hi');
  assert.equal(detectAssistantLanguage('What is SDG 17?'), 'en');
});

test('a question about one pillar answers that pillar, not the generic summary', () => {
  // Regression: 'finance' used to sit as a keyword on the general SDG 17
  // entry, so "what is finance" returned the whole five-pillar overview.
  const finance = findSupportKnowledge('what is finance');
  assert.match(finance.text, /^Finance is the first SDG 17 pillar/);
  assert.equal(finance.actions[0].href, '/#finance');

  const trade = findSupportKnowledge('what is trade');
  assert.match(trade.text, /^Trade is the fourth SDG 17 pillar/);

  const capacity = findSupportKnowledge('what is capacity building');
  assert.match(capacity.text, /^Capacity Building is the third SDG 17 pillar/);

  const technology = findSupportKnowledge('tell me about technology transfer');
  assert.match(technology.text, /^Technology is the second SDG 17 pillar/);

  const systemic = findSupportKnowledge('what does policy coherence mean');
  assert.match(systemic.text, /^Systemic Issues is the fifth SDG 17 pillar/);
});

test('the broad SDG 17 overview still answers a genuinely broad question', () => {
  const answer = findSupportKnowledge('what are the five pillars of SDG 17');
  assert.match(answer.text, /organises its targets into five pillars/i);
});

test('ordinary conversation is handled, not answered with a capability pitch', () => {
  // Regression: "shut up" / "thanks" / "ok" all fell through to the catch-all,
  // which recited what the assistant can do — so being told to stop produced
  // another sales pitch.
  assert.equal(classifyIntent('shut up').name, 'dismissal');
  assert.equal(classifyIntent('never mind').name, 'dismissal');
  assert.equal(classifyIntent('thanks').name, 'thanks');
  assert.equal(classifyIntent('bye').name, 'farewell');
  assert.equal(classifyIntent('ok').name, 'acknowledgement');
  assert.equal(classifyIntent('what can you do').name, 'capabilities');
});

test('anger is read as frustration rather than an unknown question', () => {
  assert.equal(classifyIntent('this is so dumb').name, 'frustration');
  assert.equal(classifyIntent('stupid assistant').name, 'frustration');
});

test('a real question is still classified over the conversational patterns', () => {
  // The conversational patterns run first, so guard that they are narrow
  // enough not to swallow genuine questions.
  assert.equal(classifyIntent('explain sdg 17').name, 'explain_sdg17');
  assert.equal(classifyIntent('show my points').name, 'progress');
  assert.equal(classifyIntent('how does this platform work').name, 'how_platform_works');
});
