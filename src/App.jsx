```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import {
  ShieldCheck,
  Users,
  Activity,
  Clock,
  LogOut,
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Wallet,
  Gift,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Menu,
  X,
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [referralCount, setReferralCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // home | login | register | pending | dashboard | admin
  const [settings, setSettings] = useState({});
  const [plans, setPlans] = useState([]);
  const [globalError, setGlobalError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchSettingsAndPlans = useCallback(async () => {
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('website_settings')
        .select('key, value');

      if (!settingsError && Array.isArray(settingsData)) {
        const map = {};
        settingsData.forEach((row) => {
          if (row && row.key !== undefined) {
            map[row.key] = row.value;
          }
        });
        setSettings(map);
      }

      const { data: plansData, error: plansError } = await supabase
        .from('membership_plans')
        .select('id, name, registration_fee, daily_reward, duration_days, is_active')
        .eq('is_active', true);

      if (!plansError && Array.isArray(plansData) && plansData.length > 0) {
        setPlans(plansData);
      } else {
        setPlans([
          {
            id: 'standard',
            name: 'Standard',
            registration_fee: 1,
            daily_reward: 1,
            duration_days: 30,
            is_active: true,
          },
          {
            id: 'premium',
            name: 'Premium',
            registration_fee: 5,
            daily_reward: 7,
            duration_days: 15,
            is_active: true,
          },
        ]);
      }
    } catch (err) {
      setGlobalError(err?.message || 'Failed to load platform configuration.');
    }
  }, []);

  const fetchUserData = useCallback(async (userId, targetViewOverride = null) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setGlobalError('');
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('Profiles')
        .select(
          'id, created_at, Username, Full_name, Membership_plan, Membership_status, Referral_code, Referred_by, reward_balance'
        )
        .eq('id', userId)
        .single();

      if (profileError) {
        throw new Error(profileError.message || 'Unable to load member profile.');
      }

      setProfile(profileData);

      const { data: roleData } = await supabase
        .from('admin_roles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      const adminFlag = Boolean(roleData);
      setIsAdmin(adminFlag);

      const { count } = await supabase
        .from('Profiles')
        .select('id', { count: 'exact', head: true })
        .eq('Referred_by', userId);

      setReferralCount(typeof count === 'number' ? count : 0);

      if (targetViewOverride) {
        setCurrentView(targetViewOverride);
      } else {
        const status = String(profileData?.Membership_status || 'pending').toLowerCase();
        if (status === 'active') {
          setCurrentView((prev) =>
            prev === 'home' || prev === 'login' || prev === 'register' || prev === 'pending'
              ? 'dashboard'
              : prev
          );
        } else {
          setCurrentView(adminFlag ? 'admin' : 'pending');
        }
      }
    } catch (err) {
      setGlobalError(err?.message || 'Failed to load user account data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode && refCode.trim()) {
      try {
        localStorage.setItem('mumbais_pay_ref', refCode.trim());
      } catch (_) {
        // Ignore storage restrictions on mobile/private browsing
      }
    }

    fetchSettingsAndPlans();

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setAuthReady(true);
      if (currentSession?.user?.id) {
        fetchUserData(currentSession.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
      if (nextSession?.user?.id) {
        fetchUserData(nextSession.user.id);
      } else {
        setProfile(null);
        setReferralCount(0);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchSettingsAndPlans, fetchUserData]);

  async function handleSignOut() {
    setMobileMenuOpen(false);
    setGlobalError('');
    const { error } = await supabase.auth.signOut();
    if (error) {
      setGlobalError(error.message);
      return;
    }
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setCurrentView('home');
  }

  function navigateTo(view) {
    setMobileMenuOpen(false);
    setCurrentView(view);
  }

  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium text-sm">Loading MUMBAI’S PAY...</p>
      </div>
    );
  }

  const isMemberActive = profile && String(profile.Membership_status || '').toLowerCase() === 'active';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden">
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 sm:h-20 py-2 flex items-center justify-between gap-2">
          <button
            type="button"
            className="flex items-center space-x-2.5 text-left min-w-0"
            onClick={() => navigateTo('home')}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-base sm:text-xl font-black tracking-wider text-white truncate">
              MUMBAI’S <span className="text-emerald-400">PAY</span>
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2.5 flex-shrink-0">
            {session ? (
              <>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => navigateTo('admin')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition whitespace-nowrap ${
                      currentView === 'admin'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Admin Panel
                  </button>
                )}
                {isMemberActive && (
                  <button
                    type="button"
                    onClick={() => navigateTo('dashboard')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition whitespace-nowrap ${
                      currentView === 'dashboard'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Dashboard
                  </button>
                )}
                {!isMemberActive && (
                  <button
                    type="button"
                    onClick={() => navigateTo('pending')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition whitespace-nowrap ${
                      currentView === 'pending'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Status
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-red-600/20 hover:border-red-500/30 transition border border-transparent"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigateTo('login')}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition whitespace-nowrap"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('register')}
                  className="px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl transition shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center space-x-1.5 flex-shrink-0">
            {session && (
              <button
                type="button"
                onClick={handleSignOut}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900 px-3 py-3 space-y-2">
            {session ? (
              <>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => navigateTo('admin')}
                    className={`w-full text-left px-4 py-2.5 rounded-xl font-medium text-sm ${
                      currentView === 'admin'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    Admin Panel
                  </button>
                )}
                {isMemberActive && (
                  <button
                    type="button"
                    onClick={() => navigateTo('dashboard')}
                    className={`w-full text-left px-4 py-2.5 rounded-xl font-medium text-sm ${
                      currentView === 'dashboard'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    Member Dashboard
                  </button>
                )}
                {!isMemberActive && (
                  <button
                    type="button"
                    onClick={() => navigateTo('pending')}
                    className={`w-full text-left px-4 py-2.5 rounded-xl font-medium text-sm ${
                      currentView === 'pending'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    Pending Approval Status
                  </button>
                )}
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => navigateTo('login')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-medium text-sm text-center"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('register')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm text-center"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {globalError && (
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4">
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
            <span className="break-words">{globalError}</span>
          </div>
        </div>
      )}

      <main className="flex-grow">
        {currentView === 'home' && (
          <HomeView plans={plans} onGetStarted={() => navigateTo('register')} />
        )}

        {currentView === 'login' && (
          <LoginView
            onSwitch={() => navigateTo('register')}
            onLogged={async (userId) => {
              const targetId = userId || session?.user?.id;
              if (targetId) {
                await fetchUserData(targetId);
              }
            }}
          />
        )}

        {currentView === 'register' && (
          <RegisterView
            settings={settings}
            plans={plans}
            onSwitch={() => navigateTo('login')}
            onRegistered={async (userId) => {
              await fetchSettingsAndPlans();
              await fetchUserData(userId, 'pending');
            }}
          />
        )}

        {currentView === 'pending' && (
          <PendingView
            profile={profile}
            session={session}
            onRefresh={async () => {
              const id = session?.user?.id || profile?.id;
              if (id) {
                await fetchUserData(id);
              }
            }}
          />
        )}

        {currentView === 'dashboard' && profile && (
          <DashboardView
            profile={profile}
            referralCount={referralCount}
            settings={settings}
            plans={plans}
            onUpdate={async () => {
              const id = session?.user?.id || profile?.id;
              if (id) {
                await fetchUserData(id, 'dashboard');
              }
            }}
          />
        )}

        {currentView === 'admin' && isAdmin && (
          <AdminView
            settings={settings}
            plans={plans}
            adminUserId={session?.user?.id || profile?.id}
            onSettingsUpdated={async () => {
              await fetchSettingsAndPlans();
            }}
          />
        )}
      </main>

      <footer className="border-t border-slate-800 bg-slate-900 py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-500 px-4">
        <div className="max-w-7xl mx-auto">
          <p>
            &copy; {new Date().getFullYear()} MUMBAI’S PAY. All rights reserved. Secure Member
            Rewards & Activity Platform.
          </p>
        </div>
      </footer>
    </div>
  );
}

function HomeView({ plans, onGetStarted }) {
  const standardPlan =
    plans.find((p) => String(p.name || '').toLowerCase() === 'standard') || {
      registration_fee: 1,
      daily_reward: 1,
      duration_days: 30,
    };
  const premiumPlan =
    plans.find((p) => String(p.name || '').toLowerCase() === 'premium') || {
      registration_fee: 5,
      daily_reward: 7,
      duration_days: 15,
    };

  return (
    <div className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24 text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <span>USDT TRC20 & BEP20 Verified Membership</span>
        </div>
        <h1 className="text-3xl sm:text-6xl font-black tracking-tight text-white mb-5 max-w-4xl mx-auto leading-tight">
          Welcome to{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
            MUMBAI’S PAY
          </span>
        </h1>
        <p className="text-sm sm:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
          Choose Standard (${Number(standardPlan.registration_fee)} USDT, $
          {Number(standardPlan.daily_reward)}/day for {Number(standardPlan.duration_days)} days) or
          Premium (${Number(premiumPlan.registration_fee)} USDT, $
          {Number(premiumPlan.daily_reward)}/day for {Number(premiumPlan.duration_days)} days),
          complete activities, and earn referral rewards ($0.50).
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onGetStarted}
            className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-xl shadow-emerald-500/20 flex items-center justify-center space-x-2 text-base"
          >
            <span>Join MUMBAI’S PAY Now</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-slate-900/50 border-t border-slate-800 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
            <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mb-5 text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                Standard & Premium Plans
              </h3>
              <p className="text-slate-400 text-sm">
                Standard: ${Number(standardPlan.registration_fee)} USDT for $
                {Number(standardPlan.daily_reward)} daily reward ({Number(standardPlan.duration_days)}{' '}
                days). Premium: ${Number(premiumPlan.registration_fee)} USDT for $
                {Number(premiumPlan.daily_reward)} daily reward ({Number(premiumPlan.duration_days)}{' '}
                days).
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mb-5 text-emerald-400">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                Activity Proof Submissions
              </h3>
              <p className="text-slate-400 text-sm">
                Complete available platform activities and submit your proof URL for administrator
                review.
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mb-5 text-emerald-400">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                Referral & Payout System
              </h3>
              <p className="text-slate-400 text-sm">
                Share your referral code for $0.50 referral rewards and withdraw balances starting
                from $10 minimum.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginView({ onSwitch, onLogged }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResetMessage('');

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    await onLogged(data?.user?.id);
  }

  async function handlePasswordReset() {
    setError('');
    setResetMessage('');
    if (!email.trim()) {
      setError('Enter your email address first to send a password reset link.');
      return;
    }
    setLoading(true);
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (resetErr) {
      setError(resetErr.message);
    } else {
      setResetMessage('Password reset email sent. Please check your inbox.');
    }
  }

  return (
    <div className="max-w-md mx-auto px-3 sm:px-4 py-10 sm:py-16">
      <div className="bg-slate-900 border border-slate-800 p-5 sm:p-8 rounded-2xl shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-1">Welcome Back</h2>
        <p className="text-slate-400 text-sm mb-6">Log in to your MUMBAI’S PAY account</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {resetMessage && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
            {resetMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-emerald-500 transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={loading}
                className="text-xs text-emerald-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-emerald-500 transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 text-sm sm:text-base"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Don’t have an account?{' '}
          <button
            type="button"
            onClick={onSwitch}
            className="text-emerald-400 hover:underline font-medium"
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}

function RegisterView({ settings, plans, onSwitch, onRegistered }) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlanKey, setSelectedPlanKey] = useState('standard');
  const [network, setNetwork] = useState('TRC20');
  const [txHash, setTxHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const standardPlan =
    plans.find((p) => String(p.name || '').toLowerCase() === 'standard') || {
      id: null,
      name: 'Standard',
      registration_fee: 1,
      daily_reward: 1,
      duration_days: 30,
    };

  const premiumPlan =
    plans.find((p) => String(p.name || '').toLowerCase() === 'premium') || {
      id: null,
      name: 'Premium',
      registration_fee: 5,
      daily_reward: 7,
      duration_days: 15,
    };

  const activePlan = selectedPlanKey === 'premium' ? premiumPlan : standardPlan;
  const planFee =
    selectedPlanKey === 'premium'
      ? Number(settings.premium_membership_fee ?? activePlan.registration_fee ?? 5)
      : Number(settings.standard_membership_fee ?? activePlan.registration_fee ?? 1);

  const trcWallet =
    settings.usdt_trc20_address ||
    settings.trc20_wallet_address ||
    settings.usdt_trc20 ||
    'Not configured in website_settings';

  const bepWallet =
    settings.usdt_bep20_address ||
    settings.bep20_wallet_address ||
    settings.usdt_bep20 ||
    'Not configured in website_settings';

  const walletAddress = network === 'TRC20' ? trcWallet : bepWallet;

  async function handleCopyWallet() {
    if (!walletAddress || walletAddress.startsWith('Not configured')) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      setError('Unable to copy wallet address automatically. Please copy it manually.');
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanTxHash = txHash.trim();
    if (!cleanTxHash) {
      setError('Please enter your USDT payment transaction hash.');
      setLoading(false);
      return;
    }

    let storedRef = null;
    try {
      storedRef = localStorage.getItem('mumbais_pay_ref') || null;
    } catch (_) {
      storedRef = null;
    }

    const normalizedPlanName = selectedPlanKey === 'premium' ? 'Premium' : 'Standard';
    const cleanUsername =
      username.trim() ||
      email
        .trim()
        .split('@')[0]
        .replace(/[^a-zA-Z0-9_]/g, '')
        .slice(0, 20);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          username: cleanUsername,
          membership_plan: normalizedPlanName,
          referral_code: storedRef,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const createdUser = authData?.user;
    if (!createdUser?.id) {
      setError('Account created. Please verify your email or log in to continue.');
      setLoading(false);
      return;
    }

    const profileUpdatePayload = {
      Full_name: fullName.trim(),
      Username: cleanUsername,
      Membership_plan: normalizedPlanName,
    };

    if (storedRef) {
      const { data: referrerProfile } = await supabase
        .from('Profiles')
        .select('id')
        .eq('Referral_code', storedRef.trim())
        .maybeSingle();

      if (referrerProfile?.id && referrerProfile.id !== createdUser.id) {
        profileUpdatePayload.Referred_by = referrerProfile.id;
      }
    }

    const { error: profileUpdateError } = await supabase
      .from('Profiles')
      .update(profileUpdatePayload)
      .eq('id', createdUser.id);

    if (profileUpdateError) {
      setError(profileUpdateError.message);
      setLoading(false);
      return;
    }

    const paymentInsertPayload = {
      user_id: createdUser.id,
      network,
      amount: planFee,
      tx_hash: cleanTxHash,
      status: 'pending',
    };

    if (activePlan?.id && typeof activePlan.id === 'string' && activePlan.id.length > 10) {
      paymentInsertPayload.plan_id = activePlan.id;
    }

    const { error: paymentError } = await supabase
      .from('membership_payments')
      .insert([paymentInsertPayload]);

    if (paymentError) {
      if (paymentError.code === '23505') {
        setError('This transaction hash has already been submitted.');
      } else {
        setError(paymentError.message);
      }
      setLoading(false);
      return;
    }

    try {
      localStorage.removeItem('mumbais_pay_ref');
    } catch (_) {
      // Ignore storage restrictions
    }

    setLoading(false);
    await onRegistered(createdUser.id);
  }

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-4 py-8 sm:py-14">
      <div className="bg-slate-900 border border-slate-800 p-5 sm:p-8 rounded-2xl shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-1">Create Account</h2>
        <p className="text-slate-400 text-sm mb-6">
          Select a membership plan and submit your USDT payment hash
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-emerald-500"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-emerald-500"
                placeholder="janedoe"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-emerald-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-emerald-500"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Membership Plan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  key: 'standard',
                  plan: standardPlan,
                  fee: Number(settings.standard_membership_fee ?? standardPlan.registration_fee ?? 1),
                },
                {
                  key: 'premium',
                  plan: premiumPlan,
                  fee: Number(settings.premium_membership_fee ?? premiumPlan.registration_fee ?? 5),
                },
              ].map(({ key, plan, fee }) => {
                const selected = selectedPlanKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedPlanKey(key)}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      selected
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-sm">
                      <span className="capitalize">{key}</span>
                      <span className="text-emerald-400">${fee} USDT</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      ${Number(plan.daily_reward)}/day for {Number(plan.duration_days)} days
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Payment Network
              </span>
              <div className="flex space-x-2">
                {['TRC20', 'BEP20'].map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => setNetwork(net)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      network === net
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {net}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Send{' '}
              <span className="text-white font-semibold">
                ${planFee} USDT ({network})
              </span>{' '}
              to:
            </p>

            <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5">
              <span className="text-xs font-mono text-slate-200 break-all">{walletAddress}</span>
              <button
                type="button"
                onClick={handleCopyWallet}
                className="p-2 rounded-md bg-slate-800 text-slate-300 hover:text-white flex-shrink-0"
                title="Copy address"
                aria-label="Copy address"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Transaction Hash (TxID)
            </label>
            <input
              type="text"
              required
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base font-mono text-white focus:outline-none focus:border-emerald-500"
              placeholder="Paste payment transaction hash"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 text-sm sm:text-base"
          >
            {loading ? 'Submitting Registration...' : `Complete Registration ($${planFee} USDT)`}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitch}
            className="text-emerald-400 hover:underline font-medium"
          >
            Log In
          </button>
        </p>
      </div>
    </div>
  );
}

function PendingView({ profile, session, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }

  return (
    <div className="max-w-lg mx-auto px-3 sm:px-4 py-12 sm:py-16 text-center">
      <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Membership Pending Approval
        </h2>
        <p className="text-slate-400 text-sm mb-6 break-words">
          Your account{' '}
          <span className="text-slate-200">
            ({session?.user?.email || profile?.Username || 'Member'})
          </span>{' '}
          is awaiting payment verification and activation by an administrator.
        </p>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left text-xs space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-slate-400">Plan:</span>
            <span className="text-white font-semibold">
              {profile?.Membership_plan || 'Standard'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Status:</span>
            <span className="text-amber-400 font-semibold uppercase">
              {profile?.Membership_status || 'pending'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Checking Status...' : 'Refresh Status'}</span>
        </button>
      </div>
    </div>
  );
}

function DashboardView({ profile, referralCount, settings, plans, onUpdate }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview | activities | withdrawals | ledger
  const [copiedRef, setCopiedRef] = useState(false);

  // Daily cycle & claims
  const [cycles, setCycles] = useState([]);
  const [claims, setClaims] = useState([]);
  const [claimingCycleId, setClaimingCycleId] = useState(null);

  // Activities & completions
  const [activities, setActivities] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [proofUrls, setProofUrls] = useState({});
  const [submittingActivityId, setSubmittingActivityId] = useState(null);

  // Withdrawals & ledger & referral rewards
  const [withdrawals, setWithdrawals] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [referralRewards, setReferralRewards] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawWallet, setWithdrawWallet] = useState('');
  const [withdrawNetwork, setWithdrawNetwork] = useState('TRC20');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [loadingData, setLoadingData] = useState(true);

  const minWithdrawal = Number(settings.minimum_withdrawal ?? settings.min_withdrawal ?? 10);

  const loadDashboardDetails = useCallback(async () => {
    if (!profile?.id) return;
    setLoadingData(true);
    try {
      const [
        cyclesRes,
        claimsRes,
        activitiesRes,
        completionsRes,
        withdrawalsRes,
        ledgerRes,
        refRewardsRes,
      ] = await Promise.all([
        supabase
          .from('daily_reward_cycles')
          .select('id, user_id, plan_id, started_at, ends_at, last_reward_date, status')
          .eq('user_id', profile.id)
          .order('started_at', { ascending: false }),
        supabase
          .from('daily_reward_claims')
          .select('id, cycle_id, user_id, reward_date, amount, created_at')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('activities')
          .select('id, created_at, Title, description, reward_amount, is_actice')
          .eq('is_actice', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('activity_completions')
          .select('id, created_at, user_id, activity_id, status, proof_url, reviewed_at, reviewed_by')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('withdrawal_requests')
          .select('id, user_id, amount, wallet_address, network, status, created_at')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('reward_ledger')
          .select('id, user_id, amount, description, created_at')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('referral_rewards')
          .select('id, referrer_user_id, referred_user_id, amount, created_at')
          .eq('referrer_user_id', profile.id)
          .order('created_at', { ascending: false }),
      ]);

      setCycles(Array.isArray(cyclesRes.data) ? cyclesRes.data : []);
      setClaims(Array.isArray(claimsRes.data) ? claimsRes.data : []);
      setActivities(Array.isArray(activitiesRes.data) ? activitiesRes.data : []);
      setCompletions(Array.isArray(completionsRes.data) ? completionsRes.data : []);
      setWithdrawals(Array.isArray(withdrawalsRes.data) ? withdrawalsRes.data : []);
      setLedger(Array.isArray(ledgerRes.data) ? ledgerRes.data : []);
      setReferralRewards(Array.isArray(refRewardsRes.data) ? refRewardsRes.data : []);
    } catch (err) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to load dashboard data.' });
    } finally {
      setLoadingData(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadDashboardDetails();
  }, [loadDashboardDetails]);

  const referralLink = profile?.Referral_code
    ? `${window.location.origin}?ref=${encodeURIComponent(profile.Referral_code)}`
    : '';

  async function handleCopyRef() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch (_) {
      setFeedback({ type: 'error', text: 'Unable to copy referral link automatically.' });
    }
  }

  function getPlanForCycle(cycle) {
    const matched = plans.find((p) => String(p.id) === String(cycle.plan_id));
    if (matched) return matched;
    const isPremium = String(profile?.Membership_plan || '').toLowerCase() === 'premium';
    return (
      plans.find(
        (p) => String(p.name || '').toLowerCase() === (isPremium ? 'premium' : 'standard')
      ) || {
        name: isPremium ? 'Premium' : 'Standard',
        daily_reward: isPremium ? 7 : 1,
        duration_days: isPremium ? 15 : 30,
      }
    );
  }

  async function handleClaimDailyReward(cycle) {
    if (!cycle?.id || !profile?.id) return;
    setClaimingCycleId(cycle.id);
    setFeedback({ type: '', text: '' });

    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      if (cycle.last_reward_date === todayStr) {
        throw new Error('Daily reward for today has already been claimed on this cycle.');
      }

      const plan = getPlanForCycle(cycle);
      const rewardAmt = Number(plan.daily_reward ?? 1);

      const { error: claimError } = await supabase.from('daily_reward_claims').insert([
        {
          cycle_id: cycle.id,
          user_id: profile.id,
          reward_date: todayStr,
          amount: rewardAmt,
        },
      ]);

      if (claimError) {
        if (claimError.code === '23505') {
          throw new Error('You have already claimed today’s reward.');
        }
        throw new Error(claimError.message);
      }

      const { error: cycleError } = await supabase
        .from('daily_reward_cycles')
        .update({ last_reward_date: todayStr })
        .eq('id', cycle.id)
        .eq('user_id', profile.id);

      if (cycleError) {
        throw new Error(cycleError.message);
      }

      const nextBalance = Number(profile.reward_balance ?? 0) + rewardAmt;
      const { error: balError } = await supabase
        .from('Profiles')
        .update({ reward_balance: nextBalance })
        .eq('id', profile.id);

      if (balError) {
        throw new Error(balError.message);
      }

      await supabase.from('reward_ledger').insert([
        {
          user_id: profile.id,
          amount: rewardAmt,
          description: `Daily reward claimed (${plan.name || profile.Membership_plan || 'Plan'})`,
        },
      ]);

      setFeedback({ type: 'success', text: `Claimed $${rewardAmt.toFixed(2)} daily reward!` });
      await Promise.all([loadDashboardDetails(), onUpdate()]);
    } catch (err) {
      setFeedback({ type: 'error', text: err?.message || 'Unable to claim daily reward.' });
    } finally {
      setClaimingCycleId(null);
    }
  }

  async function handleSubmitProof(e, activity) {
    e.preventDefault();
    if (!activity?.id || !profile?.id) return;
    const url = String(proofUrls[activity.id] || '').trim();
    if (!url) {
      setFeedback({ type: 'error', text: 'Please provide a valid proof URL before submitting.' });
      return;
    }

    setSubmittingActivityId(activity.id);
    setFeedback({ type: '', text: '' });

    try {
      const { error: insertErr } = await supabase.from('activity_completions').insert([
        {
          user_id: profile.id,
          activity_id: activity.id,
          proof_url: url,
          status: 'pending',
        },
      ]);

      if (insertErr) {
        throw new Error(insertErr.message);
      }

      setProofUrls((prev) => ({ ...prev, [activity.id]: '' }));
      setFeedback({
        type: 'success',
        text: `Proof submitted for "${activity.Title}". Awaiting admin review.`,
      });
      await loadDashboardDetails();
    } catch (err) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to submit proof.' });
    } finally {
      setSubmittingActivityId(null);
    }
  }

  async function handleRequestWithdrawal(e) {
    e.preventDefault();
    setFeedback({ type: '', text: '' });

    const numericAmount = Number(withdrawAmount);
    const cleanWallet = withdrawWallet.trim();

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFeedback({ type: 'error', text: 'Enter a valid withdrawal amount.' });
      return;
    }
    if (numericAmount < minWithdrawal) {
      setFeedback({
        type: 'error',
        text: `Minimum withdrawal amount is $${minWithdrawal.toFixed(2)} USDT.`,
      });
      return;
    }
    if (numericAmount > Number(profile.reward_balance ?? 0)) {
      setFeedback({ type: 'error', text: 'Withdrawal amount exceeds your available reward balance.' });
      return;
    }
    if (!cleanWallet) {
      setFeedback({ type: 'error', text: 'Enter your destination USDT wallet address.' });
      return;
    }

    setSubmittingWithdraw(true);
    try {
      const { error: rpcError } = await supabase.rpc('member_request_withdrawal', {
        p_amount: numericAmount,
        p_wallet_address: cleanWallet,
        p_network: withdrawNetwork,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setWithdrawAmount('');
      setWithdrawWallet('');
      setFeedback({
        type: 'success',
        text: `Withdrawal request for $${numericAmount.toFixed(2)} USDT (${withdrawNetwork}) submitted.`,
      });
      await Promise.all([loadDashboardDetails(), onUpdate()]);
    } catch (err) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to submit withdrawal request.' });
    } finally {
      setSubmittingWithdraw(false);
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-bold text-white truncate">
            Welcome, {profile.Full_name || profile.Username || 'Member'}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Plan:{' '}
            <span className="text-emerald-400 font-semibold">
              {profile.Membership_plan || 'Standard'}
            </span>{' '}
            · Referral Code:{' '}
            <span className="font-mono text-slate-200">{profile.Referral_code || 'N/A'}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await Promise.all([onUpdate(), loadDashboardDetails()]);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm text-slate-200 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
          <span>Sync Account</span>
        </button>
      </div>

      {feedback.text && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-start space-x-2 ${
            feedback.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
          )}
          <span className="break-words">{feedback.text}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase tracking-wider">Reward Balance</span>
            <Gift className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">
            ${Number(profile.reward_balance ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase tracking-wider">Referrals</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-white">{referralCount}</p>
          <p className="text-xs text-slate-500 mt-1">
            Referral bonuses earned: {referralRewards.length}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase tracking-wider">Membership Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 capitalize">
            {profile.Membership_status || 'active'}
          </p>
        </div>
      </div>

      {/* Section Navigation Tabs (Mobile-Friendly Horizontal Scroll) */}
      <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar">
        {[
          { id: 'overview', label: 'Daily Rewards & Referral' },
          { id: 'activities', label: `Activities (${activities.length})` },
          { id: 'withdrawals', label: `Withdrawals (${withdrawals.length})` },
          { id: 'ledger', label: `Ledger (${ledger.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {referralLink && (
            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl">
              <h2 className="text-sm font-semibold text-white mb-2">Your Referral Link</h2>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
                <span className="text-xs sm:text-sm font-mono text-slate-300 break-all">
                  {referralLink}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="inline-flex items-center justify-center space-x-1 px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold flex-shrink-0"
                >
                  {copiedRef ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedRef ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Daily Reward Cycles */}
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-white">Daily Reward Cycles</h2>
            {cycles.length === 0 ? (
              <p className="text-sm text-slate-400">
                No active daily reward cycles found yet. Once your membership cycle is started,
                daily claims will appear here.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cycles.map((cycle) => {
                  const plan = getPlanForCycle(cycle);
                  const claimedToday = cycle.last_reward_date === todayIso;
                  const isActiveCycle = String(cycle.status || 'active').toLowerCase() === 'active';
                  return (
                    <div
                      key={cycle.id}
                      className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white text-sm">
                            {plan.name || profile.Membership_plan || 'Membership'} Cycle
                          </span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                              isActiveCycle
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {cycle.status || 'active'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Daily Reward:{' '}
                          <span className="text-emerald-400 font-semibold">
                            ${Number(plan.daily_reward ?? 1).toFixed(2)}
                          </span>{' '}
                          · Duration: {Number(plan.duration_days ?? 30)} days
                        </p>
                        <p className="text-xs text-slate-500">
                          Last Claim: {cycle.last_reward_date || 'Never'}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={!isActiveCycle || claimedToday || claimingCycleId === cycle.id}
                        onClick={() => handleClaimDailyReward(cycle)}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs sm:text-sm transition"
                      >
                        {claimingCycleId === cycle.id
                          ? 'Claiming...'
                          : claimedToday
                          ? 'Claimed Today'
                          : `Claim $${Number(plan.daily_reward ?? 1).toFixed(2)} Daily Reward`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {claims.length > 0 && (
              <div className="pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Recent Daily Claims ({claims.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {claims.slice(0, 8).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between text-xs bg-slate-950 border border-slate-800/80 rounded-lg px-3 py-2"
                    >
                      <span className="text-slate-300">Date: {c.reward_date}</span>
                      <span className="text-emerald-400 font-bold">
                        +${Number(c.amount ?? 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'activities' && (
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-sm text-slate-400">
              No active activities available right now.
            </div>
          ) : (
            activities.map((act) => {
              const userSubmission = completions.find((c) => c.activity_id === act.id);
              return (
                <div
                  key={act.id}
                  className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white">{act.Title}</h3>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1">{act.description}</p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold self-start flex-shrink-0">
                      +${Number(act.reward_amount ?? 0).toFixed(2)}
                    </span>
                  </div>

                  {userSubmission ? (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="text-slate-400">Submitted Proof: </span>
                        <a
                          href={userSubmission.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:underline break-all inline-flex items-center space-x-1"
                        >
                          <span>{userSubmission.proof_url}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold uppercase self-start sm:self-auto ${
                          userSubmission.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : userSubmission.status === 'rejected'
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {userSubmission.status || 'pending'}
                      </span>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => handleSubmitProof(e, act)}
                      className="flex flex-col sm:flex-row gap-2.5"
                    >
                      <input
                        type="url"
                        required
                        value={proofUrls[act.id] || ''}
                        onChange={(e) =>
                          setProofUrls((prev) => ({ ...prev, [act.id]: e.target.value }))
                        }
                        placeholder="https://example.com/your-proof-link"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={submittingActivityId === act.id}
                        className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition disabled:opacity-50 flex-shrink-0"
                      >
                        {submittingActivityId === act.id ? 'Submitting...' : 'Submit Proof'}
                      </button>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl">
            <div className="flex items-center space-x-2 mb-4">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">Request Withdrawal</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mb-4">
              Minimum withdrawal:{' '}
              <span className="text-white font-semibold">${minWithdrawal.toFixed(2)} USDT</span> ·
              Available balance:{' '}
              <span className="text-emerald-400 font-semibold">
                ${Number(profile.reward_balance ?? 0).toFixed(2)}
              </span>
            </p>

            <form onSubmit={handleRequestWithdrawal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Amount (USDT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={minWithdrawal}
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder={minWithdrawal.toFixed(2)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Network
                  </label>
                  <select
                    value={withdrawNetwork}
                    onChange={(e) => setWithdrawNetwork(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="TRC20">TRC20</option>
                    <option value="BEP20">BEP20</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Wallet Address
                  </label>
                  <input
                    type="text"
                    required
                    value={withdrawWallet}
                    onChange={(e) => setWithdrawWallet(e.target.value)}
                    placeholder="Enter USDT address"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingWithdraw}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition disabled:opacity-50"
              >
                {submittingWithdraw ? 'Submitting Request...' : 'Submit Withdrawal Request'}
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-3">
            <h3 className="text-base font-bold text-white">Withdrawal History</h3>
            {withdrawals.length === 0 ? (
              <p className="text-sm text-slate-400">No withdrawal requests yet.</p>
            ) : (
              <div className="space-y-2.5">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-bold text-white">
                        ${Number(w.amount ?? 0).toFixed(2)} USDT{' '}
                        <span className="text-slate-400 font-normal">({w.network})</span>
                      </p>
                      <p className="font-mono text-xs text-slate-400 break-all">
                        {w.wallet_address}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase self-start sm:self-auto ${
                        w.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : w.status === 'rejected'
                          ? 'bg-red-500/15 text-red-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {w.status || 'pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white">Reward Ledger</h2>
          {ledger.length === 0 ? (
            <p className="text-sm text-slate-400">No ledger entries recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {ledger.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm"
                >
                  <div className="min-w-0">
                    <p className="text-white font-medium break-words">
                      {item.description || 'Reward entry'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                  <span
                    className={`font-bold flex-shrink-0 ${
                      Number(item.amount) >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {Number(item.amount) >= 0 ? '+' : ''}${Number(item.amount ?? 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminView({ settings, plans, adminUserId, onSettingsUpdated }) {
  const [adminTab, setAdminTab] = useState('payments'); // payments | withdrawals | activities | completions | settings
  const [payments, setPayments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [activities, setActivities] = useState([]);
  const [completions, setCompletions] = useState([]);

  // New activity form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newReward, setNewReward] = useState('0.50');

  // Website settings editor
  const [trcAddress, setTrcAddress] = useState('');
  const [bepAddress, setBepAddress] = useState('');
  const [refBonus, setRefBonus] = useState('0.50');
  const [minWithdraw, setMinWithdraw] = useState('10');

  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTrcAddress(
      settings.usdt_trc20_address || settings.trc20_wallet_address || settings.usdt_trc20 || ''
    );
    setBepAddress(
      settings.usdt_bep20_address || settings.bep20_wallet_address || settings.usdt_bep20 || ''
    );
    setRefBonus(String(settings.referral_bonus ?? '0.50'));
    setMinWithdraw(String(settings.minimum_withdrawal ?? settings.min_withdrawal ?? '10'));
  }, [settings]);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, withRes, actRes, compRes] = await Promise.all([
        supabase
          .from('membership_payments')
          .select('id, user_id, plan_id, network, amount, tx_hash, status, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('withdrawal_requests')
          .select('id, user_id, amount, wallet_address, network, status, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('activities')
          .select('id, created_at, Title, description, reward_amount, is_actice')
          .order('created_at', { ascending: false }),
        supabase
          .from('activity_completions')
          .select('id, created_at, user_id, activity_id, status, proof_url, reviewed_at, reviewed_by')
          .order('created_at', { ascending: false }),
      ]);

      setPayments(Array.isArray(payRes.data) ? payRes.data : []);
      setWithdrawals(Array.isArray(withRes.data) ? withRes.data : []);
      setActivities(Array.isArray(actRes.data) ? actRes.data : []);
      setCompletions(Array.isArray(compRes.data) ? compRes.data : []);
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Failed to load admin records.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  async function handlePaymentDecision(paymentId, approve) {
    setBusyId(paymentId);
    setMessage({ type: '', text: '' });
    try {
      const rpcName = approve ? 'admin_approve_membership' : 'admin_reject_membership';
      const { error } = await supabase.rpc(rpcName, { p_payment_id: paymentId });
      if (error) throw new Error(error.message);

      setMessage({
        type: 'success',
        text: approve ? 'Membership payment approved.' : 'Membership payment rejected.',
      });
      await loadAdminData();
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Action failed.' });
    } finally {
      setBusyId('');
    }
  }

  async function handleWithdrawalDecision(withdrawalId, approve) {
    setBusyId(withdrawalId);
    setMessage({ type: '', text: '' });
    try {
      const rpcName = approve ? 'admin_approve_withdrawal' : 'admin_reject_withdrawal';
      const { error } = await supabase.rpc(rpcName, { p_withdrawal_id: withdrawalId });
      if (error) throw new Error(error.message);

      setMessage({
        type: 'success',
        text: approve ? 'Withdrawal request approved.' : 'Withdrawal request rejected.',
      });
      await loadAdminData();
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Action failed.' });
    } finally {
      setBusyId('');
    }
  }

  async function handleCreateActivity(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusyId('create-activity');
    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase.from('activities').insert([
        {
          Title: newTitle.trim(),
          description: newDesc.trim(),
          reward_amount: Number(newReward || 0),
          is_actice: true,
        },
      ]);
      if (error) throw new Error(error.message);
      setNewTitle('');
      setNewDesc('');
      setNewReward('0.50');
      setMessage({ type: 'success', text: 'Activity created.' });
      await loadAdminData();
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Failed to create activity.' });
    } finally {
      setBusyId('');
    }
  }

  async function handleToggleActivity(act) {
    setBusyId(act.id);
    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_actice: !act.is_actice })
        .eq('id', act.id);
      if (error) throw new Error(error.message);
      await loadAdminData();
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Failed to update activity.' });
    } finally {
      setBusyId('');
    }
  }

  async function handleCompletionDecision(comp, approve) {
    setBusyId(comp.id);
    setMessage({ type: '', text: '' });
    try {
      const nextStatus = approve ? 'approved' : 'rejected';
      const { error: compErr } = await supabase
        .from('activity_completions')
        .update({
          status: nextStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUserId || null,
        })
        .eq('id', comp.id);

      if (compErr) throw new Error(compErr.message);

      if (approve && comp.status !== 'approved') {
        const act = activities.find((a) => a.id === comp.activity_id);
        const rewardAmt = Number(act?.reward_amount ?? 0);
        if (rewardAmt > 0 && comp.user_id) {
          const { data: memberProf } = await supabase
            .from('Profiles')
            .select('reward_balance')
            .eq('id', comp.user_id)
            .single();

          const currentBal = Number(memberProf?.reward_balance ?? 0);
          await supabase
            .from('Profiles')
            .update({ reward_balance: currentBal + rewardAmt })
            .eq('id', comp.user_id);

          await supabase.from('reward_ledger').insert([
            {
              user_id: comp.user_id,
              amount: rewardAmt,
              description: `Activity reward approved: ${act?.Title || 'Activity'}`,
            },
          ]);
        }
      }

      setMessage({
        type: 'success',
        text: approve ? 'Activity proof approved.' : 'Activity proof rejected.',
      });
      await loadAdminData();
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Failed to review completion.' });
    } finally {
      setBusyId('');
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setBusyId('save-settings');
    setMessage({ type: '', text: '' });
    try {
      const pairs = [
        { key: 'usdt_trc20_address', value: trcAddress.trim() },
        { key: 'usdt_bep20_address', value: bepAddress.trim() },
        { key: 'referral_bonus', value: String(refBonus).trim() },
        { key: 'minimum_withdrawal', value: String(minWithdraw).trim() },
      ];

      const { error } = await supabase
        .from('website_settings')
        .upsert(pairs, { onConflict: 'key' });

      if (error) throw new Error(error.message);

      await onSettingsUpdated();
      setMessage({ type: 'success', text: 'Platform settings saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Failed to save settings.' });
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Manage membership payments, withdrawals, activities, and settings
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await Promise.all([loadAdminData(), onSettingsUpdated()]);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm text-white transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh All</span>
        </button>
      </div>

      {message.text && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-start space-x-2 ${
            message.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {message.type === 'error' ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
          )}
          <span className="break-words">{message.text}</span>
        </div>
      )}

      <div className="flex overflow-x-auto gap-2 pb-1">
        {[
          { id: 'payments', label: `Payments (${payments.length})` },
          { id: 'withdrawals', label: `Withdrawals (${withdrawals.length})` },
          { id: 'activities', label: `Activities (${activities.length})` },
          { id: 'completions', label: `Proofs (${completions.length})` },
          { id: 'settings', label: 'Settings & Plans' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setAdminTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
              adminTab === tab.id
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {adminTab === 'payments' && (
        <div className="space-y-3">
          {payments.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-sm text-slate-400">
              No membership payments found.
            </div>
          ) : (
            payments.map((pay) => {
              const isPending = String(pay.status || '').toLowerCase() === 'pending';
              return (
                <div
                  key={pay.id}
                  className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base">
                        ${Number(pay.amount ?? 0).toFixed(2)} USDT ({pay.network})
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          pay.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : pay.status === 'rejected'
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {pay.status || 'pending'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono break-all">Tx: {pay.tx_hash}</p>
                    <p className="text-xs text-slate-500 font-mono break-all">User: {pay.user_id}</p>
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        disabled={busyId === pay.id}
                        onClick={() => handlePaymentDecision(pay.id, true)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyId === pay.id}
                        onClick={() => handlePaymentDecision(pay.id, false)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1 px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold text-xs sm:text-sm transition disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {adminTab === 'withdrawals' && (
        <div className="space-y-3">
          {withdrawals.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-sm text-slate-400">
              No withdrawal requests found.
            </div>
          ) : (
            withdrawals.map((w) => {
              const isPending = String(w.status || '').toLowerCase() === 'pending';
              return (
                <div
                  key={w.id}
                  className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base">
                        ${Number(w.amount ?? 0).toFixed(2)} USDT ({w.network})
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          w.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : w.status === 'rejected'
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {w.status || 'pending'}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-300 break-all">{w.wallet_address}</p>
                    <p className="text-xs font-mono text-slate-500 break-all">User: {w.user_id}</p>
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        disabled={busyId === w.id}
                        onClick={() => handleWithdrawalDecision(w.id, true)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyId === w.id}
                        onClick={() => handleWithdrawalDecision(w.id, false)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1 px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold text-xs sm:text-sm transition disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {adminTab === 'activities' && (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateActivity}
            className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-4"
          >
            <h2 className="text-base sm:text-lg font-bold text-white">Create New Activity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Activity Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Share post on social media"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Reward Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newReward}
                  onChange={(e) => setNewReward(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                rows={2}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Instructions and proof requirements"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={busyId === 'create-activity'}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition disabled:opacity-50"
            >
              {busyId === 'create-activity' ? 'Saving...' : 'Add Activity'}
            </button>
          </form>

          <div className="space-y-3">
            {activities.map((act) => (
              <div
                key={act.id}
                className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-white text-sm sm:text-base">{act.Title}</h3>
                    <span className="text-xs font-bold text-emerald-400">
                      ${Number(act.reward_amount ?? 0).toFixed(2)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        act.is_actice
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {act.is_actice ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">{act.description}</p>
                </div>
                <button
                  type="button"
                  disabled={busyId === act.id}
                  onClick={() => handleToggleActivity(act)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition self-start sm:self-auto flex-shrink-0"
                >
                  {act.is_actice ? 'Disable' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {adminTab === 'completions' && (
        <div className="space-y-3">
          {completions.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-sm text-slate-400">
              No activity completion submissions found.
            </div>
          ) : (
            completions.map((comp) => {
              const act = activities.find((a) => a.id === comp.activity_id);
              const isPending = String(comp.status || '').toLowerCase() === 'pending';
              return (
                <div
                  key={comp.id}
                  className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm sm:text-base">
                        {act?.Title || 'Activity'}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          comp.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : comp.status === 'rejected'
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {comp.status || 'pending'}
                      </span>
                    </div>
                    <a
                      href={comp.proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-sky-400 hover:underline break-all block"
                    >
                      {comp.proof_url}
                    </a>
                    <p className="text-xs font-mono text-slate-500 break-all">User: {comp.user_id}</p>
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        disabled={busyId === comp.id}
                        onClick={() => handleCompletionDecision(comp, true)}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === comp.id}
                        onClick={() => handleCompletionDecision(comp, false)}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold text-xs sm:text-sm transition disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {adminTab === 'settings' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveSettings}
            className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-4"
          >
            <h2 className="text-base sm:text-lg font-bold text-white">
              Website Settings (USDT Wallets & Limits)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  USDT TRC20 Wallet Address
                </label>
                <input
                  type="text"
                  value={trcAddress}
                  onChange={(e) => setTrcAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  USDT BEP20 Wallet Address
                </label>
                <input
                  type="text"
                  value={bepAddress}
                  onChange={(e) => setBepAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Referral Bonus ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={refBonus}
                  onChange={(e) => setRefBonus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Minimum Withdrawal ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={minWithdraw}
                  onChange={(e) => setMinWithdraw(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busyId === 'save-settings'}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition disabled:opacity-50"
            >
              {busyId === 'save-settings' ? 'Saving...' : 'Save Settings'}
            </button>
          </form>

          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-3">
            <h2 className="text-base font-bold text-white">Active Membership Plans ({plans.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id || plan.name}
                  className="bg-slate-950 border border-slate-800 p-4 rounded-xl"
                >
                  <p className="font-bold text-white">{plan.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Fee: ${Number(plan.registration_fee)} USDT · Daily: $
                    {Number(plan.daily_reward)} · Duration: {Number(plan.duration_days)} days
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

```
