import { Router, Request, Response } from 'express';
import { UAParser } from 'ua-parser-js';
import crypto from 'crypto';
import { dbStore, LoginHistoryRecord, OTPChallenge, User } from '../store.js';
import {
  hashPassword,
  comparePassword,
  generateSecureOTP,
  hashOTP,
  generateAlphaOnlyTempPassword,
} from '../cryptoUtils.js';
import { isWithinMobileLoginWindow, getISTFormattedString } from '../timeUtils.js';
import { emailService } from '../emailService.js';

export const authRouter = Router();

// Helper to mask email for safe display (e.g., k***a@gmail.com)
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

// Simple signed session token generator (replaces external JWT for zero-dep reliability)
export function createSessionToken(userId: string): string {
  const secret = process.env.SESSION_SECRET || 'internconnect_secret_default_change_me';
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 7 * 86400000 })).toString('base64');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): string | null {
  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    const secret = process.env.SESSION_SECRET || 'internconnect_secret_default_change_me';
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    if (Date.now() > data.exp) return null;
    return data.userId;
  } catch {
    return null;
  }
}

// Middleware to extract user from session token or cookie
export function requireAuth(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : (req.cookies?.session_token as string);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const userId = verifySessionToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  const user = dbStore.users.get(userId);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  (req as any).user = user;
  next();
}

/**
 * 1. Register student account
 */
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, phone, fullName, password, role = 'student' } = req.body;

    if (!email || !phone || !fullName || !password) {
      return res.status(400).json({ error: 'All fields (full name, email, phone, password) are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    // Check if user already exists
    for (const u of dbStore.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return res.status(409).json({ error: 'An account with this email address already exists.' });
      }
      if (u.phone === phone) {
        return res.status(409).json({ error: 'An account with this phone number already exists.' });
      }
    }

    const passwordHash = await hashPassword(password);
    const userId = `usr-${crypto.randomUUID()}`;

    const newUser: User = {
      id: userId,
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      fullName: fullName.trim(),
      passwordHash,
      role: role === 'employer' ? 'employer' : 'student',
      preferredLanguage: 'en',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.users.set(userId, newUser);

    // Create default profile
    dbStore.profiles.set(userId, {
      userId,
      headline: 'Student at InternConnect',
      bio: '',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
      location: 'India',
      education: [],
      skills: [],
      experience: [],
      certifications: [],
    });

    // Default Free subscription (1 application/month)
    dbStore.subscriptions.set(userId, {
      userId,
      planId: 'free',
      monthlyPrice: 0,
      monthlyAllowance: 1,
      applicationsUsed: 0,
      cycleStartDate: new Date().toISOString(),
      cycleEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      status: 'active',
      updatedAt: new Date().toISOString(),
    });

    const token = createSessionToken(userId);
    res.cookie('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 86400000,
    });

    return res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        fullName: newUser.fullName,
        role: newUser.role,
        preferredLanguage: newUser.preferredLanguage,
        mustChangePassword: false,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: `Registration error: ${error.message}` });
  }
});

/**
 * 2. Login with Chrome OTP and Mobile Window restrictions
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body; // email or phone
    const userAgentString = req.headers['user-agent'] || '';
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';

    // Parse user agent
    const parser = new UAParser(userAgentString);
    const uaResult = parser.getResult();
    const browserName = uaResult.browser.name || 'Unknown Browser';
    const osName = uaResult.os.name || 'Unknown OS';
    const deviceType = uaResult.device.type; // 'mobile', 'tablet', etc.

    let deviceCategory: 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'unknown' = 'desktop';
    if (deviceType === 'mobile') deviceCategory = 'mobile';
    else if (deviceType === 'tablet') deviceCategory = 'tablet';
    else if (/Mobi|Android|iPhone|iPad/i.test(userAgentString)) deviceCategory = 'mobile';
    else deviceCategory = 'desktop'; // Note: User-Agent strings cannot reliably distinguish laptops from desktops

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/Phone and password are required.' });
    }

    // Find user
    let user: User | undefined;
    for (const u of dbStore.users.values()) {
      if (
        u.email.toLowerCase() === identifier.toLowerCase().trim() ||
        u.phone === identifier.trim()
      ) {
        user = u;
        break;
      }
    }

    // Verify password if user exists
    let passwordValid = false;
    if (user) {
      passwordValid = await comparePassword(password, user.passwordHash);
    }

    // Task 5 Requirement 1: Mobile window restriction (10:00 AM - 1:00 PM IST)
    const isMobileDevice = deviceCategory === 'mobile' || deviceCategory === 'tablet';
    if (isMobileDevice && !isWithinMobileLoginWindow()) {
      const blockedReason = 'Mobile access is only permitted between 10:00 AM and 1:00 PM IST.';
      const auditRecord: LoginHistoryRecord = {
        id: `lh-${crypto.randomUUID()}`,
        userId: user?.id,
        email: user ? user.email : identifier,
        timestamp: new Date().toISOString(),
        browser: browserName,
        os: osName,
        deviceCategory,
        ip: clientIp,
        success: false,
        blockedReason,
      };
      dbStore.loginHistory.unshift(auditRecord);

      return res.status(403).json({
        error: blockedReason,
        code: 'MOBILE_WINDOW_RESTRICTION',
        istCurrentTime: getISTFormattedString(),
        allowedWindow: '10:00 AM – 1:00 PM IST',
      });
    }

    if (!user || !passwordValid) {
      // Record failed login
      const auditRecord: LoginHistoryRecord = {
        id: `lh-${crypto.randomUUID()}`,
        userId: user?.id,
        email: identifier,
        timestamp: new Date().toISOString(),
        browser: browserName,
        os: osName,
        deviceCategory,
        ip: clientIp,
        success: false,
        blockedReason: 'Invalid credentials provided.',
      };
      dbStore.loginHistory.unshift(auditRecord);
      return res.status(401).json({ error: 'Invalid email/phone or password.' });
    }

    // Task 5 Requirement 2: Google Chrome OTP challenge enforcement
    const isChrome = browserName.toLowerCase().includes('chrome');
    if (isChrome) {
      // Create and send OTP challenge
      const otp = generateSecureOTP();
      const hashedOtp = hashOTP(otp);
      const challengeId = `otp-ch-${crypto.randomUUID()}`;

      const challenge: OTPChallenge = {
        id: challengeId,
        userId: user.id,
        emailOrPhone: user.email,
        hashedOtp,
        purpose: 'chrome_login',
        attempts: 0,
        maxAttempts: 3,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
        createdAt: Date.now(),
        metadata: {
          browser: browserName,
          os: osName,
          deviceCategory,
          ip: clientIp,
        },
      };
      dbStore.otpChallenges.set(challengeId, challenge);

      // Send OTP via email
      const sendResult = await emailService.sendOTP(
        user.email,
        otp,
        'Google Chrome Security Login Verification'
      );

      return res.status(200).json({
        chromeOtpRequired: true,
        challengeId,
        maskedEmail: maskEmail(user.email),
        message: 'Google Chrome login detected. For enhanced security, enter the 6-digit OTP sent to your registered email.',
        previewOtp: sendResult.previewOtp,
        isDevPreview: sendResult.mode === 'preview',
      });
    }

    // Direct Login Successful (non-Chrome or desktop within rules)
    const auditRecord: LoginHistoryRecord = {
      id: `lh-${crypto.randomUUID()}`,
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
      browser: browserName,
      os: osName,
      deviceCategory,
      ip: clientIp,
      success: true,
    };
    dbStore.loginHistory.unshift(auditRecord);

    const token = createSessionToken(user.id);
    res.cookie('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 86400000,
    });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        mustChangePassword: !!user.mustChangePassword,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: `Login error: ${error.message}` });
  }
});

/**
 * 3. Verify Google Chrome OTP to complete login
 */
authRouter.post('/verify-chrome-otp', async (req: Request, res: Response) => {
  try {
    const { challengeId, otp } = req.body;
    if (!challengeId || !otp) {
      return res.status(400).json({ error: 'Challenge ID and 6-digit OTP are required.' });
    }

    const challenge = dbStore.otpChallenges.get(challengeId);
    if (!challenge || challenge.purpose !== 'chrome_login') {
      return res.status(400).json({ error: 'Invalid or expired OTP session. Please sign in again.' });
    }

    if (Date.now() > challenge.expiresAt) {
      dbStore.otpChallenges.delete(challengeId);
      return res.status(400).json({ error: 'OTP has expired (valid for 5 minutes). Please sign in again.' });
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      dbStore.otpChallenges.delete(challengeId);
      return res.status(429).json({ error: 'Too many incorrect attempts. Please sign in again.' });
    }

    const hashedInput = hashOTP(otp);
    if (hashedInput !== challenge.hashedOtp) {
      challenge.attempts++;
      const remaining = challenge.maxAttempts - challenge.attempts;
      return res.status(400).json({
        error: `Incorrect OTP. ${remaining} attempt(s) remaining.`,
      });
    }

    // Success: consume challenge
    dbStore.otpChallenges.delete(challengeId);

    const user = dbStore.users.get(challenge.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // Record verified login
    const meta = challenge.metadata || {};
    const auditRecord: LoginHistoryRecord = {
      id: `lh-${crypto.randomUUID()}`,
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
      browser: meta.browser || 'Google Chrome',
      os: meta.os || 'Desktop OS',
      deviceCategory: meta.deviceCategory || 'desktop',
      ip: meta.ip || '127.0.0.1',
      success: true,
    };
    dbStore.loginHistory.unshift(auditRecord);

    const token = createSessionToken(user.id);
    res.cookie('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 86400000,
    });

    return res.status(200).json({
      message: 'Chrome OTP verification successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        mustChangePassword: !!user.mustChangePassword,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: `OTP verification error: ${error.message}` });
  }
});

/**
 * 4. Forgot Password Flow
 * Task 3 Requirements:
 * - Registered email or phone number
 * - Maximum of one reset request per account per rolling 24-hour period
 * - Display EXACT message: "You can use this option only once per day."
 * - Avoid revealing whether an account exists
 * - Cryptographically secure temporary-password generator using uppercase and lowercase letters only,
 *   with NO numbers or special characters!
 * - Require temporary password to be changed at the next login
 * - Secure password hashing
 */
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    if (!identifier || typeof identifier !== 'string') {
      return res.status(400).json({ error: 'Please enter your registered email address or phone number.' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Find account
    let targetUser: User | undefined;
    for (const u of dbStore.users.values()) {
      if (u.email.toLowerCase() === cleanIdentifier || u.phone === identifier.trim()) {
        targetUser = u;
        break;
      }
    }

    // Generic response message to avoid revealing account existence
    const genericSuccessResponse = {
      message: 'If an account is associated with this email or phone number, temporary password instructions have been dispatched.',
    };

    if (!targetUser) {
      // Don't leak account existence
      return res.status(200).json(genericSuccessResponse);
    }

    // Check rolling 24-hour limit
    if (targetUser.lastPasswordResetAt) {
      const lastResetTime = new Date(targetUser.lastPasswordResetAt).getTime();
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      if (Date.now() - lastResetTime < twentyFourHoursMs) {
        // EXACT REQUIRED STRING: "You can use this option only once per day."
        return res.status(429).json({
          error: 'You can use this option only once per day.',
        });
      }
    }

    // Generate temporary password (uppercase and lowercase letters only, no numbers or special characters)
    const tempPassword = generateAlphaOnlyTempPassword(12);

    // Hash the temporary password before storing
    const hashedTemp = await hashPassword(tempPassword);

    targetUser.passwordHash = hashedTemp;
    targetUser.mustChangePassword = true;
    targetUser.lastPasswordResetAt = new Date().toISOString();
    targetUser.updatedAt = new Date().toISOString();

    // Dispatch via email service
    const sendResult = await emailService.sendTemporaryPassword(targetUser.email, tempPassword);

    return res.status(200).json({
      ...genericSuccessResponse,
      previewTempPassword: sendResult.mode === 'preview' ? tempPassword : undefined,
      isDevPreview: sendResult.mode === 'preview',
      credentialsRequiredNotice: 'Production email delivery requires SMTP_HOST, SMTP_USER, SMTP_PASS in .env.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: `Password reset error: ${error.message}` });
  }
});

/**
 * 5. Change Password (required on next login if mustChangePassword is true)
 */
authRouter.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    if (!user.mustChangePassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required.' });
      }
      const isMatch = await comparePassword(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
    }

    const newHash = await hashPassword(newPassword);
    user.passwordHash = newHash;
    user.mustChangePassword = false;
    user.updatedAt = new Date().toISOString();

    return res.status(200).json({ message: 'Password updated successfully. You may continue navigating.' });
  } catch (error: any) {
    return res.status(500).json({ error: `Password update failed: ${error.message}` });
  }
});

/**
 * 6. Task 1: French Language OTP Request
 * Special French security requirement:
 * - When a user selects French, require verification using an OTP sent to their registered email before applying the language change.
 * - Store only hashed OTP values, expire OTPs after 5 minutes, limit verification attempts.
 */
authRouter.post('/language/request-french-otp', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;

    // Generate secure OTP
    const otp = generateSecureOTP();
    const hashedOtp = hashOTP(otp);
    const challengeId = `lang-otp-${crypto.randomUUID()}`;

    const challenge: OTPChallenge = {
      id: challengeId,
      userId: user.id,
      emailOrPhone: user.email,
      hashedOtp,
      purpose: 'french_lang',
      attempts: 0,
      maxAttempts: 3,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      createdAt: Date.now(),
    };

    dbStore.otpChallenges.set(challengeId, challenge);

    const sendResult = await emailService.sendOTP(
      user.email,
      otp,
      'French Internationalization Security Verification'
    );

    return res.status(200).json({
      message: 'French language verification code sent to your registered email.',
      challengeId,
      maskedEmail: maskEmail(user.email),
      previewOtp: sendResult.previewOtp,
      isDevPreview: sendResult.mode === 'preview',
      credentialsRequiredNotice: 'Production email delivery requires SMTP credentials in .env.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: `Failed to dispatch French OTP: ${error.message}` });
  }
});

/**
 * 7. Task 1: French Language OTP Verification
 */
authRouter.post('/language/verify-french-otp', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const { challengeId, otp } = req.body;

    if (!challengeId || !otp) {
      return res.status(400).json({ error: 'Challenge ID and 6-digit OTP are required.' });
    }

    const challenge = dbStore.otpChallenges.get(challengeId);
    if (!challenge || challenge.purpose !== 'french_lang' || challenge.userId !== user.id) {
      return res.status(400).json({ error: 'Invalid or expired OTP challenge.' });
    }

    if (Date.now() > challenge.expiresAt) {
      dbStore.otpChallenges.delete(challengeId);
      return res.status(400).json({ error: 'Verification code expired (valid for 5 minutes). Please request a new one.' });
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      dbStore.otpChallenges.delete(challengeId);
      return res.status(429).json({ error: 'Too many failed verification attempts. Please request a new code.' });
    }

    const hashedInput = hashOTP(otp);
    if (hashedInput !== challenge.hashedOtp) {
      challenge.attempts++;
      const remaining = challenge.maxAttempts - challenge.attempts;
      return res.status(400).json({
        error: `Invalid verification code. ${remaining} attempt(s) remaining.`,
      });
    }

    // Success: consume challenge and apply French language
    dbStore.otpChallenges.delete(challengeId);
    user.preferredLanguage = 'fr';
    user.updatedAt = new Date().toISOString();

    return res.status(200).json({
      message: 'French language verified and activated successfully.',
      language: 'fr',
    });
  } catch (error: any) {
    return res.status(500).json({ error: `French verification failed: ${error.message}` });
  }
});

/**
 * 8. Switch other languages without OTP
 */
authRouter.post('/language/set', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const { language } = req.body;

    if (!['en', 'es', 'hi', 'pt', 'zh'].includes(language)) {
      return res.status(400).json({
        error: 'Invalid language or French was requested without OTP verification.',
      });
    }

    user.preferredLanguage = language;
    user.updatedAt = new Date().toISOString();

    return res.status(200).json({ message: 'Language updated successfully.', language });
  } catch (error: any) {
    return res.status(500).json({ error: `Failed to update language: ${error.message}` });
  }
});

/**
 * 9. Get Authenticated User Profile & Login History
 */
authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const profile = dbStore.profiles.get(user.id);
  const subscription = dbStore.subscriptions.get(user.id);

  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      mustChangePassword: !!user.mustChangePassword,
    },
    profile,
    subscription,
  });
});

/**
 * 10. Get User's Isolated Login History
 * Task 5 Requirement: Authenticated user can ONLY view their own records!
 */
authRouter.get('/login-history', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  // Strictly isolate: filter records matching this user's ID or email
  const records = dbStore.loginHistory.filter(
    (r) => r.userId === user.id || r.email.toLowerCase() === user.email.toLowerCase()
  );
  return res.status(200).json({ history: records });
});

/**
 * 11. Update Profile Information
 */
authRouter.put('/profile', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { headline, bio, location, education, skills, experience, certifications, avatarUrl } = req.body;

  let profile = dbStore.profiles.get(user.id);
  if (!profile) {
    profile = {
      userId: user.id,
      headline: '',
      bio: '',
      avatarUrl: '',
      location: '',
      education: [],
      skills: [],
      experience: [],
      certifications: [],
    };
  }

  if (headline !== undefined) profile.headline = headline;
  if (bio !== undefined) profile.bio = bio;
  if (location !== undefined) profile.location = location;
  if (education !== undefined) profile.education = education;
  if (skills !== undefined) profile.skills = skills;
  if (experience !== undefined) profile.experience = experience;
  if (certifications !== undefined) profile.certifications = certifications;
  if (avatarUrl !== undefined) profile.avatarUrl = avatarUrl;

  dbStore.profiles.set(user.id, profile);
  return res.status(200).json({ message: 'Profile updated successfully', profile });
});
