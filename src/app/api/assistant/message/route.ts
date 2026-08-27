import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { classifyIntent } from '@/lib/assistant/intents';
import {
  getProfile, getProgressSummary, getMyPledges, createReminder, listReminders,
  logAiAction, formatBadgeCount
} from '@/lib/assistant/tools';
import { SDG17_EXPLAINER, PLATFORM_HELP, DISCLAIMER, detectAssistantLanguage, findSupportKnowledge, languagePreface, type AssistantAction, type AssistantLanguage } from '@/lib/assistant/knowledge';
import { handleApiError } from '@/lib/apiError';
import { formatCount } from '@/lib/inr';

const Body = z.object({
  message: z.string().min(1).max(1000),
  context: z.object({ pathname: z.string().max(200).optional(), hash: z.string().max(100).optional() }).optional(),
  language: z.enum(['en', 'ta', 'hi']).optional(),
  previousTopic: z.string().max(100).optional(),
  // Present only after the user has clicked "Confirm" on a proposed write action.
  confirmReminder: z.object({ note: z.string(), remindAt: z.string() }).optional()
});

export interface AssistantReply {
  text: string;
  suggestions?: string[];
  escalate?: boolean;
  frustration?: boolean;
  pendingConfirmation?: { kind: 'reminder'; note: string; remindAt: string };
  disclaimer?: boolean;
  actions?: AssistantAction[];
  topic?: string;
  language?: AssistantLanguage;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = session?.role ?? 'general_user';

  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid message' }, { status: 400 });

    // A confirmed write action arrives as its own field, bypassing intent
    // classification entirely — this is the confirm/edit/cancel step from
    // the spec actually being enforced server-side, not just in the UI.
    if (parsed.data.confirmReminder) {
      if (!session) {
        await logAiAction({ userId: null, role: null, toolName: 'createReminder', permissionDecision: 'denied', resultStatus: 'denied' });
        return NextResponse.json({ text: 'Please sign in to set a reminder.' } satisfies AssistantReply);
      }
      const { note, remindAt } = parsed.data.confirmReminder;
      const result = await createReminder(session, note, new Date(remindAt));
      await logAiAction({
        userId: session.userId, role: session.role, toolName: 'createReminder',
        permissionDecision: 'allowed', confirmationStatus: 'confirmed',
        resultStatus: result.ok ? 'success' : 'error', errorMessage: result.error
      });
      return NextResponse.json({
        text: result.ok ? `Done — I'll remind you: "${note}".` : "I couldn't create that reminder. No changes were made."
      } satisfies AssistantReply);
    }

    const language = parsed.data.language ?? detectAssistantLanguage(parsed.data.message);
    const prefix = languagePreface(language);
    const intent = classifyIntent(parsed.data.message);

    const respond = (reply: AssistantReply) => NextResponse.json({ ...reply, language });

    switch (intent.name) {
      case 'greeting':
        return respond({
          text: `${prefix}Hello! I’m the Stud AI Assistant. I can help you use the platform, understand SDG 17, build a partnership strategy, or look up your own progress and pledges.`,
          suggestions: suggestionsFor(role)
        });

      case 'escalate':
        await logAiAction({ userId: session?.userId ?? null, role, toolName: 'escalate', permissionDecision: 'allowed', resultStatus: 'success' });
        return respond({
          text: 'This request may require assistance from a qualified human advisor or support specialist.',
          escalate: true
        });

      case 'frustration':
        return respond({
          text: "I'm sorry this has been frustrating. I can try another approach or connect you with support.",
          frustration: true
        });

      case 'explain_sdg17':
        return respond({ text: `${prefix}${SDG17_EXPLAINER}`, suggestions: ['Give me an SDG 17 example', 'How does this platform work?'], actions: [{ label: 'Explore SDG 17 tools', href: '/#finance' }, { label: 'View the map', href: '/#map' }], topic: 'sdg17' });

      case 'how_platform_works':
        return respond({ text: `${prefix}${PLATFORM_HELP}`, suggestions: ['Explain SDG 17', 'Help me build a project'], actions: [{ label: 'Explore the map', href: '/#map' }, { label: 'Build a partnership', href: '/#builder' }], topic: 'platform' });

      case 'ambiguous_performance':
        return respond({
          text: 'Do you mean:\n1. Your own points and badges on this platform\n2. The Finance Impact Simulator\'s projected impact score\n3. A partnership strategy report you generated',
          suggestions: ['Show my points', 'Open the finance simulator', 'Open the partnership builder']
        });

      case 'profile': {
        if (!session) return respond({ text: 'Please sign in to see your profile.' });
        const result = await getProfile(session);
        await logAiAction({ userId: session.userId, role, toolName: 'getProfile', permissionDecision: 'allowed', resultStatus: result.ok ? 'success' : 'error' });
        const d = result.data as { username: string; role: string; is_email_verified: boolean; profile_completed_pct: number } | undefined;
        return respond({
          text: d
            ? `You're signed in as ${d.username} (${d.role.replace('_', ' ')}). Email verified: ${d.is_email_verified ? 'yes' : 'no'}. Profile ${d.profile_completed_pct}% complete.`
            : "I couldn't find your profile."
        });
      }

      case 'progress': {
        if (!session) return respond({ text: 'Please sign in to see your progress.' });
        const result = await getProgressSummary(session);
        await logAiAction({ userId: session.userId, role, toolName: 'getProgressSummary', permissionDecision: 'allowed', resultStatus: result.ok ? 'success' : 'error' });
        const d = result.data as { points: number; badges: unknown; financeBudgetFormatted: string } | undefined;
        return respond({
          text: d
            ? `You have ${formatCount(d.points)} points and ${formatBadgeCount(d.badges)} badges. Your last-used finance simulator budget was ${d.financeBudgetFormatted}.\n\n${DISCLAIMER}`
            : "I couldn't find any progress yet — try the simulators first.",
          disclaimer: true
        });
      }

      case 'pledges': {
        if (!session) return respond({ text: 'Please sign in to see your pledges.' });
        const result = await getMyPledges(session);
        await logAiAction({ userId: session.userId, role, toolName: 'getMyPledges', permissionDecision: 'allowed', resultStatus: result.ok ? 'success' : 'error' });
        const rows = (result.data as { pledge_text: string }[]) ?? [];
        return respond({
          text: rows.length
            ? `You've posted ${rows.length} pledge${rows.length === 1 ? '' : 's'}. Most recent: "${rows[0]!.pledge_text}"`
            : "You haven't posted a pledge yet — the Pledge Wall is in the Action Centre."
        });
      }

      case 'list_reminders': {
        if (!session) return respond({ text: 'Please sign in to see your reminders.' });
        const result = await listReminders(session);
        await logAiAction({ userId: session.userId, role, toolName: 'listReminders', permissionDecision: 'allowed', resultStatus: result.ok ? 'success' : 'error' });
        const rows = (result.data as { note: string; remind_at: string }[]) ?? [];
        return respond({
          text: rows.length
            ? `Your reminders:\n${rows.map((r) => `• ${r.note} (${new Date(r.remind_at).toLocaleDateString()})`).join('\n')}`
            : "You don't have any reminders yet."
        });
      }

      case 'create_reminder': {
        if (!session) return respond({ text: 'Please sign in to set a reminder.' });
        const note = intent.params?.note ?? parsed.data.message;
        const remindAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // default: tomorrow
        await logAiAction({
          userId: session.userId, role, toolName: 'createReminder',
          permissionDecision: 'allowed', confirmationStatus: 'pending', resultStatus: 'success'
        });
        return respond({
          text: `I'm ready to create this reminder: "${note}" for ${remindAt.toLocaleDateString()}.`,
          pendingConfirmation: { kind: 'reminder', note, remindAt: remindAt.toISOString() }
        });
      }

      default: {
        const knowledge = findSupportKnowledge(parsed.data.message);
        if (knowledge) return respond({
          text: `${prefix}${knowledge.text}`,
          actions: knowledge.actions,
          suggestions: ['Explain SDG 17', 'How does this platform work?', 'I need more help'],
          topic: knowledge.actions[0]?.href.includes('builder') ? 'builder' : knowledge.actions[0]?.href.includes('map') ? 'map' : 'platform'
        });
        if (parsed.data.previousTopic === 'sdg17' && /\b(example|idea|sample)\b/i.test(parsed.data.message)) return respond({
          text: `${prefix}An SDG 17 example is a university, local government, solar company, and community group sharing funding, skills, and technology to install and maintain solar-powered classrooms. The Partnership Builder can help you compare stakeholder choices and a budget for this kind of strategy.`,
          actions: [{ label: 'Open Partnership Builder', href: '/#builder' }],
          topic: 'sdg17'
        });
        return respond({
          text: `${prefix}I couldn’t find a clear answer to that question. I can help with platform navigation, SDG 17, the Partnership Builder, or your own points and pledges.`,
          suggestions: suggestionsFor(role),
          escalate: true
        });
      }
    }
  } catch (err) {
    await logAiAction({ userId: session?.userId ?? null, role, toolName: 'unknown', permissionDecision: 'allowed', resultStatus: 'error', errorMessage: String(err) });
    return handleApiError(err);
  }
}

function suggestionsFor(role: string): string[] {
  if (role === 'company') return ['Explain SDG 17', 'Show my profile', 'How does this platform work?'];
  if (role === 'investor') return ['Explain SDG 17', 'Show my profile', 'How does this platform work?'];
  return ['How does this platform work?', 'Explain SDG 17', 'Show my points'];
}
