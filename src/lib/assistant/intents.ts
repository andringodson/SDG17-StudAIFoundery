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
  | 'frustration' | 'greeting' | 'unknown';

export interface Intent {
  name: IntentName;
  params?: Record<string, string>;
}

const PATTERNS: [RegExp, IntentName][] = [
  [/\b(legal advice|speak (to|with) a human|talk to a (human|person)|contact support|human advisor)\b/i, 'escalate'],
  [/\b(useless|not working|asked (this |you )?(three|3|many|several) times|this is frustrating|ugh+)\b/i, 'frustration'],
  [/\b(hi|hello|hey)\b[!.]?$/i, 'greeting'],
  [/\bmy (profile|account)\b|who am i/i, 'profile'],
  [/\bremind(er)? me\b/i, 'create_reminder'],
  [/\b(my|list) reminders?\b/i, 'list_reminders'],
  [/\bmy (pledge|pledges)\b|pledge wall/i, 'pledges'],
  [/\bmy (points|badges|progress|impact score)\b/i, 'progress'],
  [/\bsdg ?17\b|five pillars|means of implementation/i, 'explain_sdg17'],
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
