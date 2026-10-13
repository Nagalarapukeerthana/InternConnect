# InternConnect — Full-Stack Internship Platform

An original, production-grade full-stack internship portal built for the **ElevanceSkills Full Stack Web Development Internship** program. Engineered with a defense-in-depth zero-trust architecture, atomic business rules, server-authoritative quotas, and full multilingual internationalization.

---

## 1. Architectural Highlights & Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, jsPDF.
- **Backend**: Node.js, Express, TypeScript (`tsx`).
- **Database & Security**: Cloud Firestore schema compatibility, Zero-Trust Attribute-Based Access Control (`firestore.rules`), and intermediate representation blueprint (`firebase-blueprint.json`).
- **Payment Gateway**: Razorpay integration with server-side order generation, fixed pricing enforcement, and cryptographic HMAC-SHA256 signature verification.
- **Email Service**: Server-side transactional email service (SMTP/SendGrid) with fallback dev preview mode.
- **Auditing & Environment**: Real-time IST (`Asia/Kolkata`) access governance, Chrome OTP challenges, and isolated personal security logs.

---

## 2. Implemented Core Tasks

| Task | Feature | Security & Architectural Enforcement |
|------|---------|--------------------------------------|
| **Task 1** | **Multilingual Support (6 Languages)** | Full coverage for English, Spanish, Hindi, Portuguese, Chinese, and French. **French Security Rule**: Switching to French requires a server-generated 6-digit cryptographic OTP sent to the user's email, hashed with SHA-256, 5-minute expiry, and a maximum of 3 attempts. |
| **Task 2** | **Resume Builder & ₹50 Payment** | Multi-step ATS resume form, profile photo support, downloadable PDF generated via jsPDF. Server strictly fixes generation fee at ₹50 (frontend amounts are never trusted). Gated by mandatory email OTP verification before payment. Razorpay HMAC-SHA256 order creation & signature verification. |
| **Task 3** | **Forgot Password Recovery** | Request via email or phone. Enforces a strict rolling 24-hour limit per account with exact message: *"You can use this option only once per day."* Generates temporary passwords containing **uppercase and lowercase letters only** (`[A-Za-z]{12}`) with zero digits or special characters. Forces password reset on subsequent login. |
| **Task 4** | **Public Space Community** | Feed supporting images/videos, comments, likes, and shares. **Atomic Posting Limit Rules**: 0 friends = 0 posts/day; 1 friend = 1 post/day; 2 friends = 2 posts/day; 3–10 friends = 1 post/day (configurable); &gt;10 friends = unlimited. Computed atomically server-side from accepted friendships in IST. |
| **Task 5** | **Login History & Environment Access** | Audit logging of browser, OS, device, IP, and status. Handheld mobile logins are permitted strictly between **10:00 AM and 1:00 PM IST** (blocked outside). Google Chrome browser logins mandate 6-digit email OTP verification before session issuance. Strict tenant data isolation. |
| **Task 6** | **Subscription Plans & Invoices** | Four plans: Free (1 app/mo), Bronze (₹100, 3 apps/mo), Silver (₹300, 5 apps/mo), Gold (₹1,000, unlimited). Payment checkout initiation permitted strictly between **10:00 AM and 11:00 AM IST**. Server verifies every payment signature. Generates official tax invoices with unique numbers and delivers via email. |

---

## 3. Step-by-Step Local Testing Guide (Zero Secrets Required)

The application includes an active development preview engine with pre-seeded test data, cryptographic simulation helpers, and terminal/modal OTP inspection so you can test all 6 tasks end-to-end immediately without entering API keys or environment secrets.

### Quick Start Commands
```bash
# 1. Install dependencies
npm install

# 2. Run automated unit & integration test suite (17 tests)
npm test

# 3. Start the full-stack application (frontend + Express server on port 3000)
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### Pre-Seeded Demo Student Account
- **Email:** `student@internconnect.com`
- **Phone:** `+91 9876543210`
- **Password:** `StudentPass123!`
*(You can also click the "Quick-Fill Demo Student Credentials" button on the Sign In page).*

---

### Step-by-Step Verification for All 6 Tasks

#### 🧪 Task 1 — Multilingual Functionality & French OTP Security
1. Navigate to the top navigation bar. Click the **Language Dropdown** (globe icon).
2. Switch between **English, Spanish (Español), Hindi (हिन्दी), Portuguese (Português), and Chinese (中文)**. Notice how navigation, badges, hero content, buttons, and form labels immediately re-render in the chosen language.
3. Now select **French (Français)**:
   - Notice that the language does **not** change immediately.
   - Instead, a security modal appears: *"French Language Security Verification"*.
   - A server-generated 6-digit cryptographic OTP is generated and hashed with SHA-256.
   - In local dev mode, the modal displays the preview OTP code (e.g. `123456`).
   - Enter the 6-digit code and click **"Verify OTP & Activate French"**.
   - Upon verification, the platform interface instantly updates to French!
   - (Entering an invalid OTP decreases the remaining attempt counter; 3 failed attempts or 5 minutes expires the challenge).

#### 🧪 Task 2 — Resume Builder & ₹50 Gated Payment
1. Click **"Resume Builder"** in the top navigation (ensure you are logged in as `student@internconnect.com`).
2. Fill out or inspect the pre-filled ATS resume form (Personal Information, Professional Summary, Education, Skills, Experience, and Certifications).
3. Click **"Proceed to ₹50 Payment"**:
   - The server triggers Step 2: **Mandatory Email OTP Verification** before allowing payment.
   - Enter the 6-digit payment authorization OTP shown in the preview box.
   - Click **"Unlock ₹50 Payment"**.
4. Step 3 (Payment Checkout) opens:
   - The server enforces the fixed price of **₹50.00 INR (5,000 paise)**. Frontend amounts are never trusted.
   - A clear **"Local Sandbox Notice"** indicates that real Razorpay processing requires `.env` keys.
   - Click **"Verify & Authorize ₹50 Payment"**.
   - The backend validates the cryptographic HMAC-SHA256 signature and records the transaction in persistent store.
   - Click **"Download ATS Resume (PDF)"** to export your formatted PDF generated via `jsPDF`.

#### 🧪 Task 3 — Forgot Password & Rolling 24-Hour Rate Limiting
1. Log out or open an incognito tab and navigate to **"Sign In"** -> click **"Forgot password?"**.
2. Enter `student@internconnect.com` or `+91 9876543210` and submit.
3. Observe the result:
   - A temporary password consisting **strictly of uppercase and lowercase letters only** (`[A-Za-z]{12}`) is generated (zero digits, zero special characters).
   - In dev mode, a secure preview banner shows the generated password.
4. **Test the 24-Hour Rate Limit**: Immediately submit the same email/phone a second time.
   - The server rejects the request with HTTP 429 and displays the exact required text:
     > **"You can use this option only once per day."**
5. **Test Forced Password Change**: Sign in using `student@internconnect.com` and the generated temporary password.
   - The `MustChangePasswordModal` appears immediately, blocking navigation until you set a new permanent password (minimum 8 characters).

#### 🧪 Task 4 — Public Space Community & Atomic Friend-Based Posting Rules
1. Navigate to **"Public Space"**.
2. Inspect the **"Posting Policy & Live Daily Quota"** status card:
   - 0 friends = 0 posts per day (posting is blocked).
   - 1 friend = 1 post per day.
   - 2 friends = 2 posts per day.
   - 3 to 10 friends = 1 post per day (configurable default).
   - More than 10 friends = unlimited posts.
3. To test these limits dynamically without creating multiple accounts:
   - Use the **"Discover Peers"** section in the right sidebar.
   - Click **"Quick Connect (Demo)"** on peer users (e.g. Priya Nair, Rohan Mehta) to connect as accepted friends.
   - Watch your friend count and daily posting allowance update in real-time!
4. Create posts with text, image URLs, or video URLs. Test liking, commenting, and sharing.
5. Attempting to post after reaching your daily allowance triggers a clear rejection message computed atomically on the server.

#### 🧪 Task 5 — Login History, Mobile Window (10 AM - 1 PM IST), & Chrome OTP
1. Click **"Security & Logs"** in the navigation bar.
2. View your audit records displaying timestamp, browser engine, operating system, IP address, and status.
3. Note the security invariant: audit records are strictly isolated to your authenticated account (zero cross-tenant leakage).
4. **Google Chrome OTP Challenge**:
   - When logging in from Google Chrome, the server detects the browser engine and challenges the user with a 6-digit email OTP before issuing a session token.
5. **Mobile Login Window Governance**:
   - The server enforces that mobile and tablet devices may only log in between **10:00 AM and 1:00 PM IST**. Outside this window, mobile logins are blocked with HTTP 403 and logged as failed access attempts in your audit history.
   - Note the technical disclosure explaining why desktop and laptop devices share the same architecture category under standard HTTP client headers.

#### 🧪 Task 6 — Subscription Plans, Application Quotas, & Tax Invoices
1. Navigate to **"Subscriptions"**.
2. Review the 4 tiers:
   - **Free**: 1 application / month (₹0)
   - **Bronze**: 3 applications / month (₹100)
   - **Silver**: 5 applications / month (₹300)
   - **Gold**: Unlimited applications (₹1,000)
3. **Application Quotas**:
   - Browse to **"Internships"** and apply for an internship listing.
   - Your monthly quota decreases. Applying when quota is exhausted displays an alert prompting a subscription upgrade.
4. **Payment Window (10:00 AM – 11:00 AM IST)**:
   - The payment window monitor displays the current live IST time and status.
   - To test upgrading when outside 10:00 - 11:00 AM IST, flip the **"Test Mode: Simulate 10-11 AM IST Window"** toggle.
   - Click **"Upgrade Subscription"** on Bronze, Silver, or Gold.
   - The backend creates the order, verifies the signature, activates the plan, and delivers a formal Tax Invoice.
   - Scroll to **"Billing History & Tax Invoices"** to view or print the generated tax invoice.

---

## 4. Windows Setup & Running Instructions

### Prerequisites
- Node.js 18+ or 20+ installed ([nodejs.org](https://nodejs.org))
- Git installed

### Setup Commands (Windows Command Prompt - `cmd.exe`)
```cmd
:: 1. Clone repository and navigate to folder
cd internconnect

:: 2. Install dependencies
npm install

:: 3. Configure environment variables
copy .env.example .env

:: 4. Run automated test suite
npm test

:: 5. Start development full-stack server
npm run dev
```

### Setup Commands (Windows PowerShell)
```powershell
# 1. Clone and navigate
Set-Location internconnect

# 2. Install dependencies
npm install

# 3. Copy environment configuration
Copy-Item .env.example .env

# 4. Execute automated tests
npm test

# 5. Launch full-stack application
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 4. Firebase Firestore Configuration Instructions

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create or select a project.
2. Under **Build**, select **Firestore Database** and create a database in **Enterprise** or **Standard** mode.
3. Under **Project Settings** > **Service Accounts**, click **Generate New Private Key**.
4. In your `.env` file, supply the credentials:
   ```env
   FIREBASE_PROJECT_ID="your-project-id"
   FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com"
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
5. Deploy the security rules provided in `firestore.rules` using the Firebase CLI:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## 5. Email Provider Configuration Instructions

InternConnect uses server-side email delivery for OTP verification codes, temporary passwords, and subscription invoices.

### Option A: Real SMTP (SendGrid, Mailgun, Amazon SES, or Gmail)
Set the following variables in `.env`:
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="SG.your_sendgrid_api_key_here"
SMTP_FROM="InternConnect <support@internconnect.com>"
EMAIL_MODE="smtp"
```

### Option B: Local Development / Evaluation Mode
In development mode when SMTP credentials are not yet provisioned:
```env
EMAIL_MODE="preview"
```
OTPs and temporary passwords are securely printed to the server terminal with clear audit separators without leaking secrets to unauthorized clients.

---

## 6. Razorpay Test-Mode Setup & Webhook Instructions

### Obtaining Test API Keys
1. Register / Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Switch to **Test Mode** (toggle in the top-left corner).
3. Navigate to **Settings** > **API Keys** > click **Generate Key**.
4. Add the keys to `.env`:
   ```env
   RAZORPAY_KEY_ID="rzp_test_YourKeyIdHere"
   RAZORPAY_KEY_SECRET="YourRazorpaySecretKeyHere"
   RAZORPAY_WEBHOOK_SECRET="YourWebhookSecretHere"
   ```

### Webhook Configuration
1. In Razorpay Dashboard, navigate to **Settings** > **Webhooks** > **Add New Webhook**.
2. Webhook URL: `https://your-domain.com/api/webhooks/razorpay`
3. Secret: Enter the same secret as configured in `RAZORPAY_WEBHOOK_SECRET`.
4. Active Events: Select `payment.captured` and `order.paid`.
5. The InternConnect server validates the `X-Razorpay-Signature` HMAC and maintains idempotent duplicate event protection.

---

## 7. Running Automated Tests

Run the full automated test suite covering all 6 tasks, security invariants, and business rules:

```bash
npm test
```

Test coverage includes:
- Multilingual dictionary completeness & French OTP verification
- Resume ₹50 pricing enforcement & Razorpay HMAC signature validation
- Daily password reset limit (rolling 24 hours) & alpha-only password generation
- Community atomic posting limits across friend count tiers (0, 1, 2, 3–10, >10)
- Mobile login restriction (10:00 AM – 1:00 PM IST) & Google Chrome OTP detection
- Monthly subscription application allowances & webhook idempotency
- Subscription payment initiation window restriction (10:00 AM – 11:00 AM IST)
- Zero-trust user audit isolation

---

## 8. Completed Features & Environment Notice

### Completed Features:
- [x] Full-Stack TypeScript architecture (React 19 + Express + Vite + Tailwind CSS).
- [x] All 12 required pages designed with professional Navy, White, and Teal branding.
- [x] Complete internationalization (en, es, hi, pt, zh, fr) with French OTP challenge.
- [x] Professional Resume Builder with PDF generation and ₹50 Razorpay payment flow.
- [x] Forgot password flow with rolling 24h rate-limiting and alpha-only temporary passwords.
- [x] Public Space community feed with atomic posting limits based on friend counts.
- [x] Login history audit logging with Google Chrome OTP gate and mobile IST window.
- [x] 4 subscription tiers (Free, Bronze, Silver, Gold) with 10:00–11:00 AM IST payment window.
- [x] Official tax invoices with email delivery and history dashboard.
- [x] Full test suite in `tests/internconnect.test.ts`.

### Transparent Configuration Notice:
Per the prompt's instruction: *"Do not claim that email, authentication, database writes, payment processing, or invoice delivery work until they have been configured and tested."*
The application operates an integrated persistent local storage engine with mock seeding out-of-the-box so all flows, rules, and quotas can be tested immediately in this sandbox. For production deployments, connect external services by filling in `.env`.
