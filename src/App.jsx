import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const styles = `
*{box-sizing:border-box}
body{margin:0;background:#f3f6fb;color:#172033;font-family:Arial,sans-serif}
button,input,select{font:inherit}
button{cursor:pointer;border:0;border-radius:9px;padding:11px 15px;font-weight:700}
input,select{width:100%;padding:12px;border:1px solid #d8dfeb;border-radius:9px;margin:6px 0 13px;background:white}
.app{max-width:1100px;margin:auto;padding:20px}
.header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;background:#101d36;color:white;padding:18px 22px;border-radius:15px}
.brand{font-size:22px;font-weight:800}
.muted{color:#718096;font-size:14px}
.header .muted{color:#cbd5e1}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}
.tabs button{background:white;color:#26344d;border:1px solid #dce3ee}
.tabs button.active,.primary{background:#2563eb;color:white}
.card{background:white;padding:20px;border-radius:14px;margin:14px 0;box-shadow:0 3px 15px #1720330c}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:13px}
.big{font-size:27px;font-weight:800;margin:8px 0}
h1,h2,h3{margin-top:0}
label{font-size:13px;font-weight:700;color:#475569}
.row{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.badge{display:inline-block;background:#e8f1ff;color:#1d4ed8;padding:5px 9px;border-radius:20px;font-size:12px;font-weight:700}
.danger{background:#fee2e2;color:#991b1b}
.success{background:#dcfce7;color:#166534}
.secondary{background:#e8edf5;color:#26344d}
button:disabled{opacity:.5;cursor:not-allowed}
.notice{padding:12px;border-radius:9px;background:#eff6ff;margin:12px 0;color:#1e40af}
.error{background:#fee2e2;color:#991b1b}
.item{border-top:1px solid #edf0f5;padding:13px 0}
.small{font-size:12px;color:#718096;overflow-wrap:anywhere}
`;

const money = (value) => "$" + Number(value || 0).toFixed(2);

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState("Home");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [members, setMembers] = useState([]);
  const [settings, setSettings] = useState({});
  const [activities, setActivities] = useState([]);

  const [selectedPlan, setSelectedPlan] = useState("");
  const [network, setNetwork] = useState("TRC20");
  const [txHash, setTxHash] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      loadData();
    } else {
      setProfile(null);
      setIsAdmin(false);
      setLoading(false);
    }
  }, [session]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const user = session.user;

      const [
        profileResult,
        adminResult,
        planResult,
        settingResult,
        activityResult
      ] = await Promise.all([
        supabase.from("Profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("admin_roles").select("user_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("membership_plans").select("*").eq("is_active", true),
        supabase.from("website_settings").select("*"),
        supabase.from("activities").select("*").eq("is_actice", true)
      ]);

      if (profileResult.error) throw profileResult.error;
      setProfile(profileResult.data);
      setIsAdmin(!!adminResult.data);
      setPlans(planResult.data || []);
      setActivities(activityResult.data || []);

      const settingsObject = {};
      (settingResult.data || []).forEach((item) => {
        settingsObject[item.key] = item.value;
      });
      setSettings(settingsObject);

      const [paymentResult, withdrawalResult] = await Promise.all([
        supabase.from("membership_payments").select("*").order("created_at", { ascending: false }),
        supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false })
      ]);

      setPayments(paymentResult.data || []);
      setWithdrawals(withdrawalResult.data || []);

      if (adminResult.data) {
        const memberResult = await supabase
          .from("Profiles")
          .select("*")
          .order("created_at", { ascending: false });
        setMembers(memberResult.data || []);
      }
    } catch (err) {
      setError(err.message || "Could not load your account.");
    } finally {
      setLoading(false);
    }
  }

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) setError(error.message);
    setBusy(false);
  }

  async function signUp(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username,
          referral_code: referralCode.trim()
        }
      }
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Account created. Check your email if confirmation is required, then sign in.");
    }

    setBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function submitPayment(event) {
    event.preventDefault();
    if (!selectedPlan || !txHash.trim()) {
      setError("Choose a plan and enter your transaction hash.");
      return;
    }

    const plan = plans.find((p) => p.id === selectedPlan);
    if (!plan) {
      setError("That membership plan could not be found.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    const { error } = await supabase.from("membership_payments").insert({
      user_id: session.user.id,
      plan_id: plan.id,
      network,
      amount: Number(plan.registration_fee),
      tx_hash: txHash.trim(),
      status: "pending"
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Payment submitted for admin review. Your membership is not active until approved.");
      setTxHash("");
      await loadData();
    }

    setBusy(false);
  }

  async function requestWithdrawal(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const { error } = await supabase.rpc("member_request_withdrawal", {
      p_amount: Number(withdrawAmount),
      p_wallet_address: walletAddress.trim(),
      p_network: network
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Withdrawal request submitted for review.");
      setWithdrawAmount("");
      setWalletAddress("");
      await loadData();
    }

    setBusy(false);
  }

  async function adminAction(rpc, id, argument) {
    if (!window.confirm("Are you sure you want to do this?")) return;

    setBusy(true);
    setError("");
    setMessage("");

    const { error } = await supabase.rpc(rpc, { [argument]: id });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Action completed.");
      await loadData();
    }

    setBusy(false);
  }

  if (loading) {
    return <div className="app"><div className="card">Loading Mumbai's Pay...</div></div>;
  }

  if (!session) {
    return (
      <>
        <style>{styles}</style>
        <div className="app">
          <div className="header">
            <div>
              <div className="brand">Mumbai's Pay</div>
              <div className="muted">Rewards platform</div>
            </div>
          </div>

          {message && <div className="notice">{message}</div>}
          {error && <div className="notice error">{error}</div>}

          <div className="card">
            <h2>Welcome back</h2>
            <p className="muted">Sign in to access your account.</p>
            <form onSubmit={signIn}>
              <label>Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button className="primary" disabled={busy}>Sign in</button>
            </form>
          </div>

          <div className="card">
            <h2>Create an account</h2>
            <form onSubmit={signUp}>
              <label>Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />
              <label>Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <label>Password</label>
              <input type="password" minLength="6" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <label>Referral code (optional)</label>
              <input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
              <button className="primary" disabled={busy}>Create account</button>
            </form>
          </div>
        </div>
      </>
    );
  }

  const balance = Number(profile?.reward_balance || 0);
  const referralLink = profile?.Referral_code || "Not assigned";

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="header">
          <div>
            <div className="brand">Mumbai's Pay</div>
            <div className="muted">Your rewards dashboard</div>
          </div>
          <button className="secondary" onClick={signOut}>Sign out</button>
        </div>

        {message && <div className="notice">{message}</div>}
        {error && <div className="notice error">{error}</div>}

        <div className="tabs">
          {["Home", "Membership", "Payments", "Withdraw", "Referrals", "Activities", ...(isAdmin ? ["Admin"] : [])].map((name
