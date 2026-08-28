'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { Stepper } from '@/components/auth/Stepper';
import { PasswordField } from '@/components/auth/PasswordField';
import { checkPassword } from '@/lib/passwordStrength';
import { authErrorMessage } from '@/lib/authErrors';

const INDUSTRIES = ['Clean Energy', 'AgriTech', 'FinTech', 'HealthTech', 'EdTech', 'Manufacturing', 'Logistics', 'Other'];

export default function CompanyRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]!);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [yearFounded, setYearFounded] = useState(String(new Date().getFullYear()));

  const [agreeTos, setAgreeTos] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeNoGuarantee, setAgreeNoGuarantee] = useState(false);

  function nextFromStep1() {
    setError('');
    if (!fullName.trim() || !email.trim()) return setError('Please fill in every field.');
    const strength = checkPassword(password);
    if (!strength.valid) return setError(`Please create a stronger password — needs ${strength.missing.join(', ')}.`);
    if (password !== confirm) return setError('Passwords do not match.');
    setStep(2);
  }

  function nextFromStep2() {
    setError('');
    if (!companyName.trim() || !industry || !country.trim() || !city.trim()) {
      return setError('Please fill in every required field.');
    }
    setStep(3);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!agreeTos || !agreePrivacy || !agreeNoGuarantee) {
      return setError('Please accept all three agreements to continue.');
    }
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'company', fullName, username: (email.split('@')[0] ?? 'user') + Math.floor(Math.random() * 1000),
          email, password, companyName, website: website || undefined, industry, country, city,
          yearFounded: Number(yearFounded)
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(authErrorMessage(data.code ?? data.error) + (data.missing ? ` (needs ${data.missing.join(', ')})` : ''));
        return;
      }
      router.push(`/auth/verify-email?sent=${data.emailDelivery?.delivered ? '1' : '0'}`);
    } catch {
      setError(authErrorMessage('network_error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow="Company / Startup" title="Create your company account">
      <Stepper step={step} total={3} labels={['Account information', 'Company information', 'Agreements']} />

      {step === 1 && (
        <div className="grid gap-4">
          <Field label="Full name"><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} required /></Field>
          <Field label="Work email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} required /></Field>
          <PasswordField label="Password" value={password} onChange={setPassword} showStrength />
          <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} />
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <button type="button" onClick={nextFromStep1} className="glow-btn min-h-[44px] rounded-lg font-semibold">Continue</button>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <Field label="Company name"><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} required /></Field>
          <Field label="Company website (optional)"><input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://" /></Field>
          <Field label="Industry">
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputCls}>
              {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Country"><input value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} required /></Field>
            <Field label="City"><input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} required /></Field>
          </div>
          <Field label="Year founded"><input type="number" value={yearFounded} onChange={(e) => setYearFounded(e.target.value)} className={inputCls} min={1800} max={new Date().getFullYear()} /></Field>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 min-h-[44px] rounded-lg border border-line font-semibold">Back</button>
            <button type="button" onClick={nextFromStep2} className="glow-btn flex-1 min-h-[44px] rounded-lg font-semibold">Continue</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={submit} className="grid gap-4">
          <Agreement checked={agreeTos} onChange={setAgreeTos} label="I agree to the Terms of Service" />
          <Agreement checked={agreePrivacy} onChange={setAgreePrivacy} label="I agree to the Privacy Policy" />
          <Agreement checked={agreeNoGuarantee} onChange={setAgreeNoGuarantee} label="I understand that the platform does not guarantee funding or investment." />
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 min-h-[44px] rounded-lg border border-line font-semibold">Back</button>
            <button type="submit" disabled={busy} className="glow-btn flex-1 min-h-[44px] rounded-lg font-semibold disabled:opacity-40">
              {busy ? 'Creating account…' : 'Create Company Account'}
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-text-3">
        Already have an account? <Link href="/auth/login" className="font-semibold text-text underline">Log in</Link>
      </p>
    </AuthShell>
  );
}

const inputCls = 'w-full min-h-[44px] rounded-lg border border-line bg-surface-2 px-3 text-base';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-semibold text-text-2">{label}</span>
      {children}
    </label>
  );
}

function Agreement({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-2.5 text-sm text-text-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4" />
      <span>{label}</span>
    </label>
  );
}
