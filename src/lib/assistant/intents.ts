/**
 * Pure intent classification — no I/O, unit tested in
 * test/assistantIntents.test.mjs. This is a keyword/pattern matcher, not a
 * language model: it is honest about that in its own naming and in what it
 * can do. It exists so the assistant is genuinely useful today, and is
 * architected so a real LLM (via ANTHROPIC_API_KEY, see route.ts) can take
 * over classification later without changing the tool layer beneath it.
 */

export type IntentName =
  | 'profile' | 'progress' | 'pledges' | 'explain_sdg17' | 'how_platform_works'
  | 'create_reminder' | 'list_reminders' | 'ambiguous_performance' | 'escalate'
  | 'frustration' | 'greeting' | 'dismissal' | 'thanks' | 'farewell'
  | 'capabilities' | 'acknowledgement' | 'unknown';

export interface Intent {
  name: IntentName;
  params?: Record<string, string>;
}

/* Ordinary conversation comes first. Without these, "shut up", "thanks", and
   "ok" all fell through to the catch-all, which recited what the assistant
   can do -- so every dead end sounded like an SDG 17 sales pitch. Matching
   them costs nothing and stops the assistant talking past the person. */
const PATTERNS: [RegExp, IntentName][] = [
  [/\b(shut ?up|stop it|go away|leave me alone|be quiet|never ?mind|forget it)\b/i, 'dismissal'],
  [/^(thanks|thank you|thx|ty|cheers)\b/i, 'thanks'],
  [/^(bye|goodbye|see ?you|good ?night|cya)\b/i, 'farewell'],
  [/\b(what can you do|what do you do|who are you|what are you|how can you help|your capabilities)\b/i, 'capabilities'],
  [/\b(legal advice|speak (to|with) a human|talk to a (human|person)|contact support|human advisor)\b/i, 'escalate'],
  [/\b(useless|not working|asked (this |you )?(three|3|many|several) times|this is frustrating|ugh+|so dumb|stupid|rubbish|garbage)\b/i, 'frustration'],
  [/\b(hi|hello|hey|yo|hiya)\b[!.]?$/i, 'greeting'],
  [/^(ok(ay)?|k|cool|nice|got it|alright|sure|fine|yes|yeah|no|nope)[!.]?$/i, 'acknowledgement'],
  [/\bmy (profile|account)\b|who am i/i, 'profile'],
  [/\bremind(er)? me\b/i, 'create_reminder'],
  [/\b(my|list) reminders?\b/i, 'list_reminders'],
  [/\bmy (pledge|pledges)\b|pledge wall/i, 'pledges'],
  [/\bmy (points|badges|progress|impact score)\b/i, 'progress'],
  [/\bsdg ?17\b|\bwhat(?:'s| is) sdg\b|\bexplain sdg\b|five pillars|means of implementation/i, 'explain_sdg17'],
  [/\bhow (does|do) (this |the )?platform work\b|how (do i |to )?navigate/i, 'how_platform_works'],
  [/\b(show|what('s| is)) my performance\b/i, 'ambiguous_performance']
];

export function classifyIntent(text: string): Intent {
  const trimmed = text.trim();
  if (!trimmed) return { name: 'unknown' };

  for (const [pattern, name] of PATTERNS) {
    if (pattern.test(trimmed)) {
      if (name === 'create_reminder') {
        const match = trimmed.match(/remind(?:er)? me (?:to )?(.+)/i);
        return { name, params: { note: match?.[1]?.trim() || trimmed } };
      }
      return { name };
    }
  }
  return { name: 'unknown' };
}
