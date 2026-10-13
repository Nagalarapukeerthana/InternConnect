import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { dbStore, Application, User } from '../store.js';
import { requireAuth } from './auth.js';

export const internshipsRouter = Router();

/**
 * 1. List internships with search and filters
 */
internshipsRouter.get('/', (req: Request, res: Response) => {
  const { category, search, remote, minStipend } = req.query;

  let results = Array.from(dbStore.internships.values());

  if (category && typeof category === 'string' && category !== 'All') {
    results = results.filter((item) =>
      item.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  if (remote === 'true') {
    results = results.filter((item) => item.isRemote);
  }

  if (minStipend) {
    const min = parseInt(minStipend as string, 10);
    if (!isNaN(min)) {
      results = results.filter((item) => item.stipend >= min);
    }
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    results = results.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.requirements.some((r) => r.toLowerCase().includes(q))
    );
  }

  return res.status(200).json({ internships: results, total: results.length });
});

/**
 * 2. Get internship details
 */
internshipsRouter.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const internship = dbStore.internships.get(id);
  if (!internship) {
    return res.status(404).json({ error: 'Internship opportunity not found.' });
  }
  return res.status(200).json({ internship });
});

/**
 * 3. Apply to an internship (enforces subscription allowance strictly on server)
 */
internshipsRouter.post('/:id/apply', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const { id: internshipId } = req.params;
    const { resumeId, coverLetter } = req.body;

    const internship = dbStore.internships.get(internshipId);
    if (!internship) {
      return res.status(404).json({ error: 'Internship not found.' });
    }

    if (!resumeId) {
      return res.status(400).json({ error: 'A saved resume is required to apply. Please create a resume first.' });
    }

    // Verify resume exists and belongs to the user
    const resume = dbStore.resumes.get(resumeId);
    if (!resume || resume.userId !== user.id) {
      return res.status(400).json({ error: 'Invalid resume selected.' });
    }

    // Check if already applied
    for (const app of dbStore.applications.values()) {
      if (app.internshipId === internshipId && app.studentId === user.id) {
        return res.status(400).json({ error: 'You have already applied to this internship.' });
      }
    }

    // Task 6 Requirement: Enforce subscription application quota server-side
    let subscription = dbStore.subscriptions.get(user.id);
    if (!subscription) {
      // Create free tier if none
      subscription = {
        userId: user.id,
        planId: 'free',
        monthlyPrice: 0,
        monthlyAllowance: 1,
        applicationsUsed: 0,
        cycleStartDate: new Date().toISOString(),
        cycleEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        status: 'active',
        updatedAt: new Date().toISOString(),
      };
      dbStore.subscriptions.set(user.id, subscription);
    }

    // Check allowance (monthlyAllowance = -1 means Gold unlimited)
    if (subscription.monthlyAllowance !== -1) {
      if (subscription.applicationsUsed >= subscription.monthlyAllowance) {
        return res.status(403).json({
          error: `Monthly application quota reached (${subscription.applicationsUsed}/${subscription.monthlyAllowance} used). Please upgrade your subscription plan to apply.`,
          code: 'APPLICATION_QUOTA_EXCEEDED',
          applicationsUsed: subscription.applicationsUsed,
          monthlyAllowance: subscription.monthlyAllowance,
        });
      }
    }

    // Increment usage
    subscription.applicationsUsed++;
    subscription.updatedAt = new Date().toISOString();

    const applicationId = `app-${crypto.randomUUID()}`;
    const newApplication: Application = {
      id: applicationId,
      internshipId,
      studentId: user.id,
      studentName: user.fullName,
      studentEmail: user.email,
      resumeId,
      coverLetter: coverLetter || '',
      status: 'applied',
      submittedAt: new Date().toISOString(),
    };

    dbStore.applications.set(applicationId, newApplication);

    return res.status(201).json({
      message: 'Application submitted successfully!',
      application: newApplication,
      remainingQuota:
        subscription.monthlyAllowance === -1
          ? 'Unlimited'
          : subscription.monthlyAllowance - subscription.applicationsUsed,
    });
  } catch (error: any) {
    return res.status(500).json({ error: `Application submission failed: ${error.message}` });
  }
});

/**
 * 4. Get authenticated student's applications
 */
internshipsRouter.get('/student/my-applications', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const userApps = Array.from(dbStore.applications.values())
    .filter((a) => a.studentId === user.id)
    .map((app) => {
      const internship = dbStore.internships.get(app.internshipId);
      return {
        ...app,
        internshipTitle: internship?.title || 'Unknown Internship',
        companyName: internship?.companyName || 'Unknown Company',
        location: internship?.location || '',
        stipend: internship?.stipend || 0,
      };
    });

  return res.status(200).json({ applications: userApps });
});
