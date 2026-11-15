import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const plans = [
  {
    id: "standard",
    name: "Standard",
    fee: 1,
    reward: 1,
    days: 30,
  },
  {
    id: "premium",
    name: "Premium",
    fee: 5,
    reward: 7,
    days: 15,
  },
];

const css = `
* { box-sizing: border-box; }
body { margin: 0; background: #07111f; color: #f8fafc; font-family: Arial, sans-serif; }
button, input, select { font: inherit; }
button { cursor: pointer; }
.app { min-height: 100vh; }
.nav { background: #101e31; padding: 16px 5%; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid #26364c; }
.logo { color: #34d399; font-size: 22px; font-weight: 800; }
.container { width: 92%; max-width: 1050px; margin: 28px auto; }
.card { background: #122238; border: 1px solid #293c54; padding: 22px; border-radius: 15px; margin-bottom: 18px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 16px; }
h1,h2,h3 { margin-top: 0; }
.muted { color: #a8b6c8; line-height: 1.6; }
.green { color: #34d399; }
.gold { color: #fbbf24; }
input,select { width: 100%; padding: 13px; border: 1px solid #40536d; background: #081526; color: white; border-radius: 8px; margin: 7px 0 14px; }
label { display: block; color: #cbd5e1; font-size: 14px; }
.btn { border: 0; border-radius: 8px; padding: 12px 17px; background: #10b981; color: #041b16; font-weight: 700; margin: 4px; }
.btn:hover { opacity: .85; }
.secondary { background: #293c54; color: white; }
.danger { background: #dc5050; color: white; }
.goldbtn { background: #fbbf24; color: #251800; }
.small { font-size: 13px; }
hr { border: 0; border-top: 1px solid #34465d; margin: 18px 0; }
.status { display: inline-block; padding: 5px 10px; border-radius: 20px; background: #293c54; font-size: 12px; }
.notice { padding: 12px; border-radius: 8px; background: #183d36; color: #a7f3d0; margin: 12px 0; }
.error { background: #482525; color: #fecaca; padding: 12px; border-radius: 8px; margin: 12px 0; }
.tabs { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 20px; }
.tab { background: #293c54; color: white; border: 0; padding: 10px 13px; border-radius: 8px; }
.active { background: #10b981; color: #041b16; font-weight: bold; }
button:disabled { opacity: .5; cursor: not-allowed; }
`;

function money(value) {
  return "$" + Number(value || 0).toFixed(2);
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState("home");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const [selectedPlan, setSelectedPlan] = useState("standard");
  const [network, setNetwork] = useState("TRC20");
  const [txHash, setTxHash] = useState("");
  const [wallet, setWallet] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const [settings, setSettings] = useState({});
  const [payments, setPayments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);

  function notify(text) {
    setMessage(text);
    setError("");
  }

  function fail(text) {
    setError(text);
    setMessage("");
  }

  async function loadProfile(user) {
    const { data, error: profileError } = await supabase
      .from("Profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      fail("Could not load your profile: " + profileError.message);
      return;
    }

    setProfile(data);
  }

  async function loadSettings() {
    const { data } = await supabase
      .from("website_settings")
      .select("*");

    const result = {};
    (data || []).forEach((item) => {
      result[item.key] = item.value;
    });
    setSettings(result);
  }

  async function checkAdmin(user) {
    const { data, error: roleError } = await supabase
      .from("admin_roles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleError && data) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }

  async function refresh() {
    const { data } = await supabase.auth.getSession();
    const currentSession = data?.session || null;

    setSession(currentSession);

    if (currentSession?.user) {
      await loadProfile(currentSession.user);
      await checkAdmin(currentSession.user);
    } else {
      setProfile(null);
      setIsAdmin(false);
    }

    await loadSettings();
    setLoading(false);
  }

  useEffect(() => {
    refresh();

    const { data } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => refresh(), 0);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  async function register(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email || !password || !fullName || !username) {
      fail("Please complete all required fields.");
      return;
    }

    if (password.length < 6) {
      fail("Your password must contain at least 6 characters.");
      return;
    }

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          Username: username,
          Full_name: fullName,
          referral_code: referralCode || null,
        },
      },
    });

    if (signupError) {
      fail(signupError.message);
      return;
    }

    notify("Registration submitted. Check your email if confirmation is required, then log in.");
    setPage("login");
  }

  async function login(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      fail(loginError.message);
      return;
    }

    notify("Login successful.");
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setPage("home");
    notify("You have logged out.");
  }

  async function submitPayment(event) {
    event.preventDefault();

    if (!session?.user) {
      fail("Please log in first.");
      return;
    }

    const plan = plans.find((item) => item.id === selectedPlan);

    if (!plan || !txHash.trim()) {
      fail("Choose a plan and enter your transaction hash.");
      return;
    }

    const { error: paymentError } = await supabase
      .from("membership_payments")
      .insert({
        user_id: session.user.id,
        plan_id: plan.id,
        network,
        amount: plan.fee,
        tx_hash: txHash.trim(),
        status: "pending",
      });

    if (paymentError) {
      fail(paymentError.message);
      return;
    }

    setTxHash("");
    notify("Payment submitted for admin verification.");
    setPage("dashboard");
  }

  async function requestWithdrawal(event) {
    event.preventDefault();

    const amount = Number(withdrawAmount);

    if (!amount || amount <= 0 || !wallet.trim()) {
      fail("Enter a valid amount and wallet address.");
      return;
    }

    const { error: withdrawalError } = await supabase.rpc(
      "member_request_withdrawal",
      {
        p_amount: amount,
        p_wallet_address: wallet.trim(),
        p_network: network,
      }
    );

    if (withdrawalError) {
      fail(withdrawalError.message);
      return;
    }

    setWithdrawAmount("");
    setWallet("");
    notify("Your withdrawal request has been submitted.");
    await loadProfile(session.user);
  }

  async function loadAdminData() {
    if (!isAdmin) return;

    const results = await Promise.all([
      supabase.from("membership_payments").select("*").order("created_at", { ascending: false }),
      supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("Profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("activities").select("*").order("created_at", { ascending: false }),
    ]);

    if (results[0].error) fail(results[0].error.message);
    if (results[1].error) fail(results[1].error.message);
    if (results[2].error) fail(results[2].error.message);
    if (results[3].error) fail(results[3].error.message);

    setPayments(results[0].data || []);
    setWithdrawals(results[1].data || []);
    setMembers(results[2].data || []);
    setActivities(results[3].data || []);
  }

  async function adminAction(functionName, id) {
    const { error: actionError } = await supabase.rpc(functionName, {
      p_payment_id: id,
    });

    if (actionError) {
      fail(actionError.message);
      return;
    }

    notify("Action completed successfully.");
    await loadAdminData();
  }

  async function withdrawalAction(functionName, id) {
    const { error: actionError } = await supabase.rpc(functionName, {
      p_withdrawal_id: id,
    });

    if (actionError) {
      fail(actionError.message);
      return;
    }

    notify("Withdrawal status updated.");
    await loadAdminData();
  }

  async function saveSetting(key, value) {
    const { error: settingError } = await supabase
      .from("website_settings")
      .upsert({ key, value: String(value) });

    if (settingError) {
      fail(settingError.message);
      return;
    }

    notify("Setting saved.");
    await loadSettings();
  }

  useEffect(() => {
    if (isAdmin) loadAdminData();
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="container">
        <h2>Loading Mumbai's Pay...</h2>
      </div>
    );
  }

  const currentPlan = plans.find((item) => item.id === selectedPlan);

  return (
    <div className="app">
      <style>{css}</style>

      <header className="nav">
        <div className="logo">MUMBAI'S PAY</div>
        <div>
          <button className="btn secondary" onClick={() => setPage("home")}>Home</button>
          {session ? (
            <>
              <button className="btn secondary" onClick={() => setPage("dashboard")}>Dashboard</button>
              {isAdmin && (
                <button className="btn goldbtn" onClick={() => setPage("admin")}>Admin</button>
              )}
              <button className="btn danger" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <button className="btn secondary" onClick={() => setPage("login")}>Login</button>
              <button className="btn" onClick={() => setPage("register")}>Register</button>
            </>
          )}
        </div>
      </header>

      <main className="container">
        {message && <div className="notice">{message}</div>}
        {error && <div className="error">{error}</div>}

        {page === "home" && (
          <>
            <section className="card">
              <h1>Welcome to <span className="green">Mumbai's Pay</span></h1>
              <p className="muted">
                Manage your membership, view your rewards and track your account
                from one simple dashboard.
              </p>
              <button className="btn" onClick={() => setPage("register")}>Get Started</button>
              <button className="btn secondary" onClick={() => setPage("login")}>Member Login</button>
            </section>

            <h2>Membership Plans</h2>
            <div className="grid">
              {plans.map((plan) => (
                <section className="card" key={plan.id}>
                  <h2>{plan.name}</h2>
                  <h1 className="green">{money(plan.fee)}</h1>
                  <p className="muted">Membership fee</p>
                  <hr />
                  <h3>{money(plan.reward)} daily reward</h3>
                  <p className="muted">{plan.days} days</p>
                  <h2 className="gold">{money(plan.reward * plan.days)}</h2>
                  <p className="muted">Scheduled total rewards, subject to the programme terms and available funding.</p>
                  <button className="btn" onClick={() => {
                    setSelectedPlan(plan.id);
                    setPage(session ? "payment" : "register");
                  }}>
                    Choose Plan
                  </button>
                </section>
              ))}
            </div>
          </>
        )}

        {page === "register" && (
          <section className="card">
            <h2>Create Your Account</h2>
            <form onSubmit={register}>
              <label>Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />
              <label>Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <label>Referral code (optional)</label>
              <input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
              <button className="btn" type="submit">Create Account</button>
            </form>
          </section>
        )}

        {page === "login" && (
          <section className="card">
            <h2>Member Login</h2>
            <form onSubmit={login}>
              <label>Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button className="btn" type="submit">Login</button>
            </form>
          </section>
        )}

        {page === "payment" && (
          <section className="card">
            <h2>Membership Payment</h2>
            <label>Select membership plan</label>
            <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
              {plans.map((plan) => (
                <option value={plan.id} key={plan.id}>{plan.name} - {money(plan.fee)}</option>
              ))}
            </select>

            <h3>{currentPlan?.name} membership fee: {money(currentPlan?.fee)}</h3>

            <label>Payment network</label>
            <select value={network} onChange={(e) => setNetwork(e.target.value)}>
              <option value="TRC20">USDT TRC20</option>
              <option value="BEP20">USDT BEP20</option>
            </select>

            <div className="notice">
              <strong>Payment wallet address</strong>
              <p>{network === "TRC20" ? settings.usdt_trc20_address : settings.usdt_bep20_address || "Wallet address has not been configured yet."}</p>
            </div>

            <form onSubmit={submitPayment}>
              <label>Transaction hash</label>
              <input value={txHash} onChange={(e) => setTxHash(e.target.value)} required />
              <button className="btn" type="submit">Submit Payment for Review</button>
            </form>
          </section>
        )}

        {page === "dashboard" && (
          <section>
            {!session ? (
              <div className="card">
                <h2>Please log in first.</h2>
                <button className="btn" onClick={() => setPage("login")}>Login</button>
              </div>
            ) : (
              <>
                <div className="card">
                  <h2>Welcome, {profile?.Full_name || profile?.Username || "Member"}</h2>
                  <p className="muted">Your Mumbai's Pay account overview.</p>
                  <div className="grid">
                    <div>
                      <p className="muted">Reward balance</p>
                      <h2 className="green">{money(profile?.reward_balance)}</h2>
                    </div>
                    <div>
                      <p className="muted">Membership status</p>
                      <h2>{profile?.Membership_status || "Not active"}</h2>
                    </div>
                    <div>
                      <p className="muted">Referral code</p>
                      <h2 className="gold">{profile?.Referral_code || "Not available"}</h2>
                    </div>
                  </div>
                </div>

                <div className="grid">
                  <div className="card">
                    <h3>Choose a Plan</h3>
                    <button className="btn" onClick={() => setPage("payment")}>Make Membership Payment</button>
                  </div>
                  <div className="card">
                    <h3>Request Withdrawal</h3>
                    <form onSubmit={requestWithdrawal}>
                      <label>Amount (USD)</label>
                      <input type="number" min="10" step="0.01" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} required />
                      <label>USDT wallet address</label>
                      <input value={wallet} onChange={(e) => setWallet(e.target.value)} required />
                      <label>Network</label>
                      <select value={network} onChange={(e) => setNetwork(e.target.value)}>
                        <option value="TRC20">TRC20</option>
                        <option value="BEP20">BEP20</option>
                      </select>
                      <button className="btn" type="submit">Submit Withdrawal</button>
                    </form>
                    <p className="muted small">Minimum withdrawal: {money(settings.minimum_withdrawal || 10)}</p>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {page === "admin" && (
          <AdminPanel
            isAdmin={isAdmin}
            payments={payments}
            withdrawals={withdrawals}
            members={members}
            activities={activities}
            settings={settings}
            refresh={loadAdminData}
            saveSetting={saveSetting}
            approvePayment={(id) => adminAction("admin_approve_membership", id)}
            rejectPayment={(id) => adminAction("admin_reject_membership", id)}
            approveWithdrawal={(id) => withdrawalAction("admin_approve_withdrawal", id)}
            rejectWithdrawal={(id) => withdrawalAction("admin_reject_withdrawal", id)}
            fail={fail}
          />
        )}
      </main>
    </div>
  );
}

function AdminPanel(props) {
  const [tab, setTab] = useState("payments");
  const [trc, setTrc] = useState(props.settings.usdt_trc20_address || "");
  const [bep, setBep] = useState(props.settings.usdt_bep20_address || "");
  const [minimum, setMinimum] = useState(props.settings.minimum_withdrawal || "10");
  const [bonus, setBonus] = useState(props.settings.referral_bonus || "0.50");

  useEffect(() => {
    setTrc(props.settings.usdt_trc20_address || "");
    setBep(props.settings.usdt_bep20_address || "");
    setMinimum(props.settings.minimum_withdrawal || "10");
    setBonus(props.settings.referral_bonus || "0.50");
  }, [props.settings]);

  if (!props.isAdmin) {
    return <div className="card"><h2>Access denied</h2><p className="muted">Administrator access is required.</p></div>;
  }

  return (
    <section>
      <div className="card">
        <h1 className="gold">Administrator Panel</h1>
        <p className="muted">Manage membership payments, withdrawals, members and website settings.</p>
        <button className="btn secondary" onClick={props.refresh}>Refresh Data</button>
      </div>

      <div className="tabs">
        <button className={tab === "payments" ? "tab active" : "tab"} onClick={() => setTab("payments")}>Payments</button>
        <button className={tab === "withdrawals" ? "tab active" : "tab"} onClick={() => setTab("withdrawals")}>Withdrawals</button>
        <button className={tab === "members" ? "tab active" : "tab"} onClick={() => setTab("members")}>Members</button>
        <button className={tab === "activities" ? "tab active" : "tab"} onClick={() => setTab("activities")}>Activities</button>
        <button className={tab === "settings" ? "tab active" : "tab"} onClick={() => setTab("settings")}>Settings</button>
      </div>

      {tab === "payments" && (
        <>
          <h2>Membership Payments</h2>
          {props.payments.length === 0 && <div className="card muted">No payment records found.</div>}
          {props.payments.map((payment) => (
            <div className="card" key={payment.id}>
              <h3>{payment.plan_id} plan - {money(payment.amount)}</h3>
              <p className="muted small">User ID: {payment.user_id}</p>
              <p className="muted small">Network: {payment.network}</p>
              <p className="muted small">Transaction: {payment.tx_hash}</p>
              <p>Status: <span className="status">{payment.status}</span></p>
              {payment.status === "pending" && (
                <>
                  <button className="btn" onClick={() => props.approvePayment(payment.id)}>Approve Payment</button>
                  <button className="btn danger" onClick={() => props.rejectPayment(payment.id)}>Reject Payment</button>
                </>
              )}
            </div>
          ))}
        </>
      )}

      {tab === "withdrawals" && (
        <>
          <h2>Withdrawal Requests</h2>
          {props.withdrawals.length === 0 && <div className="card muted">No withdrawal requests found.</div>}
          {props.withdrawals.map((item) => (
            <div className="card" key={item.id}>
              <h3>{money(item.amount)}</h3>
              <p className="muted small">User ID: {item.user_id}</p>
              <p className="muted small">Wallet: {item.wallet_address}</p>
              <p className="muted small">Network: {item.network}</p>
              <p>Status: <span className="status">{item.status}</span></p>
              {item.status === "pending" && (
                <>
                  <p className="muted small">Only approve after you have actually sent the USDT.</p>
                  <button className="btn" onClick={() => {
                    if (window.confirm("Have you sent the USDT to this member?")) {
                      props.approveWithdrawal(item.id);
                    }
                  }}>Mark as Paid</button>
                  <button className="btn danger" onClick={() => props.rejectWithdrawal(item.id)}>Reject</button>
                </>
              )}
            </div>
          ))}
        </>
      )}

      {tab === "members" && (
        <>
          <h2>Registered Members ({props.members.length})</h2>
          {props.members.map((member) => (
            <div className="card" key={member.id}>
              <h3>{member.Full_name || member.Username || "Member"}</h3>
              <p className="muted small">User ID: {member.id}</p>
              <p>Plan: {member.Membership_plan || "None"}</p>
              <p>Status: {member.Membership_status || "None"}</p>
              <p>Balance: <span className="green">{money(member.reward_balance)}</span></p>
              <p>Referral code: {member.Referral_code || "None"}</p>
            </div>
          ))}
        </>
      )}

      {tab === "activities" && (
        <>
          <h2>Activities</h2>
          <p className="muted">Activities are displayed here for review. Activity approval and reward crediting need a separate secure database function before they can be enabled.</p>
          {props.activities.map((activity) => (
            <div className="card" key={activity.id}>
              <h3>{activity.Title}</h3>
              <p className="muted">{activity.description}</p>
              <p>Reward: {money(activity.reward_amount)}</p>
              <p>Status: {String(activity.is_actice)}</p>
            </div>
          ))}
        </>
      )}

      {tab === "settings" && (
        <div className="card">
          <h2>Website Settings</h2>
          <label>USDT TRC20 wallet address</label>
          <input value={trc} onChange={(e) => setTrc(e.target.value)} />
          <button className="btn" onClick={() => props.saveSetting("usdt_trc20_address", trc)}>Save TRC20 Address</button>

          <hr />
          <label>USDT BEP20 wallet address</label>
          <input value={bep} onChange={(e) => setBep(e.target.value)} />
          <button className="btn" onClick={() => props.saveSetting("usdt_bep20_address", bep)}>Save BEP20 Address</button>

          <hr />
          <label>Minimum withdrawal</label>
          <input type="number" value={minimum} onChange={(e) => setMinimum(e.target.value)} />
          <button className="btn" onClick={() => props.saveSetting("minimum_withdrawal", minimum)}>Save Minimum</button>

          <hr />
          <label>Referral bonus</label>
          <input type="number" value={bonus} onChange={(e) => setBonus(e.target.value)} />
          <button className="btn" onClick={() => props.saveSetting("referral_bonus", bonus)}>Save Referral Bonus</button>
        </div>
      )}
    </section>
  );
}
