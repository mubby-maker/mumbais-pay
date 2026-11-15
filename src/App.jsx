import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  ShieldCheck, Wallet, Users, Activity, CheckCircle2, Clock, XCircle, 
  LogOut, User, Settings, Lock, ArrowRight, Copy, Check, AlertCircle, 
  Menu, X, DollarSign, Award, ChevronRight, RefreshCw, Send
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // home, login, register, pending, dashboard, admin
  const [settings, setSettings] = useState({});

  useEffect(() => {
    // Check URL for referral code and store in localStorage
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      localStorage.setItem('mumbais_pay_ref', refCode);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserData(session.user.id);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    fetchSettings();

    return () => subscription.unsubscribe();
  }, []);

  async function fetchSettings() {
    const { data } = await supabase.from('website_settings').select('*');
    if (data) {
      const settingsMap = {};
      data.forEach(s => { settingsMap[s.key] = s.value; });
      setSettings(settingsMap);
    }
  }

  async function fetchUserData(userId) {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        
        // Check admin role securely via is_admin RPC or admin_roles table
        const { data: roleData } = await supabase
          .from('admin_roles')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        setIsAdmin(!!roleData);

        if (profileData.membership_status === 'pending') {
          setCurrentView('pending');
        } else if (currentView === 'home' || currentView === 'login' || currentView === 'register') {
          setCurrentView('dashboard');
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium">Loading MUMBAI’S PAY...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-wider text-white">MUMBAI’S <span className="text-brand-500">PAY</span></span>
          </div>

          <div className="flex items-center space-x-4">
            {session ? (
              <div className="flex items-center space-x-3">
                {isAdmin && (
                  <button 
                    onClick={() => setCurrentView('admin')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition ${currentView === 'admin' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                  >
                    Admin Panel
                  </button>
                )}
                <button 
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition ${currentView === 'dashboard' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-red-600/20 hover:border-red-500/30 transition border border-transparent"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setCurrentView('login')}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition"
                >
                  Log In
                </button>
                <button 
                  onClick={() => setCurrentView('register')}
                  className="px-4 py-2 text-sm font-medium bg-brand-500 hover:bg-brand-600 text-slate-950 font-semibold rounded-xl transition shadow-lg shadow-brand-500/20"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Router */}
      <main className="flex-grow">
        {currentView === 'home' && <HomeView settings={settings} onGetStarted={() => setCurrentView('register')} />}
        {currentView === 'login' && <LoginView onSwitch={() => setCurrentView('register')} onLogged={() => fetchUserData(session?.user?.id)} />}
        {currentView === 'register' && <RegisterView settings={settings} onSwitch={() => setCurrentView('login')} onRegistered={(user) => { fetchUserData(user.id); }} />}
        {currentView === 'pending' && <PendingView profile={profile} settings={settings} onRefresh={() => fetchUserData(session.user.id)} />}
        {currentView === 'dashboard' && profile && <DashboardView profile={profile} settings={settings} onUpdate={fetchUserData} />}
        {currentView === 'admin' && isAdmin && <AdminView settings={settings} onSettingsUpdated={fetchSettings} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900 py-8 text-center text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} MUMBAI’S PAY. All rights reserved. Secure Member Rewards & Activity Platform.</p>
        </div>
      </footer>
    </div>
  );
}

function HomeView({ settings, onGetStarted }) {
  return (
    <div className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-6">
          <ShieldCheck className="w-4 h-4" />
          <span>Secure Platform & Verified Membership</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6 max-w-4xl mx-auto leading-tight">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-500">MUMBAI’S PAY</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          The premier rewards, activity, and verified membership platform. Complete tasks, earn verified rewards, and grow with our trusted referral network.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button 
            onClick={onGetStarted}
            className="w-full sm:w-auto px-8 py-4 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold rounded-xl transition shadow-xl shadow-brand-500/20 flex items-center justify-center space-x-2 text-base"
          >
            <span>Join MUMBAI’S PAY Now</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-slate-900/50 border-t border-slate-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Why Choose MUMBAI’S PAY</h2>
            <p className="text-slate-400">Built with institutional-grade security and transparent reward mechanisms.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
              <div className="w-12 h-12 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-center mb-6 text-brand-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Verified Memberships</h3>
              <p className="text-slate-400">Manual review and verification for all membership payments via USDT TRC20 and BEP20 networks.</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
              <div className="w-12 h-12 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-center mb-6 text-brand-400">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Rewarding Activities</h3>
              <p className="text-slate-400">Participate in curated platform activities, submit verified proofs, and earn secure rewards.</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
              <div className="w-12 h-12 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-center mb-6 text-brand-400">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Trusted Referrals</h3>
              <p className="text-slate-400">Invite peers using your unique referral link and earn independent rewards upon successful activity verification.</p>
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
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onLogged();
    }
  }

  async function handlePasswordReset() {
    if (!email) {
      setError('Please enter your email address first to reset password.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-slate-400 text-sm mb-6">Log in to your MUMBAI’S PAY account</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resetSent && (
          <div className="mb-4 p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-400 text-sm">
            Password reset instructions have been sent to your email.
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              required
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Password</label>
              <button type="button" onClick={handlePasswordReset} className="text-xs text-brand-400 hover:underline">Forgot?</button>
            </div>
            <input 
              type="password" 
              required
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-brand-500/20 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Don't have an account?{' '}
          <button onClick={onSwitch} className="text-brand-400 hover:underline font-medium">Register</button>
        </p>
      </div>
    </div>
  );
}

function RegisterView({ settings, onSwitch, onRegistered }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [network, setNetwork] = useState('TRC20');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const price = settings.membership_price || '50';
  const trcWallet = settings.usdt_trc20_address || 'TYourTRC20WalletAddressHere';
  const bepWallet = settings.usdt_bep20_address || '0xYourBEP20WalletAddressHere';

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const storedRef = localStorage.getItem('mumbais_pay_ref') || null;

    // Sign up auth with referral code in metadata
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          referral_code: storedRef
        }
      }
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Insert membership payment submission
      const { error: payError } = await supabase.from('membership_payments').insert([{
        user_id: data.user.id,
        network: network,
        amount: parseFloat(price),
        tx_hash: txHash,
        status: 'pending'
      }]);

      if (payError) {
        if (payError.code === '23505') {
          setError('This transaction hash has already been submitted. Please verify your transaction hash.');
        } else {
          setError(payError.message);
        }
        setLoading(false);
        return;
      }

      onRegistered(data.user);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-2">Join MUMBAI’S PAY</h2>
        <p className="text-slate-400 text-sm mb-6">Create your account and submit membership payment for approval</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Full Name</label>
            <input 
              type="text" 
              required
              value={fullName} 
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              required
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              required
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition"
              placeholder="••••••••"
            />
          </div>

          <div className="border-t border-slate-800 pt-4 mt-4">
            <h3 className="text-sm font-bold text-white mb-2">Membership Fee Payment (${price} USDT)</h3>
            <p className="text-xs text-slate-400 mb-4">{settings.payment_instructions || 'Transfer exact membership fee to the wallet address below and submit your transaction hash.'}</p>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setNetwork('TRC20')}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold transition ${network === 'TRC20' ? 'bg-brand-500/10 border-brand-500 text-brand-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
              >
                USDT (TRC20)
              </button>
              <button
                type="button"
                onClick={() => setNetwork('BEP20')}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold transition ${network === 'BEP20' ? 'bg-brand-500/10 border-brand-500 text-brand-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
              >
                USDT (BEP20)
              </button>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl mb-4">
              <span className="block text-xs text-slate-400 mb-1">Send to {network} Address:</span>
              <div className="flex items-center justify-between">
                <code className="text-xs text-brand-400 font-mono break-all">{network === 'TRC20' ? trcWallet : bepWallet}</code>
                <button 
                  type="button"
                  onClick={() => navigator.clipboard.writeText(network === 'TRC20' ? trcWallet : bepWallet)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 ml-2"
                  title="Copy Address"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Transaction Hash / Proof ID</label>
              <input 
                type="text" 
                required
                value={txHash} 
                onChange={e => setTxHash(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition font-mono text-sm"
                placeholder="0x..."
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-brand-500/20 disabled:opacity-50 mt-6"
          >
            {loading ? 'Submitting Registration...' : 'Complete Registration & Submit Payment'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <button onClick={onSwitch} className="text-brand-400 hover:underline font-medium">Log In</button>
        </p>
      </div>
    </div>
  );
}

function PendingView({ profile, settings, onRefresh }) {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-400">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Membership Pending Approval</h2>
        <p className="text-slate-400 text-sm mb-6">
          Hello <span className="text-white font-medium">{profile?.full_name}</span>, your membership payment has been submitted and is awaiting administrator verification.
        </p>
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-left mb-6 text-xs space-y-2">
          <div className="flex justify-between"><span className="text-slate-400">Status:</span><span className="text-amber-400 font-bold uppercase">Pending Verification</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Email:</span><span className="text-white">{profile?.email}</span></div>
        </div>
        <button 
          onClick={onRefresh}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Check Status Again</span>
        </button>
      </div>
    </div>
  );
}

function DashboardView({ profile, settings, onUpdate }) {
  const [activities, setActivities] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [activeTab, setActiveTab] = useState('activities');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [proofText, setProofText] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  async function fetchDashboardData() {
    const { data: actData } = await supabase.from('activities').select('*').eq('is_active', true);
    if (actData) setActivities(actData);

    const { data: subData } = await supabase.from('activity_submissions').select('*, activities(title)').eq('user_id', profile.id);
    if (subData) setSubmissions(subData);

    const { data: wdData } = await supabase.from('withdrawal_requests').select('*').eq('user_id', profile.id);
    if (wdData) setWithdrawals(wdData);

    const { data: lgData } = await supabase.from('reward_ledger').select('*').eq('user_id', profile.id);
    if (lgData) setLedger(lgData);
  }

  async function submitActivityProof(e) {
    e.preventDefault();
    if (!selectedActivity) return;
    setError('');
    setSuccess('');

    // Check if there is already a pending or approved submission for this activity
    const existing = submissions.find(s => s.activity_id === selectedActivity.id && (s.status === 'pending' || s.status === 'approved'));
    if (existing) {
      setError('You already have a pending or approved submission for this activity.');
      return;
    }

    // If there was a rejected submission, delete it so the member can resubmit
    const rejectedSub = submissions.find(s => s.activity_id === selectedActivity.id && s.status === 'rejected');
    if (rejectedSub) {
      await supabase.from('activity_submissions').delete().eq('id', rejectedSub.id);
    }

    const { error: subErr } = await supabase.from('activity_submissions').insert([{
      activity_id: selectedActivity.id,
      user_id: profile.id,
      proof: proofText,
      status: 'pending'
    }]);

    if (subErr) {
      setError(subErr.message);
    } else {
      setSuccess('Activity proof submitted successfully!');
      setSelectedActivity(null);
      setProofText('');
      fetchDashboardData();
    }
  }

  async function requestWithdrawal(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amt = parseFloat(withdrawAmount);
    const minWd = parseFloat(settings.min_withdrawal || '10');

    if (amt < minWd) {
      setError(`Minimum withdrawal amount is $${minWd}`);
      return;
    }

    if (amt > profile.reward_balance) {
      setError('Insufficient available balance.');
      return;
    }

    // Call secure database RPC function for withdrawal
    const { error: wdErr } = await supabase.rpc('member_request_withdrawal', { req_amount: amt });

    if (wdErr) {
      setError(wdErr.message);
    } else {
      setSuccess('Withdrawal request submitted successfully!');
      setWithdrawAmount('');
      fetchDashboardData();
      onUpdate(profile.id);
    }
  }

  const referralLink = `${window.location.origin}/?ref=${profile.referral_code}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-gradient-to-r from-slate-900 to-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4" />
            <span>Verified Member</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Welcome back, {profile.full_name}</h1>
          <p className="text-slate-400 text-sm">Manage your activities, track your rewards, and grow your referrals.</p>
        </div>
        <div className="mt-6 md:mt-0 bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center space-x-6">
          <div>
            <span className="block text-xs text-slate-400 uppercase font-semibold">Reward Balance</span>
            <span className="text-2xl font-black text-brand-400">${profile.reward_balance.toFixed(2)}</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="block text-xs text-slate-400 uppercase font-semibold">Referrals</span>
            <span className="text-2xl font-black text-white">{profile.referral_count}</span>
          </div>
        </div>
      </div>

      <div className="flex space-x-2 border-b border-slate-800 mb-8 overflow-x-auto pb-2">
        {['activities', 'submissions', 'referrals', 'wallet'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold capitalize transition ${activeTab === tab ? 'bg-brand-500 text-slate-950 shadow-lg shadow-brand-500/20' : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}
      {success && <div className="mb-6 p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-400 text-sm">{success}</div>}

      {activeTab === 'activities' && (
        <div>
          <h2 className="text-xl font-bold text-white mb-6">Available Activities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map(act => (
              <div key={act.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-white">{act.title}</h3>
                    <span className="px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full text-xs font-bold">${act.reward_amount}</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-6">{act.description}</p>
                </div>
                <button
                  onClick={() => setSelectedActivity(act)}
                  className="w-full py-3 bg-slate-800 hover:bg-brand-500 hover:text-slate-950 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center space-x-2"
                >
                  <span>Participate</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
            {activities.length === 0 && (
              <p className="text-slate-400 col-span-full text-center py-10">No activities available at the moment.</p>
            )}
          </div>

          {selectedActivity && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4 z-50">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-lg w-full shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-2">{selectedActivity.title}</h3>
                <p className="text-brand-400 text-sm font-semibold mb-4">Reward: ${selectedActivity.reward_amount}</p>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl mb-6 text-sm text-slate-300">
                  <span className="block text-xs font-semibold text-slate-400 uppercase mb-1">Instructions:</span>
                  <p className="whitespace-pre-line">{selectedActivity.instructions}</p>
                </div>

                <form onSubmit={submitActivityProof} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Submission Proof / Link / Evidence</label>
                    <textarea 
                      required
                      rows="4"
                      value={proofText}
                      onChange={e => setProofText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500 transition text-sm"
                      placeholder="Paste your link or proof details here..."
                    ></textarea>
                  </div>
                  <div className="flex space-x-4">
                    <button 
                      type="button"
                      onClick={() => setSelectedActivity(null)}
                      className="w-1/2 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition text-sm"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="w-1/2 py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold rounded-xl transition text-sm"
                    >
                      Submit Proof
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'submissions' && (
        <div>
          <h2 className="text-xl font-bold text-white mb-6">Activity Submissions</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-950/50">
                  <th className="p-4">Activity</th>
                  <th className="p-4">Proof</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {submissions.map(sub => (
                  <tr key={sub.id}>
                    <td className="p-4 font-semibold text-white">{sub.activities?.title}</td>
                    <td className="p-4 text-slate-300 truncate max-w-xs">{sub.proof}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        sub.status === 'approved' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' :
                        sub.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(sub.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {submissions.length === 0 && <p className="text-slate-400 text-center py-10">No submissions recorded yet.</p>}
          </div>
        </div>
      )}

      {activeTab === 'referrals' && (
        <div>
          <h2 className="text-xl font-bold text-white mb-6">Referral Program</h2>
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl mb-8">
            <h3 className="text-lg font-bold text-white mb-2">Your Unique Referral Link</h3>
            <p className="text-slate-400 text-sm mb-4">Share this link with your friends. Earn rewards when they complete verified qualifying membership payments.</p>
            <div className="flex items-center space-x-4">
              <input 
                type="text" 
                readOnly 
                value={referralLink}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-brand-400 font-mono text-sm"
              />
              <button 
                onClick={() => navigator.clipboard.writeText(referralLink)}
                className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold rounded-xl transition flex items-center space-x-2 text-sm flex-shrink-0"
              >
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </button>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
            <h3 className="text-lg font-bold text-white mb-2">Total Successful Referrals: <span className="text-brand-400">{profile.referral_count}</span></h3>
            <p className="text-slate-400 text-sm">Referral status and bonus rewards are tracked automatically upon payment verification.</p>
          </div>
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl lg:col-span-1">
            <h2 className="text-xl font-bold text-white mb-6">Request Withdrawal</h2>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl mb-6">
              <span className="block text-xs text-slate-400 uppercase font-semibold mb-1">Available Balance</span>
              <span className="text-3xl font-black text-brand-400">${profile.reward_balance.toFixed(2)}</span>
            </div>
            <form onSubmit={requestWithdrawal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Withdrawal Amount ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition"
                  placeholder="50.00"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-brand-500/20 text-sm"
              >
                Submit Withdrawal Request
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-6">Withdrawal History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-950/50">
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {withdrawals.map(wd => (
                    <tr key={wd.id}>
                      <td className="p-4 font-bold text-white">${wd.amount.toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          wd.status === 'paid' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' :
                          wd.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {wd.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">{new Date(wd.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {withdrawals.length === 0 && <p className="text-slate-400 text-center py-10">No withdrawal requests found.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminView({ settings, onSettingsUpdated }) {
  const [adminTab, setAdminTab] = useState('members');
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  
  const [membershipPrice, setMembershipPrice] = useState(settings.membership_price || '50');
  const [trcAddress, setTrcAddress] = useState(settings.usdt_trc20_address || '');
  const [bepAddress, setBepAddress] = useState(settings.usdt_bep20_address || '');
  const [instructions, setInstructions] = useState(settings.payment_instructions || '');
  const [minWd, setMinWd] = useState(settings.min_withdrawal || '10');

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newInst, setNewInst] = useState('');
  const [newReward, setNewReward] = useState('');

  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, [adminTab]);

  async function fetchAdminData() {
    if (adminTab === 'members') {
      const { data } = await supabase.from('profiles').select('*');
      if (data) setMembers(data);
    } else if (adminTab === 'payments') {
      const { data } = await supabase.from('membership_payments').select('*, profiles(full_name, email)');
      if (data) setPayments(data);
    } else if (adminTab === 'activities') {
      const { data } = await supabase.from('activities').select('*');
      if (data) setActivities(data);
    } else if (adminTab === 'submissions') {
      const { data } = await supabase.from('activity_submissions').select('*, profiles(full_name), activities(title, reward_amount)');
      if (data) setSubmissions(data);
    } else if (adminTab === 'withdrawals') {
      const { data } = await supabase.from('withdrawal_requests').select('*, profiles(full_name, email, reward_balance)');
      if (data) setWithdrawals(data);
    }
  }

  async function approveMembership(paymentId) {
    const { error } = await supabase.rpc('admin_approve_membership', { payment_id: paymentId });
    if (error) alert(error.message);
    else fetchAdminData();
  }

  async function approveSubmission(subId) {
    const { error } = await supabase.rpc('admin_approve_submission', { sub_id: subId });
    if (error) alert(error.message);
    else fetchAdminData();
  }

  async function rejectSubmission(subId) {
    const { error } = await supabase.rpc('admin_reject_submission', { sub_id: subId });
    if (error) alert(error.message);
    else fetchAdminData();
  }

  async function approveWithdrawal(wdId) {
    const { error } = await supabase.rpc('admin_approve_withdrawal', { wd_id: wdId });
    if (error) alert(error.message);
    else fetchAdminData();
  }

  async function rejectWithdrawal(wdId) {
    const { error } = await supabase.rpc('admin_reject_withdrawal', { wd_id: wdId });
    if (error) alert(error.message);
    else fetchAdminData();
  }

  async function createActivity(e) {
    e.preventDefault();
    await supabase.from('activities').insert([{
      title: newTitle,
      description: newDesc,
      instructions: newInst,
      reward_amount: parseFloat(newReward),
      is_active: true
    }]);
    setNewTitle(''); setNewDesc(''); setNewInst(''); setNewReward('');
    fetchAdminData();
  }

  async function saveSettings(e) {
    e.preventDefault();
    const updates = [
      { key: 'membership_price', value: membershipPrice },
      { key: 'usdt_trc20_address', value: trcAddress },
      { key: 'usdt_bep20_address', value: bepAddress },
      { key: 'payment_instructions', value: instructions },
      { key: 'min_withdrawal', value: minWd }
    ];

    for (const u of updates) {
      await supabase.from('website_settings').upsert(u, { onConflict: 'key' });
    }
    setSuccess('Settings updated successfully!');
    onSettingsUpdated();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Administrator Control Panel</h1>
        <p className="text-slate-400 text-sm">Full administrative authority over members, payments, activities, and system settings.</p>
      </div>

      <div className="flex space-x-2 border-b border-slate-800 mb-8 overflow-x-auto pb-2">
        {['members', 'payments', 'activities', 'submissions', 'withdrawals', 'settings'].map(tab => (
          <button
            key={tab}
            onClick={() => setAdminTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold capitalize transition ${adminTab === tab ? 'bg-brand-500 text-slate-950 shadow-lg shadow-brand-500/20' : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {success && <div className="mb-6 p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-400 text-sm">{success}</div>}

      {adminTab === 'members' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-950/50">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Status</th>
                <th className="p-4">Balance</th>
                <th className="p-4">Referrals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {members.map(m => (
                <tr key={m.id}>
                  <td className="p-4 font-semibold text-white">{m.full_name}</td>
                  <td className="p-4 text-slate-300">{m.email}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${m.membership_status === 'active' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {m.membership_status}
                    </span>
                  </td>
                  <td className="p-4 text-brand-400 font-bold">${m.reward_balance.toFixed(2)}</td>
                  <td className="p-4 text-white">{m.referral_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adminTab === 'payments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-950/50">
                <th className="p-4">Member</th>
                <th className="p-4">Network</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Tx Hash</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="p-4 font-semibold text-white">{p.profiles?.full_name}</td>
                  <td className="p-4 text-slate-300">{p.network}</td>
                  <td className="p-4 font-bold text-white">${p.amount}</td>
                  <td className="p-4 font-mono text-xs text-brand-400 truncate max-w-xs">{p.tx_hash}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${p.status === 'approved' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {p.status === 'pending' && (
                      <button 
                        onClick={() => approveMembership(p.id)}
                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold rounded-xl text-xs transition"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adminTab === 'activities' && (
        <div className="space-y-8">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6">Create New Activity</h3>
            <form onSubmit={createActivity} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Activity Title</label>
                  <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white" placeholder="Task Title" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Reward Amount ($)</label>
                  <input type="number" step="0.01" required value={newReward} onChange={e => setNewReward(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white" placeholder="10.00" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Description</label>
                <input type="text" required value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white" placeholder="Brief summary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Instructions</label>
                <textarea required rows="3" value={newInst} onChange={e => setNewInst(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white" placeholder="Step-by-step instructions"></textarea>
              </div>
              <button type="submit" className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold rounded-xl text-sm">Publish Activity</button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-950/50">
                  <th className="p-4">Title</th>
                  <th className="p-4">Reward</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {activities.map(a => (
                  <tr key={a.id}>
                    <td className="p-4 font-semibold text-white">{a.title}</td>
                    <td className="p-4 text-brand-400 font-bold">${a.reward_amount}</td>
                    <td className="p-4"><span className="text-brand-400 font-bold">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adminTab === 'submissions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-950/50">
                <th className="p-4">Member</th>
                <th className="p-4">Activity</th>
                <th className="p-4">Proof</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {submissions.map(sub => (
                <tr key={sub.id}>
                  <td className="p-4 font-semibold text-white">{sub.profiles?.full_name}</td>
                  <td className="p-4 text-slate-300">{sub.activities?.title} (${sub.activities?.reward_amount})</td>
                  <td className="p-4 text-slate-300 truncate max-w-xs">{sub.proof}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${sub.status === 'approved' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : sub.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {sub.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button onClick={() => approveSubmission(sub.id)} className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold rounded-lg text-xs">Approve</button>
                        <button onClick={() => rejectSubmission(sub.id)} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-xs">Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adminTab === 'withdrawals' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-950/50">
                <th className="p-4">Member</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Balance</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {withdrawals.map(wd => (
                <tr key={wd.id}>
                  <td className="p-4 font-semibold text-white">{wd.profiles?.full_name} ({wd.profiles?.email})</td>
                  <td className="p-4 font-bold text-white">${wd.amount.toFixed(2)}</td>
                  <td className="p-4 text-brand-400">${wd.profiles?.reward_balance.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${wd.status === 'paid' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : wd.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {wd.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {wd.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button onClick={() => approveWithdrawal(wd.id)} className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold rounded-lg text-xs">Mark Paid</button>
                        <button onClick={() => rejectWithdrawal(wd.id)} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-xs">Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adminTab === 'settings' && (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl max-w-2xl">
          <h3 className="text-xl font-bold text-white mb-6">Platform Settings</h3>
          <form onSubmit={saveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Membership Price ($ USDT)</label>
              <input type="number" value={membershipPrice} onChange={e => setMembershipPrice(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">USDT TRC20 Address</label>
              <input type="text" value={trcAddress} onChange={e => setTrcAddress(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">USDT BEP20 Address</label>
              <input type="text" value={bepAddress} onChange={e => setBepAddress(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Payment Instructions</label>
              <textarea rows="3" value={instructions} onChange={e => setInstructions(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm"></textarea>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Minimum Withdrawal Amount ($)</label>
              <input type="number" value={minWd} onChange={e => setMinWd(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white" />
            </div>
            <button type="submit" className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold rounded-xl text-sm">Save Platform Settings</button>
          </form>
        </div>
      )}
    </div>
  );
}
