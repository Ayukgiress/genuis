'use client';

import React, { useState } from 'react';
import * as Icons from '@radix-ui/react-icons';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/month',
    features: ['5 AI interview sessions/mo', '3 resume optimizations', 'Basic job tracking', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/month',
    features: ['Unlimited interview sessions', 'Unlimited resume optimizations', 'Advanced analytics', 'Priority support', 'Custom cover letters', 'LinkedIn integration'],
    highlighted: true,
  },
];

const mockInvoices = [
  { id: 'INV-001', date: 'Dec 1, 2024', amount: '$19.00', status: 'Paid' },
  { id: 'INV-002', date: 'Nov 1, 2024', amount: '$19.00', status: 'Paid' },
  { id: 'INV-003', date: 'Oct 1, 2024', amount: '$19.00', status: 'Paid' },
];

export const BillingSection = () => {
  const { user } = useAuthStore();
  const isPro = user?.subscription_plan === 'pro' && user?.subscription_status === 'active';
  const [showInvoices, setShowInvoices] = useState(false);

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-8 pb-6 border-b border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-1">Billing & Plans</h2>
        <p className="text-sm text-zinc-500">Manage your subscription and payment details.</p>
      </div>

      <div className="p-8 space-y-8">
        {/* Current Plan */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white">Current Plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plans.map((plan) => {
              const isActive = isPro ? plan.id === 'pro' : plan.id === 'free';
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-xl border-2 p-6 transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'border-zinc-800 bg-black/30'
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-black text-[10px] font-bold rounded-full uppercase tracking-wider">
                      Most Popular
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Icons.CheckIcon className="w-3 h-3 text-black" />
                    </div>
                  )}
                  <div className="mb-4">
                    <h4 className="font-bold text-white">{plan.name}</h4>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold text-white">{plan.price}</span>
                      <span className="text-sm text-zinc-500">{plan.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-zinc-400">
                        <Icons.CheckIcon className="w-3 h-3 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isActive && plan.id === 'pro' && (
                    <Link href="/payment?plan=pro" className="block mt-4">
                      <button className="w-full px-4 py-2 bg-primary text-black font-bold text-xs rounded-lg hover:opacity-90 transition-all">
                        Upgrade to Pro
                      </button>
                    </Link>
                  )}
                  {isActive && plan.id === 'pro' && (
                    <button className="mt-4 w-full px-4 py-2 border border-red-500/30 text-red-500 text-xs font-bold rounded-lg hover:bg-red-500/10 transition-all">
                      Cancel Subscription
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Method */}
        {isPro && (
          <div className="space-y-4 pt-6 border-t border-zinc-800/70">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Payment Method</h3>
              <button className="text-xs font-bold text-primary hover:underline">Update</button>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-black/30">
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <Icons.CardStackIcon className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Visa ending in 4242</p>
                <p className="text-xs text-zinc-500">Expires 12/2026</p>
              </div>
            </div>
          </div>
        )}

        {/* Billing History */}
        {isPro && (
          <div className="space-y-4 pt-6 border-t border-zinc-800/70">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Billing History</h3>
              <button
                onClick={() => setShowInvoices(!showInvoices)}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                {showInvoices ? 'Hide' : 'Show'} invoices
                <Icons.ChevronDownIcon className={`w-3 h-3 transition-transform ${showInvoices ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {showInvoices && (
              <div className="space-y-2">
                {mockInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-black/30">
                    <div>
                      <p className="text-sm font-semibold text-white">{inv.id}</p>
                      <p className="text-xs text-zinc-500">{inv.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-white">{inv.amount}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/20">
                        {inv.status}
                      </span>
                      <button className="text-xs text-zinc-500 hover:text-white transition-colors">
                        <Icons.DownloadIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
