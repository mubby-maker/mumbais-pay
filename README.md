# MUMBAI’S PAY — Secure Rewards & Activity Platform

## Quick Setup & Operation Guide (No Coding Required)

### Step 1: Set Up Supabase Database
1. Go to [Supabase](https://supabase.com) and create a free project.
2. In your Supabase Dashboard, click on **SQL Editor** in the left sidebar.
3. Copy the entire contents of `supabase_schema.sql`, paste it into the SQL editor, and click **Run**. This creates all tables, secure RPC functions, triggers, and Row Level Security (RLS) policies.
4. Go to **Project Settings > API** and copy your **Project URL** and **anon public** key.

### Step 2: Configure Environment Variables
1. Extract `mumbais-pay-complete.zip` on your computer.
2. Create a file named `.env` in the root folder (`mumbais-pay/`) and add your Supabase keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

### Step 3: Run Locally (Optional)
Open your terminal in the project folder and run:
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### Step 4: Create Your Administrator Account
1. Register a new account on the live website or local preview.
2. Go to your Supabase **SQL Editor** and run this query (replace with your email):
   ```sql
   insert into public.admin_roles (user_id)
   select id from auth.users where email = 'your-email@example.com';
   ```
3. Refresh your website and log back in. You will now see the **Admin Panel** button with full administrative authority.

### Step 5: Operate Your Platform from the Admin Panel
* **Members**: View registered members, search, check balances and membership status.
* **Payments**: Review pending membership payments (USDT TRC20 / BEP20) and click **Approve** to activate memberships and credit referral bonuses securely.
* **Activities**: Create, edit, and publish reward activities with custom instructions and rewards.
* **Submissions**: Review member proof submissions and **Approve** or **Reject** them. Approval automatically credits member reward balances securely via database RPC.
* **Withdrawals**: Process withdrawal requests, mark them as paid, or reject them (which automatically refunds the balance exactly once).
* **Settings**: Change membership prices, USDT wallet addresses, payment instructions, and minimum withdrawal thresholds instantly without editing code.

### Step 6: Deploy to the Web (Vercel or Netlify)
1. Push this project to GitHub.
2. Import your repository into [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
3. Add your environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) in the hosting dashboard settings.
4. Click **Deploy**. Your platform is now live!
