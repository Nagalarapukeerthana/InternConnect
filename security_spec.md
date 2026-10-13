# Security Specification: InternConnect Zero-Trust Architecture

## 1. Data Invariants
- **Identity Isolation**: A user can never access or modify another user's private data, resumes, subscriptions, or login audit history.
- **Atomic Friend Limits**: Daily post allowance is calculated strictly from accepted friendships in the database, preventing race conditions.
- **Server Authoritative Payments**: No subscription or paid resume is ever activated based on client-side status. Only server-side signature verification of Razorpay orders (`HMAC-SHA256`) or validated webhooks unlock paid capabilities.
- **Cryptographic OTPs**: OTP challenges are salted, hashed with SHA-256, and stored with a 5-minute time-to-live (TTL). Maximum 3 attempts before revocation.
- **Chrome & Mobile Guardrails**:
  - Google Chrome logins mandate email OTP challenge resolution.
  - Mobile user agents are permitted only between 10:00 AM and 1:00 PM IST (Asia/Kolkata).
- **Subscription Quota Enforcement**: Internship submissions increment `applicationsUsed` atomically and block applications when `applicationsUsed >= monthlyAllowance` (unless Gold/unlimited).
- **Time-Window Enforced Checkout**: Subscription payment initiation is permitted strictly between 10:00 AM and 11:00 AM IST.

## 2. The "Dirty Dozen" Threat Vectors & Mitigations
1. **Ghost Field Injection**: Client attempts to inject `role: "admin"` or `isAdmin: true` during registration -> Schema validation rejects unlisted properties.
2. **Payment Amount Spoofing**: Client attempts to send `amount: 1` instead of ₹50 for resume generation -> Server sets price internally.
3. **Friend Count Bypass**: Client attempts to forge `friendCount: 100` in post request payload -> Server recalculates accepted friends from the database.
4. **Timezone Manipulation**: Client sends altered local time header to bypass mobile 10-1 PM IST window -> Server derives current time strictly in `Asia/Kolkata`.
5. **Mobile User-Agent Spoofing Bypass**: User-Agent parsing validates mobile keywords (`Mobile`, `Android`, `iPhone`); non-compliant time slots trigger immediate HTTP 403.
6. **Chrome OTP Bypass**: Login endpoint detects Chrome engine and demands verification token before returning JWT session.
7. **Password Reset Enumeration**: Reset endpoint responds with identical success message regardless of whether the email/phone exists.
8. **Password Reset Flooding**: Reset requests are strictly bounded to 1 per 24 hours per account.
9. **Temporary Password Entropy Weakness**: Temporary passwords use purely upper and lower case letters `[A-Za-z]{12}` without digits/symbols as specified.
10. **French Language Escalation**: French language update triggers an OTP email challenge; unverified requests are rejected.
11. **Replay Webhook Attack**: Razorpay webhook validates `x-razorpay-signature` and stores processed event IDs for idempotency.
12. **PII Scraping via List Queries**: Firestore security rules mandate `resource.data.userId == request.auth.uid` for PII and login history queries.
