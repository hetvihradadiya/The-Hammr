'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setupTwoFactor } from '@/lib/auth';

type SetupDetails = { qrCodeDataUrl?: string; manualKey?: string };

export default function TwoFactorSetupPage() {
  const router = useRouter();

  // Lazy state initialization (reads sessionStorage immediately during mount)
  const [details] = useState<SetupDetails>(() => {
    if (typeof window === 'undefined') return {};
    const saved = sessionStorage.getItem('hammr_2fa_setup');
    return saved ? (JSON.parse(saved) as SetupDetails) : {};
  });

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Use effect strictly for side effects (navigation redirect)
  useEffect(() => {
    const saved = sessionStorage.getItem('hammr_2fa_setup');
    if (!saved) {
      router.replace('/login');
    }
  }, [router]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await setupTwoFactor(code);
      sessionStorage.removeItem('hammr_2fa_setup');
      router.replace('/dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to set up 2FA');
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
          <h1 className="text-2xl font-bold">Set up Microsoft Authenticator</h1>
          <p className="mt-2 text-sm text-slate-400">
            Scan this QR code, then enter the six-digit code shown in the app.
          </p>
        </div>
        {details.qrCodeDataUrl && (
          <img
            src={details.qrCodeDataUrl}
            alt="Hammr authenticator QR code"
            className="mx-auto w-48 rounded-lg bg-white p-2"
          />
        )}
        {details.manualKey && (
          <p className="rounded-lg bg-slate-950 p-3 text-center text-xs text-slate-300 break-all">
            Manual key: {details.manualKey}
          </p>
        )}
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
          {loading ? 'Verifying…' : 'Finish setup'}
        </button>
      </form>
    </main>
  );
}
