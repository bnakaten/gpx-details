/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-only
 */

import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Info, HelpCircle } from 'lucide-react';
import { useAuth } from './AuthContext';
import { UserMenu } from './UserMenu';
import { BuildInfo } from './BuildInfo';

export function Layout() {
  const { user, isLoading: authLoading, login, stravaConfigured, configureStrava } = useAuth();

  const [showStravaConfig, setShowStravaConfig] = useState(false);
  const [configClientId, setConfigClientId] = useState('');
  const [configClientSecret, setConfigClientSecret] = useState('');
  const [configRedirectUri, setConfigRedirectUri] = useState('https://gpx-details.onrender.com/api/auth/strava/callback');
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [showStravaHelp, setShowStravaHelp] = useState(false);

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError(null);
    setConfigSaving(true);
    try {
      await configureStrava(configClientId, configClientSecret, configRedirectUri);
      login();
    } catch (err: any) {
      setConfigError(err.message || 'Error saving.');
    } finally {
      setConfigSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] flex flex-col font-sans">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#E5E7EB] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition">
            <img src="/gpx-details-logo.png" alt="GPX Details" className="w-9 h-9 rounded" />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-[#111827]">GPX Analyzer</h1>
              <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider">
                Stop-time Analysis &amp; Waypoint Filter
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {(() => {
            if (authLoading) return null;
            if (user) return <UserMenu key="menu" />;
            if (showStravaConfig) {
              return (
                <div key="config" className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-[#FC4C02]">1.</span>
                    <span className="text-[10px] text-[#374151]">Setup Strava API application</span>
                    <button
                      type="button"
                      onClick={() => setShowStravaHelp(true)}
                      className="text-[#9CA3AF] hover:text-[#2563EB] transition cursor-pointer"
                      title="How to get Strava API credentials"
                    >
                      <HelpCircle size={12} />
                    </button>
                  </div>
                  <form onSubmit={handleConfigSubmit} className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-[#FC4C02]">2.</span>
                    <input
                      type="text"
                      placeholder="Client ID"
                      value={configClientId}
                      onChange={(e) => setConfigClientId(e.target.value)}
                      className="text-[10px] border border-[#E5E7EB] rounded px-2 py-1 w-28 focus:outline-none focus:border-[#FC4C02]"
                    />
                    <input
                      type="text"
                      placeholder="Client Secret"
                      value={configClientSecret}
                      onChange={(e) => setConfigClientSecret(e.target.value)}
                      className="text-[10px] border border-[#E5E7EB] rounded px-2 py-1 w-32 focus:outline-none focus:border-[#FC4C02]"
                    />
                    <input
                      type="text"
                      placeholder="Redirect URI (optional)"
                      value={configRedirectUri}
                      onChange={(e) => setConfigRedirectUri(e.target.value)}
                      className="text-[10px] border border-[#E5E7EB] rounded px-2 py-1 w-64 focus:outline-none focus:border-[#FC4C02]"
                    />
                    <button
                      type="submit"
                      disabled={configSaving}
                      className="bg-[#FC4C02] hover:bg-[#E34402] text-white text-[10px] px-2 py-1 rounded font-semibold disabled:opacity-50 transition cursor-pointer"
                    >
                      {configSaving ? 'Saving...' : 'Save & connect'}
                    </button>
                    {stravaConfigured && (
                      <button
                        type="button"
                        onClick={() => { setShowStravaConfig(false); login(); }}
                        className="bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#374151] text-[10px] px-2 py-1 rounded font-semibold transition cursor-pointer"
                      >
                        Connect
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setShowStravaConfig(false); setConfigError(null); }}
                      className="text-[10px] text-[#6B7280] hover:text-[#111827] px-1 py-1 cursor-pointer"
                    >
                      Cancel
                    </button>
                    {configError && (
                      <span className="text-[10px] text-rose-600 w-full">{configError}</span>
                    )}
                  </form>
                </div>
              );
            }
            return (
              <button
                key="login"
                onClick={() => setShowStravaConfig(true)}
                className="inline-flex items-center gap-1.5 bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs px-3 py-1.5 rounded font-semibold transition cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.01 13.828h4.172" />
                </svg>
                Connect with Strava
              </button>
            );
          })()}
          <a
            href="https://www.openstreetmap.org"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-[#6B7230] hover:text-[#111827] font-semibold flex items-center gap-1"
          >
            <Info size={11} />
            Maps: &copy; OSM
          </a>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 md:px-6 pt-6 flex-grow flex flex-col gap-6">
        <Outlet />
      </main>

      <BuildInfo />

      {showStravaHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowStravaHelp(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
              <h3 className="text-sm font-semibold text-[#111827]">How to get Strava API credentials</h3>
              <button
                onClick={() => setShowStravaHelp(false)}
                className="text-[#9CA3AF] hover:text-[#111827] transition cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Go to <a href="https://strava.com" target="_blank" rel="noopener noreferrer" className="text-[#FC4C02] hover:underline">strava.com</a>, log in, navigate to <strong>Settings</strong> and <strong>My API Application</strong>. Configure the API application as shown below.
              </p>
              <img src="/how-to-strava-api.png" alt="How to get Strava API credentials" className="w-full rounded" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
