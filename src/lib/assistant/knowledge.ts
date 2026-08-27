export const SDG17_EXPLAINER =
  'SDG 17 organises its targets into five pillars: Finance (mobilising resources), ' +
  'Technology (transfer and knowledge sharing), Capacity Building (skills that outlast funding), ' +
  'Trade (rules that let smaller economies compete), and Systemic Issues (policy coherence and ' +
  'multi-stakeholder governance). You can explore each one, with real allocation charts and an ' +
  'interactive tool, in the Pillars section of the platform.';

export const PLATFORM_HELP =
  'This platform has five interactive tools: the Finance Impact Simulator (budget → projects/impact), ' +
  'the Fair Trade Simulator, the Capacity Building learning paths, the Partnership Builder ' +
  '(pick stakeholders and a budget to get a scored strategy report), and the Global Partnership ' +
  'Map. Use the nav bar at the top to jump to any of them, or ask me things like ' +
  '"explain SDG 17" or "show my points."';

export const DISCLAIMER =
  'Educational Information Only: this response is generated from data already on this platform ' +
  'and is not personalised financial, investment, legal, or tax advice.';

export type AssistantAction = { label: string; href: string };
export type AssistantLanguage = 'en' | 'ta' | 'hi';
export type AssistantContext = { pathname?: string; hash?: string };

type KnowledgeEntry = { keywords: string[]; text: string; actions: AssistantAction[] };

const SUPPORT_KNOWLEDGE: KnowledgeEntry[] = [
  {
    keywords: ['website', 'platform', 'what can i do', 'navigate'],
    text: PLATFORM_HELP,
    actions: [{ label: 'Explore the map', href: '/#map' }, { label: 'Open Partnership Builder', href: '/#builder' }]
  },
  {
    keywords: ['sdg 17', 'partnerships for the goals', 'finance', 'technology', 'capacity building', 'trade', 'systemic'],
    text: SDG17_EXPLAINER,
    actions: [{ label: 'Explore SDG 17 tools', href: '/#finance' }, { label: 'View the map', href: '/#map' }]
  },
  {
    keywords: ['build a project', 'build project', 'project builder', 'strategy report', 'generate strategy', 'partnership builder'],
    text: 'The current Project Builder is the Partnership Builder. Select stakeholders and a budget, then generate a strategy report with a partnership score and diagnostics. It does not yet create or store standalone project records.',
    actions: [{ label: 'Open Partnership Builder', href: '/#builder' }]
  },
  {
    keywords: ['map', 'global partnerships', 'region', 'connections'],
    text: 'The interactive map compares five illustrative regional profiles. Filter by pillar, then select a region to see its projects, partners, funding, and focus areas. Circle size represents projects; shade represents funding.',
    actions: [{ label: 'Open the map', href: '/#map' }]
  },
  {
    keywords: ['register', 'registration', 'login', 'sign in', 'account', 'password', 'dashboard', 'profile'],
    text: 'Choose Create Account, select Company, Investor, or General User, and complete the guided form. Role-specific dashboards are protected server-side. Email verification and profile-completion status are available after registration.',
    actions: [{ label: 'Create an account', href: '/auth/register' }, { label: 'Sign in', href: '/auth/login' }]
  },
  {
    keywords: ['investor matching', 'find investor', 'find an investor', 'contact investor', 'contact company', 'messages', 'send a message', 'communication', 'pitch deck', 'pitch room', 'document sharing', 'notifications'],
    text: 'I’m not certain this feature is currently available on the platform. Company and investor profiles and dashboards exist, but automated matching, in-platform messages, pitch rooms, document sharing, and notifications have not been released. I can help you use the available Partnership Builder instead.',
    actions: [{ label: 'Open Partnership Builder', href: '/#builder' }]
  },
  {
    keywords: ['not working', 'error', 'loading', 'problem', 'broken', 'cannot generate'],
    text: 'Try refreshing the page, checking your connection, and retrying after a few seconds. If the issue continues, describe what happened and the page you were on. Never include passwords, private documents, or financial information in a support request.',
    actions: [{ label: 'Try again', href: '/' }]
  }
];

export function detectAssistantLanguage(text: string): AssistantLanguage {
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return 'en';
}

function bestMatch(text: string, entries: KnowledgeEntry[]): { text: string; actions: AssistantAction[] } | null {
  const lower = text.toLowerCase();
  const match = entries
    .map((entry) => ({ entry, score: entry.keywords.reduce((score, keyword) => score + (lower.includes(keyword) ? keyword.length : 0), 0) }))
    .sort((a, b) => b.score - a.score)[0];
  return match?.score ? { text: match.entry.text, actions: match.entry.actions } : null;
}

/** Admin-managed rows from assistant_faqs, active only. Returns [] whenever
 * the database isn't configured or the table is empty — the hardcoded
 * SUPPORT_KNOWLEDGE above is what keeps the assistant working either way. */
export async function getCustomFaqs(): Promise<KnowledgeEntry[]> {
  try {
    const { query } = await import('@/lib/db');
    const rows = await query<{ keywords: string[]; response: string; action_label: string | null; action_href: string | null }>(
      'SELECT keywords, response, action_label, action_href FROM assistant_faqs WHERE is_active = true'
    );
    return rows.map((r) => ({
      keywords: r.keywords.map((k) => k.toLowerCase()),
      text: r.response,
      actions: r.action_label && r.action_href ? [{ label: r.action_label, href: r.action_href }] : []
    }));
  } catch {
    return [];
  }
}

/** Synchronous match against the hardcoded knowledge only — used where a
 * database round-trip isn't warranted (e.g. pageSupport's static hints). */
export function findSupportKnowledge(text: string): { text: string; actions: AssistantAction[] } | null {
  return bestMatch(text, SUPPORT_KNOWLEDGE);
}

/** Admin-managed FAQs take priority over the hardcoded ones on a tie, since
 * an admin correcting or replacing a stock answer should win. Falls back to
 * the hardcoded set whenever no custom entry scores higher. */
export async function findAssistantAnswer(text: string): Promise<{ text: string; actions: AssistantAction[] } | null> {
  const custom = await getCustomFaqs();
  if (custom.length) {
    const customMatch = bestMatch(text, custom);
    const stockMatch = bestMatch(text, SUPPORT_KNOWLEDGE);
    if (customMatch && (!stockMatch || scoreOf(text, custom) >= scoreOf(text, SUPPORT_KNOWLEDGE))) return customMatch;
    return stockMatch ?? customMatch;
  }
  return findSupportKnowledge(text);
}

function scoreOf(text: string, entries: KnowledgeEntry[]): number {
  const lower = text.toLowerCase();
  return Math.max(0, ...entries.map((e) => e.keywords.reduce((s, k) => s + (lower.includes(k) ? k.length : 0), 0)));
}

export function pageSupport(context?: AssistantContext): { text: string; actions: AssistantAction[] } | null {
  const page = `${context?.pathname ?? ''}${context?.hash ?? ''}`.toLowerCase();
  if (page.includes('#builder')) return findSupportKnowledge('partnership builder');
  if (page.includes('#map')) return findSupportKnowledge('global partnerships map');
  if (page.includes('#finance')) return findSupportKnowledge('finance SDG 17');
  if (page.includes('/auth')) return findSupportKnowledge('registration account');
  return null;
}

export function languagePreface(language: AssistantLanguage): string {
  if (language === 'ta') return 'வணக்கம்! நான் Stud AI Assistant. கீழே உள்ள தகவல் தளத்தின் தற்போதைய அம்சங்களை அடிப்படையாகக் கொண்டது.\n\n';
  if (language === 'hi') return 'नमस्ते! मैं Stud AI Assistant हूँ। नीचे दी गई जानकारी प्लेटफ़ॉर्म की वर्तमान सुविधाओं पर आधारित है।\n\n';
  return '';
}
