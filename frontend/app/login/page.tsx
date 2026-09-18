'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Gavel, ArrowRight, Lock } from 'lucide-react';

import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { loginUser } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setServerError('');

    try {
      const response = await loginUser(data);

      if (response.data.requiresTwoFactorSetup) {
        sessionStorage.setItem('hammr_2fa_setup', JSON.stringify(response.data));
        router.push('/auth/2fa-setup');
        return;
      }

      if (response.data.requiresTwoFactor) {
        router.push('/auth/2fa');
        return;
      }

      router.push('/dashboard');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-2xl grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
        {/* Left Side: Brand & Visual Banner */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900/40 p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/60 relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                <Gavel className="w-6 h-6" />
              </div>
              <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                HAMMR
              </span>
            </div>

            <div className="mt-12 space-y-4">
              <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
                Welcome back
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Log in to monitor live bids, check active auctions, and manage your portfolio.
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-800/80 pt-6">
            <p className="text-xs text-slate-500">
              Protected by military-grade TOTP multi-factor authentication.
            </p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Sign In</h1>
            <p className="text-slate-400 text-sm mt-1.5">Enter your registered credentials below</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                {...register('email')}
                className={`w-full rounded-xl border bg-slate-950/80 px-4 py-3 text-sm outline-none transition duration-200 placeholder:text-slate-600 focus:ring-2 ${
                  errors.email
                    ? 'border-red-500/80 focus:ring-red-500/20'
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field with Toggle */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className={`w-full rounded-xl border bg-slate-950/80 pl-4 pr-10 py-3 text-sm outline-none transition duration-200 placeholder:text-slate-600 focus:ring-2 ${
                    errors.password
                      ? 'border-red-500/80 focus:ring-red-500/20'
                      : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Server Error Alert */}
            {serverError && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3.5 text-xs text-red-400 flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-red-400" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>

            {/* Register Link Footer */}
            <p className="text-center text-xs text-slate-400 mt-6">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-semibold text-indigo-400 hover:text-indigo-300 transition"
              >
                Create one now
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
