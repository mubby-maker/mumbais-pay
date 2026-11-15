import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";

const ADMIN_ID = "ec9063ad-107e-4592-8cb4-a87c602637ba";

function money(value) {
  return "$" + Number(value || 0).toFixed(2);
}

function Status({ value }) {
  const status = String(value || "pending").toLowerCase();

  return (
    <span className={"status-pill " + status}>
      {status}
    </span>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("home");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [activities, setActivities] = useState([]);
  const [payments, setPayments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [members, setMembers] = useState([]);
  const [adminTab, setAdminTab] = useState("payments");
  const [isAdmin, setIsAdmin] = useState(false);
  const [plan, setPlan] = useState("standard");
  const [paymentNetwork, setPaymentNetwork] = useState("TRC20");
  const [txHash, setTxHash] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [withdrawNetwork, setWithdrawNetwork] = useState("TRC20");
  const [settings, setSettings] = useState({});
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState("");

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        loadUser(data.session.user);
      } else {
        setLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession) {
          loadUser(newSession.user);
        } else {
          setProfile(null);
          setLoading(false);
          setScreen("home");
        }
      }
    );

    return () => data.subscription.unsubscribe();
  }, []);

  async function loadUser(user) {
    setLoading(true);

    const { data: userProfile, error } = await supabase
      .from("Profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) notify(error.message);

    setProfile(userProfile);

    const adminUser = user.id === ADMIN_ID;

    const { data: role } = await supabase
      .from("admin_roles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    setIsAdmin(adminUser || !!role);

    await loadMemberData(user.id);
    setLoading(false);
  }

  async function loadMemberData(userId) {
    const results = await Promise.all([
      supabase.from("activities").select("*").eq("is_actice", true),
      supabase.from("membership_payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("withdrawal_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("reward_ledger").select("*").eq("user_id", userId).order("created_at", { ascending: false })
    ]);

    setActivities(results[0].data || []);
    setPayments(results[1].data || []);
    setWithdrawals(results[2].data || []);
    setLedger(results[3].data || []);
  }

  async function refresh() {
    if (session?.user) {
      await loadUser(session.user);
    }
  }

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword
    });

    setBusy(false);

    if (error) notify(error.message);
  }

  async function signUp(event) {
    event.preventDefault();

    if (!username || !fullName || !loginEmail || !loginPassword) {
      notify("Please complete all fields.");
      return;
    }

    setBusy(true);

    const { error } = await supabase.auth.signUp({
      email: loginEmail,
      password: loginPassword,
      options: {
        data: {
          username: username,
          full_name: fullName,
          referral_code: referralCode
        }
      }
    });

    setBusy(false);

    if (error) {
      notify(error.message);
    } else {
      notify("Registration submitted. Check your email if confirmation is required.");
      setScreen("login");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setScreen("home");
  }

  async function submitPayment(event) {
    event.preventDefault();

    if (!txHash.trim()) {
      notify("Enter your transaction hash.");
      return;
    }

    setBusy(true);

    const { error } = await supabase
      .from("membership_payments")
      .insert({
        user_id: session.user.id,
        plan_id: plan,
        network: paymentNetwork,
        amount: plan === "premium" ? 5 : 1,
        tx_hash: txHash.trim(),
        status: "pending"
      });

    setBusy(false);

    if (error) {
      notify(error.message);
    } else {
      setTxHash("");
      notify("Payment submitted for admin review.");
      await refresh();
      setScreen("wallet");
    }
  }

  async function requestWithdrawal(event) {
    event.preventDefault();

    const amount = Number(withdrawAmount);

    if (!amount || amount <= 0 || !walletAddress.trim()) {
      notify("Enter a valid amount and wallet address.");
      return;
    }

    setBusy(true);

    const { error } = await supabase.rpc("member_request_withdrawal", {
      p_amount: amount,
      p_wallet_address: walletAddress.trim(),
      p_network: withdrawNetwork
    });

    setBusy(false);

    if (error) {
      notify(error.message);
    } else {
      notify("Withdrawal request submitted.");
      setWithdrawAmount("");
      setWalletAddress("");
      await refresh();
    }
  }

  async function loadAdminData() {
    const results = await Promise.all([
      supabase.from("membership_payments").select("*").order("created_at", { ascending: false }),
      supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("Profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("website_settings").select("*")
    ]);

    setPayments(results[0].data || []);
    setWithdrawals(results[1].data || []);
    setMembers(results[2].data || []);

    const settingObject = {};
    (results[3].data || []).forEach((item) => {
      settingObject[item.key] = item.value;
    });

    setSettings(settingObject);
  }

  async function adminAction(functionName, id) {
    if (!window.confirm("Are you sure you want to perform this action?")) return;

    setBusy(true);

    const argumentName =
      functionName === "admin_approve_membership" ||
      functionName === "admin_reject_membership"
        ? "p_payment_id"
        : "p_withdrawal_id";

    const { error } = await supabase.rpc(functionName, {
      [argumentName]: id
    });

    setBusy(false);

    if (error) {
      notify(error.message);
    } else {
      notify("Action completed.");
      await loadAdminData();
      await refresh();
    }
  }

  async function saveSetting(key, value) {
    setBusy(true);

    const { error } = await supabase
      .from("website_settings")
      .upsert({ key: key, value: value }, { onConflict: "key" });

    setBusy(false);

    if (error) {
      notify(error.message);
    } else {
      notify("Setting saved.");
      await loadAdminData();
    }
  }

  async function openAdmin() {
    if (!isAdmin) {
      notify("Admin access only.");
      return;
    }

    await loadAdminData();
    setScreen("admin");
  }

  async function shareReferral() {
    const code = profile?.Referral_code || "";
    const link = window.location.origin + "/?ref=" + code;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Mumbai's Pay",
          text: "Join me on Mumbai's Pay!",
          url: link
        });
      } catch {
        return;
      }
    } else {
      await navigator.clipboard.writeText(link);
      notify("Referral link copied.");
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <h2>Mumbai's Pay</h2>
        <p>Loading your account...</p>
      </div>
    );
  }

  const balance = Number(profile?.reward_balance || 0);
  const referralLink =
    window.location.origin + "/?ref=" + (profile?.Referral_code || "");

  return (
    <div className="app-shell">
      <header className="top-header">
        <div className="brand-mark">M</div>
        <div className="brand-copy">
          <strong>Mumbai's Pay</strong>
          <span>Rewards platform</span>
        </div>

        {!session && (
          <button className="header-action" onClick={() => setScreen("login")}>
            Login
          </button>
        )}

        {session && (
          <button className="header-action" onClick={refresh}>
            Refresh
          </button>
        )}
      </header>

      <main className="main-content">

        {!session && screen === "home" && (
          <div className="landing-hero">
            <span className="eyebrow">WELCOME TO MUMBAI'S PAY</span>
            <h1>Earn rewards with Mumbai's Pay.</h1>
            <p>
              Join our rewards community, explore activities,
              invite friends and manage your rewards in one place.
            </p>

            <button className="primary-button" onClick={() => setScreen("register")}>
              Create Account
            </button>

            <button className="outline-button" onClick={() => setScreen("login")}>
              Login to Account
            </button>

            <div className="landing-features">
              <div>💰 Rewards dashboard</div>
              <div>👥 Referral programme</div>
              <div>💳 Membership plans</div>
            </div>
          </div>
        )}

        {!session && screen === "login" && (
          <div className="auth-wrap">
            <div className="auth-card">
              <span className="eyebrow">WELCOME BACK</span>
              <h1>Login</h1>
              <p>Access your Mumbai's Pay account.</p>

              <form onSubmit={signIn}>
                <label>Email address</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />

                <label>Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />

                <button className="primary-button" disabled={busy}>
                  {busy ? "Please wait..." : "Login"}
                </button>
              </form>

              <button className="text-button" onClick={() => setScreen("register")}>
                Create an account
              </button>
            </div>
          </div>
        )}

        {!session && screen === "register" && (
          <div className="auth-wrap">
            <div className="auth-card">
              <span className="eyebrow">JOIN OUR COMMUNITY</span>
              <h1>Create account</h1>
              <p>Register for Mumbai's Pay.</p>

              <form onSubmit={signUp}>
                <label>Full name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />

                <label>Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />

                <label>Email address</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />

                <label>Password</label>
                <input
                  type="password"
                  minLength="6"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />

                <label>Referral code (optional)</label>
                <input
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                />

                <button className="primary-button" disabled={busy}>
                  {busy ? "Please wait..." : "Register"}
                </button>
              </form>

              <button className="text-button" onClick={() => setScreen("login")}>
                Already registered? Login
              </button>
            </div>
          </div>
        )}

        {session && (
          <>
            {screen === "home" && (
              <>
                <section className="welcome-section">
                  <div>
                    <span className="eyebrow">YOUR DASHBOARD</span>
                    <h1>Hello, {profile?.Username || "Member"} 👋</h1>
                    <p>Welcome back to Mumbai's Pay.</p>
                  </div>
                  <div className="welcome-badge">M</div>
                </section>

                <div className="balance-card">
                  <div className="balance-top">
                    <span>Available reward balance</span>
                    <span className="live-dot">● LIVE</span>
                  </div>
                  <h2>{money(balance)}</h2>
                  <p>Your current rewards balance</p>
                  <button className="light-button" onClick={() => setScreen("wallet")}>
                    Open Wallet
                  </button>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <span>Membership</span>
                    <strong>{profile?.Membership_plan || "None"}</strong>
                    <small>{profile?.Membership_status || "Inactive"}</small>
                  </div>
                  <div className="stat-card">
                    <span>Referral code</span>
                    <strong>{profile?.Referral_code || "—"}</strong>
                    <small>Invite friends</small>
                  </div>
                </div>

                <section className="section-block">
                  <h2>Quick actions</h2>
                  <div className="action-grid">
                    <button className="action-card" onClick={() => setScreen("earn")}>
                      <span className="action-icon">🎯</span>
                      <strong>Earn rewards</strong>
                      <small>Explore activities</small>
                    </button>

                    <button className="action-card" onClick={() => setScreen("referrals")}>
                      <span className="action-icon">👥</span>
                      <strong>Referrals</strong>
                      <small>Invite your friends</small>
                    </button>

                    <button className="action-card" onClick={() => setScreen("payment")}>
                      <span className="action-icon">💳</span>
                      <strong>Membership</strong>
                      <small>View membership plans</small>
                    </button>

                    <button className="action-card" onClick={() => setScreen("wallet")}>
                      <span className="action-icon">💰</span>
                      <strong>Withdraw</strong>
                      <small>Manage your wallet</small>
                    </button>
                  </div>
                </section>
              </>
            )}

            {screen === "earn" && (
              <>
                <div className="page-title">
                  <span className="eyebrow">REWARDS</span>
                  <h1>Earn rewards</h1>
                  <p>Explore available activities.</p>
                </div>

                {activities.length === 0 && (
                  <div className="empty-state">
                    No activities are available right now.
                  </div>
                )}

                {activities.map((activity) => (
                  <div className="activity-card" key={activity.id}>
                    <div className="activity-icon">🎯</div>
                    <div className="activity-content">
                      <strong>{activity.Title}</strong>
                      <p>{activity.description}</p>
                      <span className="reward-label">
                        Reward: {money(activity.reward_amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {screen === "referrals" && (
              <>
                <div className="page-title">
                  <span className="eyebrow">INVITE FRIENDS</span>
                  <h1>Your referrals</h1>
                  <p>Share your referral code with friends.</p>
                </div>

                <div className="referral-card">
                  <span className="eyebrow">YOUR REFERRAL CODE</span>
                  <h2>{profile?.Referral_code || "Not available"}</h2>
                  <button className="primary-button" onClick={shareReferral}>
                    Share Referral Link
                  </button>
                  <p>{referralLink}</p>
                </div>

                <div className="info-card">
                  <h3>Referral programme</h3>
                  <p>
                    Your referral bonus is subject to the programme rules
                    and successful membership approval.
                  </p>
                </div>
              </>
            )}

            {screen === "wallet" && (
              <>
                <div className="page-title">
                  <span className="eyebrow">YOUR MONEY</span>
                  <h1>My wallet</h1>
                  <p>Manage your reward balance.</p>
                </div>

                <div className="balance-card">
                  <span>Available balance</span>
                  <h2>{money(balance)}</h2>
                  <p>Current reward balance</p>
                </div>

                <div className="form-card">
                  <h2>Request withdrawal</h2>
                  <form onSubmit={requestWithdrawal}>
                    <label>Amount (USDT)</label>
                    <input
                      type="number"
                      min="10"
                      step="0.01"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      required
                    />

                    <label>Network</label>
                    <select
                      value={withdrawNetwork}
                      onChange={(e) => setWithdrawNetwork(e.target.value)}
                    >
                      <option value="TRC20">USDT TRC20</option>
                      <option value="BEP20">USDT BEP20</option>
                    </select>

                    <label>Wallet address</label>
                    <input
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      required
                    />

                    <button className="primary-button" disabled={busy}>
                      Submit withdrawal
                    </button>
                  </form>
                  <p className="muted">Minimum withdrawal: $10 USDT.</p>
                </div>

                <section className="section-block">
                  <h2>Withdrawal history</h2>

                  {withdrawals.length === 0 && (
                    <div className="empty-state">No withdrawals yet.</div>
                  )}

                  {withdrawals.map((item) => (
                    <div className="history-row" key={item.id}>
                      <div>
                        <strong>{money(item.amount)}</strong>
                        <small>{item.network}</small>
                      </div>
                      <Status value={item.status} />
                    </div>
                  ))}
                </section>

                <section className="section-block">
                  <h2>Reward history</h2>

                  {ledger.length === 0 && (
                    <div className="empty-state">No reward transactions yet.</div>
                  )}

                  {ledger.map((item) => (
                    <div className="history-row" key={item.id}>
                      <div>
                        <strong>{item.description}</strong>
                        <small>{new Date(item.created_at).toLocaleDateString()}</small>
                      </div>
                      <strong className={Number(item.amount) >= 0 ? "positive" : "negative"}>
                        {money(item.amount)}
                      </strong>
                    </div>
                  ))}
                </section>
              </>
            )}

            {screen === "payment" && (
              <>
                <div className="page-title">
                  <span className="eyebrow">MEMBERSHIP</span>
                  <h1>Choose a plan</h1>
                  <p>Select your membership plan.</p>
                </div>

                <div className="plan-grid">
                  <button
                    className={"plan-card " + (plan === "standard" ? "selected" : "")}
                    onClick={() => setPlan("standard")}
                  >
                    <span className="eyebrow">STANDARD</span>
                    <h2>$1</h2>
                    <p>Standard membership</p>
                    <div className="plan-detail">
                      <span>Listed daily reward</span>
                      <strong>$1</strong>
                    </div>
                    <div className="plan-detail">
                      <span>Duration</span>
                      <strong>30 days</strong>
                    </div>
                    <small>Select plan</small>
                  </button>

                  <button
                    className={"plan-card " + (plan === "premium" ? "selected" : "")}
                    onClick={() => setPlan("premium")}
                  >
                    <span className="eyebrow">PREMIUM</span>
                    <h2>$5</h2>
                    <p>Premium membership</p>
                    <div className="plan-detail">
                      <span>Listed daily reward</span>
                      <strong>$7</strong>
                    </div>
                    <div className="plan-detail">
                      <span>Duration</span>
                      <strong>15 days</strong>
                    </div>
                    <small>Select plan</small>
                  </button>
                </div>

                <div className="info-card">
                  <h3>Payment information</h3>
                  <p>
                    Send the correct amount of USDT to the official
                    wallet address provided by the administrator.
                    Verify the network and address before sending.
                  </p>
                </div>

                <div className="form-card">
                  <h2>Submit payment</h2>
                  <form onSubmit={submitPayment}>
                    <label>Payment network</label>
                    <select
                      value={paymentNetwork}
                      onChange={(e) => setPaymentNetwork(e.target.value)}
                    >
                      <option value="TRC20">USDT TRC20</option>
                      <option value="BEP20">USDT BEP20</option>
                    </select>

                    <label>Transaction hash</label>
                    <input
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      required
                    />

                    <button className="primary-button" disabled={busy}>
                      Submit payment for review
                    </button>
                  </form>
                </div>

                <section className="section-block">
                  <h2>Payment history</h2>

                  {payments.length === 0 && (
                    <div className="empty-state">No payment submissions yet.</div>
                  )}

                  {payments.map((item) => (
                    <div className="history-row" key={item.id}>
                      <div>
                        <strong>{money(item.amount)}</strong>
                        <small>{item.network}</small>
                      </div>
                      <Status value={item.status} />
                    </div>
                  ))}
                </section>
              </>
            )}

            {screen === "profile" && (
              <>
                <div className="page-title">
                  <span className="eyebrow">ACCOUNT</span>
                  <h1>My profile</h1>
                </div>

                <div className="profile-card">
                  <div className="profile-avatar">
                    {(profile?.Username || "M").charAt(0).toUpperCase()}
                  </div>
                  <h2>{profile?.Full_name || profile?.Username || "Member"}</h2>
                  <p>{session.user.email}</p>
                </div>

                <div className="details-card">
                  <div className="detail-row">
                    <span>Username</span>
                    <strong>{profile?.Username || "—"}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Membership</span>
                    <strong>{profile?.Membership_plan || "None"}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Status</span>
                    <Status value={profile?.Membership_status} />
                  </div>
                  <div className="detail-row">
                    <span>Referral code</span>
                    <strong>{profile?.Referral_code || "—"}</strong>
                  </div>
                </div>

                {isAdmin && (
                  <button className="outline-button" onClick={openAdmin}>
                    Open Admin Dashboard
                  </button>
                )}

                <button className="outline-button logout-button" onClick={signOut}>
                  Logout
                </button>
              </>
            )}

            {screen === "admin" && isAdmin && (
              <>
                <div className="page-title">
                  <span className="eyebrow">ADMINISTRATION</span>
                  <h1>Admin dashboard</h1>
                  <p>Manage membership and withdrawal requests.</p>
                </div>

                <div className="admin-tabs">
                  {["payments", "withdrawals", "members", "settings"].map((tab) => (
                    <button
                      key={tab}
                      className={"tab " + (adminTab === tab ? "active" : "")}
                      onClick={() => setAdminTab(tab)}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {adminTab === "payments" && (
                  <>
                    {payments.length === 0 && (
                      <div className="empty-state">No payment requests.</div>
                    )}

                    {payments.map((item) => (
                      <div className="admin-card" key={item.id}>
                        <strong>{money(item.amount)} — {item.network}</strong>
                        <p className="hash-text">Transaction: {item.tx_hash}</p>
                        <p>User ID: {item.user_id}</p>
                        <Status value={item.status} />

                        {item.status === "pending" && (
                          <div className="button-row">
                            <button
                              className="approve-button"
                              disabled={busy}
                              onClick={() => adminAction("admin_approve_membership", item.id)}
                            >
                              Approve
                            </button>
                            <button
                              className="reject-button"
                              disabled={busy}
                              onClick={() => adminAction("admin_reject_membership", item.id)}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {adminTab === "withdrawals" && (
                  <>
                    {withdrawals.length === 0 && (
                      <div className="empty-state">No withdrawal requests.</div>
                    )}

                    {withdrawals.map((item) => (
                      <div className="admin-card" key={item.id}>
                        <strong>{money(item.amount)}</strong>
                        <p>{item.network}</p>
                        <p className="hash-text">Wallet: {item.wallet_address}</p>
                        <p>User ID: {item.user_id}</p>
                        <Status value={item.status} />

                        {item.status === "pending" && (
                          <div className="button-row">
                            <button
                              className="approve-button"
                              disabled={busy}
                              onClick={() => adminAction("admin_approve_withdrawal", item.id)}
                            >
                              Mark paid
                            </button>
                            <button
                              className="reject-button"
                              disabled={busy}
                              onClick={() => adminAction("admin_reject_withdrawal", item.id)}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {adminTab === "members" && (
                  <>
                    {members.map((member) => (
                      <div className="admin-card" key={member.id}>
                        <strong>{member.Full_name || member.Username}</strong>
                        <p>Username: {member.Username}</p>
                        <p>User ID: {member.id}</p>
                        <p>Balance: {money(member.reward_balance)}</p>
                        <Status value={member.Membership_status} />
                      </div>
                    ))}
                  </>
                )}

                {adminTab === "settings" && (
                  <div className="form-card">
                    <h2>Website settings</h2>

                    <label>USDT TRC20 address</label>
                    <input
                      id="trcAddress"
                      defaultValue={settings.usdt_trc20_address || ""}
                    />
                    <button
                      className="primary-button"
                      onClick={() =>
                        saveSetting(
                          "usdt_trc20_address",
                          document.getElementById("trcAddress").value
                        )
                      }
                    >
                      Save TRC20 address
                    </button>

                    <label>USDT BEP20 address</label>
                    <input
                      id="bepAddress"
                      defaultValue={settings.usdt_bep20_address || ""}
                    />
                    <button
                      className="primary-button"
                      onClick={() =>
                        saveSetting(
                          "usdt_bep20_address",
                          document.getElementById("bepAddress").value
                        )
                      }
                    >
                      Save BEP20 address
                    </button>

                    <label>Minimum withdrawal</label>
                    <input
                      id="minimumWithdrawal"
                      type="number"
                      defaultValue={settings.minimum_withdrawal || "10.00"}
                    />
                    <button
                      className="primary-button"
                      onClick={() =>
                        saveSetting(
                          "minimum_withdrawal",
                          document.getElementById("minimumWithdrawal").value
                        )
                      }
                    >
                      Save minimum withdrawal
                    </button>

                    <label>Referral bonus</label>
                    <input
                      id="referralBonus"
                      type="number"
                      defaultValue={settings.referral_bonus || "0.50"}
                    />
                    <button
                      className="primary-button"
                      onClick={() =>
                        saveSetting(
                          "referral_bonus",
                          document.getElementById("referralBonus").value
                        )
                      }
                    >
                      Save referral bonus
                    </button>
                  </div>
                )}

                <button className="outline-button" onClick={() => setScreen("profile")}>
                  Back to profile
                </button>
              </>
            )}
          </>
        )}

        {session && screen !== "admin" && (
          <footer className="site-footer">
            <strong>Mumbai's Pay</strong>
            <span>Rewards dashboard</span>
          </footer>
        )}
      </main>

      {session && !["payment", "login", "register"].includes(screen) && (
        <nav className="bottom-nav">
          <button
            className={"nav-item " + (screen === "home" ? "active" : "")}
            onClick={() => setScreen("home")}
          >
            <span className="nav-icon">⌂</span>
            Home
          </button>

          <button
            className={"nav-item " + (screen === "earn" ? "active" : "")}
            onClick={() => setScreen("earn")}
          >
            <span className="nav-icon">◎</span>
            Earn
          </button>

          <button
            className={"nav-item " + (screen === "referrals" ? "active" : "")}
            onClick={() => setScreen("referrals")}
          >
            <span className="nav-icon">♧</span>
            Referrals
          </button>

          <button
            className={"nav-item " + (screen === "wallet" ? "active" : "")}
            onClick={() => setScreen("wallet")}
          >
            <span className="nav-icon">▣</span>
            Wallet
          </button>

          <button
            className={"nav-item " + (screen === "profile" ? "active" : "")}
            onClick={() => setScreen("profile")}
          >
            <span className="nav-icon">♙</span>
            Profile
          </button>
        </nav>
      )}

      {toast && <div className="toast-message">{toast}</div>}
    </div>
  );
}
