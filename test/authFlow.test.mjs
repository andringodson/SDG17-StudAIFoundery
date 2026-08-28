import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);

// Exercise actual source with framework, database and email boundaries mocked.
function load(file, mocks = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, require: (id) => id in mocks ? mocks[id] : require(id),
    console: { log() {}, error() {} }, process, ...globals
  });
  return exports;
}
const response = { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } };
const session = { userId: 'u1', username: 'user', role: 'general_user', sessionVersion: 0 };
const apiError = { handleApiError: () => ({ status: 500 }) };

test('/api/me includes email and rejects stale sessions', async () => {
  for (const version of [0, 1]) {
    const route = load('src/app/api/me/route.ts', {
      'next/server': response,
      '@/lib/auth': { getSession: async () => session },
      '@/lib/apiError': apiError,
      '@/lib/db': { query: async () => [{ email: 'person@example.com', is_email_verified: false, session_version: version }] }
    });
    const result = await route.GET();
    assert.equal(result.body.user?.email ?? null, version === 0 ? 'person@example.com' : null);
  }
});

test('OTP mail reports provider rejection and network failure as undelivered', async () => {
  const previous = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 'test-only';
  try {
    for (const mode of ['accepted', 'rejected', 'empty', 'throw']) {
      const mailer = load('src/lib/mailer.ts', { resend: { Resend: class {
        emails = { send: async () => {
          if (mode === 'throw') throw Error('offline');
          return mode === 'accepted' ? { data: { id: 'message-id' } } :
            mode === 'rejected' ? { error: { name: 'validation_error' } } : {};
        } };
      } } });
      assert.equal((await mailer.sendOtpEmail('person@example.com', '123456')).delivered, mode === 'accepted');
    }
  } finally {
    if (previous === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previous;
  }
});

test('login sends OTP only for unverified accounts and keeps session on email rejection', async () => {
  for (const verified of [false, true]) {
    let otp = 0, alert = 0, cookies = 0, updates = 0;
    const route = load('src/app/api/auth/login/route.ts', {
      'next/server': response, '@/lib/apiError': apiError,
      '@/lib/auth': { verifyPassword: async () => true, setSessionCookie: async () => { cookies++; } },
      '@/lib/db': { query: async (sql) => {
        if (sql.startsWith('UPDATE')) { updates++; return []; }
        return [{ id: 'u1', username: 'user', email: 'person@example.com', role: 'general_user', session_version: 0, password_hash: 'hash', is_email_verified: verified }];
      } },
      '@/lib/rateLimit': { rateLimit: () => ({ allowed: true }) },
      '@/lib/otp': { generateOtp: () => ({ code: '123456', expiresAt: new Date() }) },
      '@/lib/mailer': { sendOtpEmail: async () => { otp++; return { delivered: false }; }, sendLoginAlertEmail: async () => { alert++; } }
    });
    const result = await route.POST({ json: async () => ({ username: 'user', password: 'password' }), headers: new Headers() });
    assert.equal(result.status, 200);
    assert.equal(cookies, 1);
    assert.equal(otp, verified ? 0 : 1);
    assert.equal(updates, otp);
    assert.equal(alert, 1);
    assert.equal(result.body.requiresEmailVerification, !verified);
    if (!verified) assert.equal(result.body.emailDelivery.delivered, false);
  }
});

test('verification UI separates signed-in, signed-out and session lookup errors', async () => {
  for (const mode of ['signed-in', 'signed-out', 'failure']) {
    const state = [], effects = [];
    let index = 0;
    const page = load('src/app/auth/verify-email/page.tsx', {
      react: {
        useState: (initial) => { const i = index++; state[i] = initial; return [initial, (v) => { state[i] = v; }]; },
        useEffect: (fn) => effects.push(fn)
      },
      'next/navigation': { useRouter: () => ({ replace() {} }) },
      '@/components/auth/AuthShell': { AuthShell: () => null }
    }, {
      fetch: async () => ({ ok: mode !== 'failure', json: async () => ({ user: mode === 'signed-in' ? { email: 'person@example.com' } : null }) }),
      window: { location: { search: '?sent=0' } }, URLSearchParams
    });
    page.default();
    effects[0]();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(state[1], true);
    assert.equal(state[2], mode === 'signed-in');
    assert.equal(state[3], mode === 'failure');
    if (mode === 'signed-in') {
      assert.equal(state[0], 'person@example.com');
      assert.match(state[7], /could not send/);
    }
  }
});
