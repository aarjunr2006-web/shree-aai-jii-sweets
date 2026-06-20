'use client';

import React from 'react';
import Link from 'next/link';

export default function DemoPortalHub() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans antialiased relative overflow-hidden">
      {/* Background ambient gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-orange-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Main content container */}
      <main className="max-w-5xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center space-y-12 relative z-10 w-full">
        
        {/* Hub Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-extrabold text-3xl mx-auto shadow-lg shadow-orange-500/20">
            S
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              Shree Aai Ji Sweets <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Demo Portal</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              Explore the entire multi-app workspace flow from checkout to fulfillment. Access all user roles from this single gateway launcher.
            </p>
          </div>
        </div>

        {/* Portal cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          
          {/* 1. Customer Storefront */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 hover:border-amber-500/40 hover:bg-slate-900/90 transition-all duration-300 flex flex-col justify-between space-y-6 group shadow-lg">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🛍️
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">Customer Storefront</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Browse the fresh sweet catalog, add items to the shopping cart, and place orders with mock Razorpay UPI checkouts.
                </p>
              </div>
            </div>
            <Link 
              href="/store"
              className="bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl text-center text-xs font-bold transition-all duration-200 w-full shadow-md"
            >
              Enter Storefront →
            </Link>
          </div>

          {/* 2. Worker POS Terminal */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 hover:border-orange-500/40 hover:bg-slate-900/90 transition-all duration-300 flex flex-col justify-between space-y-6 group shadow-lg">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🖥️
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">Worker POS Terminal</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  In-store counter checkout used by staff. Supports quick item taps, SKU search inputs, and walk-in WhatsApp bill dispatch.
                </p>
              </div>
            </div>
            <a 
              href="http://localhost:3001"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-xl text-center text-xs font-bold transition-all duration-200 w-full shadow-md"
            >
              Open POS Terminal ↗
            </a>
          </div>

          {/* 3. Owner Dashboard */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 hover:border-rose-500/40 hover:bg-slate-900/90 transition-all duration-300 flex flex-col justify-between space-y-6 group shadow-lg">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                📋
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white group-hover:text-rose-400 transition-colors">Merchant Dashboard</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Control panel for business owners. Monitor sales metrics, view stock levels, trigger alerts, and replenish inventory.
                </p>
              </div>
            </div>
            <a 
              href="http://localhost:3002"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-rose-600/80 hover:bg-rose-700 text-white py-2.5 rounded-xl text-center text-xs font-bold transition-all duration-200 w-full shadow-md"
            >
              Access Dashboard ↗
            </a>
          </div>

        </div>

        {/* Informative instructions footer */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 text-center max-w-lg mx-auto text-[11px] text-slate-500">
          Tip: Open the POS counter and the Owner dashboard in separate windows alongside the storefront to watch inventory updates and order syncs in real-time.
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        © 2026 Shree Aai Ji Sweets. All rights reserved. Built with Turborepo & Next.js.
      </footer>
    </div>
  );
}
