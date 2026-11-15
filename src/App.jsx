import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  LogOut, Wallet, User, ShieldCheck, RefreshCw
} from "lucide-react";
import "./index.css";

const supabase = createClient(
  "https://tqygjlnnetbobynekggq.supabase.co",
  "sb_publishable_o3LAtLJ0o7Jx3GZk0rydOw_hYd_1mm"
);

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("home");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) loadProfile();
    else {
      setProfile(null);
      setAdmin(false);
    }
  }, [session]);

  async function loadProfile() {
    const { data } = await supabase
      .from("Profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();

    setProfile(data);

    const { data: role } = await supabase
      .from("admin_roles")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    setAdmin(!!role);
  }

  async function logout() {
    await supabase.auth.signOut();
    setPage("home");
  }

  if (loading) return <p>Loading Mumbai’s Pay...</p>;

  if (!session) {
    return (
      <AuthScreen
        onLogin={(s) => setSession(s)}
      />
    );
  }

  return (
    <main className="min-h-screen p-4">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mumbai’s Pay</h1>
        <button onClick={logout}><LogOut size={20} /></button>
      </header>

      {admin ? (
        <AdminScreen />
      ) : (
        <MemberScreen
          profile={profile}
          user={session.user}
          refresh={loadProfile}
        />
      )}
    </main>
  );
}
function AuthScreen({ onLogin }) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    if (register) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
      });
      setMessage(error ? error.message : "Check your email to confirm registration.");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) setMessage(error.message);
      else onLogin(data.session);
    }

    setBusy(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-5">
      <form onSubmit={submit} className="w-full max-w-md space-y-4">
        <h1 className="text-3xl font-bold text-center">Mumbai’s Pay</h1>
        <p className="text-center">Welcome. Sign in or create an account.</p>

        {register && (
          <input
            className="w-full border p-3 rounded"
            placeholder="Full name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        )}

        <input
          className="w-full border p-3 rounded"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full border p-3 rounded"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <button
          className="w-full bg-black text-white p-3 rounded"
          disabled={busy}
        >
          {busy ? "Please wait..." : register ? "Create account" : "Sign in"}
        </button>

        <button
          type="button"
          className="w-full p-2"
          onClick={() => setRegister(!register)}
        >
          {register ? "Already registered? Sign in" : "Create an account"}
        </button>

        {message && <p className="text-center">{message}</p>}
      </form>
    </main>
  );
}

function MemberScreen({ profile, user, refresh }) {
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [balance, setBalance] = useState(0);
  const [settings, setSettings] = useState({});
  const [network, setNetwork] = useState("TRC20");
  const [plan, setPlan] = useState("standard");
  const [txHash, setTxHash] = useState("");
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [p, pay, c, s, b] = await Promise.all([
      supabase.from("membership_plans").select("*").eq("is_active", true),
      supabase.from("membership_payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("daily_reward_cycles").select("*").eq("user_id", user.id),
      supabase.from("website_settings").select("*"),
      supabase.from("Profiles").select("reward_balance").eq("id", user.id).maybeSingle()
    ]);

    setPlans(p.data || []);
    setPayments(pay.data || []);
    setCycles(c.data || []);
    setSettings(Object.fromEntries((s.data || []).map(x => [x.key, x.value])));
    setBalance(Number(b.data?.reward_balance || 0));
  }

  async function submitPayment(e) {
    e.preventDefault();
    const selected = plans.find(x => x.id === plan);
    if (!selected || !txHash.trim()) {
      setNotice("Select a plan and enter your transaction hash.");
      return;
    }

    const { error } = await supabase.from("membership_payments").insert({
      user_id: user.id,
      plan_id: selected.id,
      network,
      amount: selected.registration_fee,
      tx_hash: txHash.trim(),
      status: "pending"
    });

    setNotice(error ? error.message : "Payment submitted for admin review.");
    if (!error) {
      setTxHash("");
      load();
    }
  }

  async function requestWithdrawal(e) {
    e.preventDefault();
    const { error } = await supabase.rpc("member_request_withdrawal", {
      p_amount: Number(amount),
      p_wallet_address: wallet.trim(),
      p_network: network
    });
    setNotice(error ? error.message : "Withdrawal request submitted.");
    if (!error) {
      setAmount("");
      setWallet("");
      load();
    }
  }

  return (
    <section className="max-w-2xl mx-auto space-y-5">
      <h2 className="text-xl font-bold">Member Dashboard</h2>
      <p>Welcome, {profile?.Full_name || user.email}</p>
      <div className="border rounded p-4">
        <p>Reward balance</p>
        <h2 className="text-3xl font-bold">${balance.toFixed(2)} USDT</h2>
      </div>

      <div className="border rounded p-4 space-y-3">
        <h3 className="font-bold">Membership payment</h3>
        <form onSubmit={submitPayment} className="space-y-3">
          <select className="w-full border p-3 rounded" value={plan} onChange={e => setPlan(e.target.value)}>
            {plans.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — ${p.registration_fee} USDT
              </option>
            ))}
          </select>

          <select className="w-full border p-3 rounded" value={network} onChange={e => setNetwork(e.target.value)}>
            <option value="TRC20">USDT TRC20</option>
            <option value="BEP20">USDT BEP20</option>
          </select>

          <p className="break-all text-sm">
            Send to: {settings[network === "TRC20" ? "usdt_trc20_address" : "usdt_bep20_address"] || "Wallet address not yet set by admin."}
          </p>

          <input className="w-full border p-3 rounded" placeholder="Transaction hash" value={txHash} onChange={e => setTxHash(e.target.value)} required />
          <button className="w-full bg-black text-white p-3 rounded">Submit payment for review</button>
        </form>
      </div>

      <div className="border rounded p-4 space-y-2">
        <h3 className="font-bold">Your membership
          function AdminScreen() {
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [settings, setSettings] = useState([]);
  const [notice, setNotice] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const [p, m, w, s] = await Promise.all([
      supabase.from("membership_payments").select("*").order("created_at", { ascending: false }),
      supabase.from("Profiles").select("*"),
      supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("website_settings").select("*")
    ]);
    setPayments(p.data || []);
    setMembers(m.data || []);
    setWithdrawals(w.data || []);
    setSettings(s.data || []);
  }

  async function action(rpc, args, success) {
    const { error } = await supabase.rpc(rpc, args);
    setNotice(error ? error.message : success);
    if (!error) load();
  }

  async function saveSetting(key, value) {
    const { error } = await supabase
      .from("website_settings")
      .upsert({ key, value }, { onConflict: "key" });
    setNotice(error ? error.message : "Setting saved.");
    if (!error) load();
  }

  return (
    <section className="max-w-3xl mx-auto space-y-5">
      <h2 className="text-2xl font-bold">Admin Dashboard</h2>

      <div className="border rounded p-4">
        <h3 className="font-bold mb-2">Overview</h3>
        <p>Members: {members.length}</p>
        <p>Payment records: {payments.length}</p>
        <p>Withdrawal requests: {withdrawals.length}</p>
      </div>

      <div className="border rounded p-4 space-y-3">
        <h3 className="font-bold">Membership payments</h3>
        {payments.map(p => (
          <div key={p.id} className="border-b py-2 break-all">
            <p>Plan: {p.plan_id} | Amount: ${p.amount}</p>
            <p>Status: {p.status} | Network: {p.network}</p>
            <p>Transaction: {p.tx_hash}</p>
            {p.status === "pending" && (
              <div className="flex gap-2 mt-2">
                <button className="bg-green-700 text-white p-2 rounded"
                  onClick={() => action("admin_approve_membership", { p_payment_id: p.id }, "Membership approved.")}>
                  Approve
                </button>
                <button className="bg-red-700 text-white p-2 rounded"
                  onClick={() => action("admin_reject_membership", { p_payment_id: p.id }, "Payment rejected.")}>
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
        {!payments.length && <p>No payment records.</p>}
      </div>

      <div className="border rounded p-4 space-y-2">
        <h3 className="font-bold">Members</h3>
        {members.map(m => (
          <div key={m.id} className="border-b py-2 break-all">
            <p>{m.Full_name || m.Username || "Member"}</p>
            <p>Plan: {m.Membership_plan || "None"}</p>
            <p>Status: {m.Membership_status || "Pending"}</p>
            <p>Balance: ${Number(m.reward_balance || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="border rounded p-4 space-y-3">
        <h3 className="font-bold">Withdrawal requests</h3>
        {withdrawals.map(w => (
          <div key={w.id} className="border-b py-2 break-all">
            <p>Amount: ${w.amount} USDT</p>
            <p>Network: {w.network}</p>
            <p>Wallet: {w.wallet_address}</p>
            <p>Status: {w.status}</p>
            {w.status === "pending" && (
              <div className="flex gap-2 mt-2">
                <button className="bg-green-700 text-white p-2 rounded"
                  onClick={() => action("admin_approve_withdrawal", { p_withdrawal_id: w.id }, "Marked paid. Only use after sending the USDT.")}>
                  Mark paid
                </button>
                <button className="bg-red-700 text-white p-2 rounded"
                  onClick={() => action("admin_reject_withdrawal", { p_withdrawal_id: w.id }, "Withdrawal rejected.")}>
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
        {!withdrawals.length && <p>No withdrawal requests.</p>}
      </div>

      <div className="border rounded p-4 space-y-3">
        <h3 className="font-bold">Wallet addresses and settings</h3>
        {[
          ["usdt_trc20_address", "USDT TRC20 wallet"],
          ["usdt_bep20_address", "USDT BEP20 wallet"],
          ["minimum_withdrawal", "Minimum withdrawal"],
          ["referral_bonus", "Referral bonus"]
        ].map(([key, label]) => (
          <SettingEditor key={key} settingKey={key} label={label}
            initialValue={settings.find(s => s.key === key)?.value || ""}
            onSave={saveSetting} />
        ))}
      </div>

      {notice && <p className="break-words">{notice}</p>}
      <button className="border p-3 rounded" onClick={load}>
        <RefreshCw size={16} className="inline mr-2" />Refresh admin dashboard
      </button>
    </section>
  );
}

function SettingEditor({ settingKey, label, initialValue, onSave }) {
  const [value, setValue] = useState(String(initialValue));

  useEffect(() => setValue(String(initialValue)), [initialValue]);

  return (
    <div className="space-y-2">
      <label className="block font-medium">{label}</label>
      <input className="w-full border p-3 rounded"
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      <button className="bg-black text-white p-2 rounded"
        onClick={() => onSave(settingKey, value)}>
        Save {label}
      </button>
    </div>
  );
}
