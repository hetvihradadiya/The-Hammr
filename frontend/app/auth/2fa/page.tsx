'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { verifyTwoFactor } from '@/lib/auth';

export default function TwoFactorPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyTwoFactor(code);
      router.replace('/dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to verify code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 flex items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"
      >
        <div>
          <h1 className="text-2xl font-bold">Verify your identity</h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter the six-digit code from Microsoft Authenticator.
          </p>
        </div>
        <input
          autoFocus
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          pattern="[0-9]{6}"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-indigo-500"
          placeholder="000000"
          required
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={loading || code.length !== 6}
          className="w-full rounded-xl bg-indigo-600 py-3 font-semibold disabled:opacity-50"
        >
          {loading ? 'Verifying…' : 'Verify and sign in'}
        </button>
      </form>
    </main>
  );
}
