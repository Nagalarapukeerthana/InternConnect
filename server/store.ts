/**
 * InternConnect Database Store Adapter
 * Provides persistent transactional data models with in-memory fallback
 * and full Firestore schema compatibility.
 */

import { getISTTime } from './timeUtils.js';

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  passwordHash: string;
  role: 'student' | 'employer' | 'admin';
  preferredLanguage: string;
  mustChangePassword?: boolean;
  lastPasswordResetAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  userId: string;
  headline: string;
  bio: string;
  avatarUrl: string;
  location: string;
  education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startYear: string;
    endYear: string;
    grade?: string;
  }>;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
    description: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    issueDate: string;
    credentialId?: string;
  }>;
}

export interface Internship {
  id: string;
  title: string;
  companyName: string;
  companyLogo: string;
  location: string;
  isRemote: boolean;
  category: string;
  stipend: number;
  stipendPeriod: 'month' | 'lump-sum' | 'unpaid';
  duration: string;
  deadline: string;
  description: string;
  requirements: string[];
  perks: string[];
  openings: number;
  status: 'active' | 'closed';
  createdAt: string;
}

export interface Application {
  id: string;
  internshipId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  resumeId: string;
  coverLetter: string;
  status: 'applied' | 'under_review' | 'shortlisted' | 'rejected' | 'accepted';
  submittedAt: string;
}

export interface ResumeData {
  id: string;
  userId: string;
  title: string;
  content: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
    photoUrl?: string;
    education: Array<{
      degree: string;
      institution: string;
      year: string;
      score: string;
    }>;
    skills: string[];
    experience: Array<{
      role: string;
      organization: string;
      duration: string;
      details: string;
    }>;
    projects: Array<{
      title: string;
      description: string;
      technologies: string;
    }>;
    certifications: Array<{
      name: string;
      authority: string;
      year: string;
    }>;
  };
  paymentVerified: boolean;
  paymentTransactionId?: string;
  amountPaid: number;
  createdAt: string;
  updatedAt: string;
}

export interface OTPChallenge {
  id: string;
  userId?: string;
  emailOrPhone: string;
  hashedOtp: string;
  purpose: 'french_lang' | 'resume_payment' | 'chrome_login' | 'reset_password';
  attempts: number;
  maxAttempts: number;
  expiresAt: number; // timestamp in ms
  createdAt: number;
  metadata?: Record<string, any>;
}

export interface LoginHistoryRecord {
  id: string;
  userId?: string;
  email: string;
  timestamp: string;
  browser: string;
  os: string;
  deviceCategory: 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'unknown';
  ip: string;
  success: boolean;
  blockedReason?: string;
}

export interface Friendship {
  id: string;
  userA: string;
  userB: string;
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  respondedAt?: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'none';
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  likedBy: string[]; // user IDs
  createdAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

export interface Subscription {
  userId: string;
  planId: 'free' | 'bronze' | 'silver' | 'gold';
  monthlyPrice: number;
  monthlyAllowance: number; // -1 for unlimited (gold)
  applicationsUsed: number;
  cycleStartDate: string;
  cycleEndDate: string;
  status: 'active' | 'cancelled' | 'expired';
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  userEmail: string;
  userName: string;
  planId: string;
  planName: string;
  amountPaid: number;
  currency: string;
  transactionReference: string;
  subscriptionPeriodStart: string;
  subscriptionPeriodEnd: string;
  status: 'paid' | 'refunded';
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  purpose: 'resume' | 'subscription';
  orderId: string;
  paymentId?: string;
  amount: number;
  status: 'created' | 'verified' | 'failed';
  signatureVerified: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

// In-Memory Database store with pre-seeded data
class MemoryStore {
  users: Map<string, User> = new Map();
  profiles: Map<string, UserProfile> = new Map();
  internships: Map<string, Internship> = new Map();
  applications: Map<string, Application> = new Map();
  resumes: Map<string, ResumeData> = new Map();
  otpChallenges: Map<string, OTPChallenge> = new Map();
  loginHistory: LoginHistoryRecord[] = [];
  friendships: Map<string, Friendship> = new Map();
  friendRequests: Map<string, FriendRequest> = new Map();
  posts: Map<string, CommunityPost> = new Map();
  comments: Map<string, PostComment> = new Map();
  subscriptions: Map<string, Subscription> = new Map();
  invoices: Map<string, Invoice> = new Map();
  payments: Map<string, PaymentRecord> = new Map();
  processedWebhookEvents: Set<string> = new Set();

  constructor() {
    this.seedInternships();
    this.seedMockCommunityAndUsers();
  }

  private seedInternships() {
    const list: Internship[] = [
      {
        id: 'int-1',
        title: 'Full Stack Web Developer Intern',
        companyName: 'CloudNext Technologies',
        companyLogo: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=120&auto=format&fit=crop&q=80',
        location: 'Bengaluru, India (Remote Available)',
        isRemote: true,
        category: 'Software Engineering',
        stipend: 25000,
        stipendPeriod: 'month',
        duration: '6 Months',
        deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
        description: 'Join our agile core engineering team building scalable microservices and responsive React interfaces. Gain production experience with TypeScript, Node.js, and Cloud Infrastructure.',
        requirements: ['Proficiency in React and TypeScript', 'Understanding of RESTful APIs', 'Familiarity with Git and Modern CSS frameworks', 'Good communication skills'],
        perks: ['Certificate of Completion', 'Letter of Recommendation', 'Flexible working hours', 'Pre-Placement Offer (PPO) opportunity'],
        openings: 5,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'int-2',
        title: 'Frontend UI/UX Engineering Intern',
        companyName: 'DesignCraft Studio',
        companyLogo: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=120&auto=format&fit=crop&q=80',
        location: 'Hyderabad, India',
        isRemote: false,
        category: 'UI/UX Design',
        stipend: 20000,
        stipendPeriod: 'month',
        duration: '3 Months',
        deadline: new Date(Date.now() + 20 * 86400000).toISOString(),
        description: 'Work directly alongside senior product designers to convert high-fidelity Figma components into high-performance accessible React animations.',
        requirements: ['HTML5, CSS3, Tailwind CSS', 'Basic experience with Figma', 'Creative aesthetic mindset', 'Attention to typography and design systems'],
        perks: ['Mentorship from design leads', 'Free meals and snacks', 'Certificate and performance bonus'],
        openings: 3,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'int-3',
        title: 'Data Science & Machine Learning Intern',
        companyName: 'Nexus AI Solutions',
        companyLogo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=120&auto=format&fit=crop&q=80',
        location: 'Mumbai, India (Hybrid)',
        isRemote: true,
        category: 'Data Science',
        stipend: 30000,
        stipendPeriod: 'month',
        duration: '6 Months',
        deadline: new Date(Date.now() + 25 * 86400000).toISOString(),
        description: 'Develop data analysis pipelines, exploratory data visualizations, and predictive models using Python, Pandas, and GenAI LLM fine-tuning techniques.',
        requirements: ['Python, NumPy, Pandas, Scikit-Learn', 'Basic SQL queries', 'Strong linear algebra and statistical foundations'],
        perks: ['Access to high-compute GPU clusters', 'Research publication co-authorship', 'Informal dress code'],
        openings: 2,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'int-4',
        title: 'Backend Systems & API Intern',
        companyName: 'FinServe Digital',
        companyLogo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
        location: 'Pune, India',
        isRemote: false,
        category: 'Backend Development',
        stipend: 22000,
        stipendPeriod: 'month',
        duration: '4 Months',
        deadline: new Date(Date.now() + 18 * 86400000).toISOString(),
        description: 'Build secure transaction processing workflows, webhooks, and distributed queuing mechanisms with Express and PostgreSQL.',
        requirements: ['Node.js & Express or Python Django', 'Understanding of relational databases', 'Basic knowledge of security principles & authentication'],
        perks: ['Certificate', 'Pre-Placement Offer (PPO)', 'Sponsored professional certifications'],
        openings: 4,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'int-5',
        title: 'Cybersecurity Analyst Intern',
        companyName: 'Vigilance Cyber Defense',
        companyLogo: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=120&auto=format&fit=crop&q=80',
        location: 'Remote',
        isRemote: true,
        category: 'Cybersecurity',
        stipend: 28000,
        stipendPeriod: 'month',
        duration: '6 Months',
        deadline: new Date(Date.now() + 40 * 86400000).toISOString(),
        description: 'Assist in vulnerability assessment, OWASP Top 10 web application testing, and log analysis for enterprise web services.',
        requirements: ['Knowledge of TCP/IP and Network Protocols', 'OWASP Top 10 vulnerabilities comprehension', 'Familiarity with Wireshark and Burp Suite'],
        perks: ['Hands-on red team labs', 'Certificate of Merit', 'Global conference sponsorship'],
        openings: 2,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'int-6',
        title: 'Digital Marketing & Growth Hacker Intern',
        companyName: 'Elevate Brand Marketing',
        companyLogo: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=120&auto=format&fit=crop&q=80',
        location: 'Delhi NCR, India',
        isRemote: false,
        category: 'Marketing',
        stipend: 18000,
        stipendPeriod: 'month',
        duration: '3 Months',
        deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
        description: 'Drive multi-channel acquisition campaigns, SEO optimization, technical content drafting, and social engagement strategy.',
        requirements: ['Strong written English', 'Basic Google Analytics and SEO understanding', 'Enthusiastic and self-driven personality'],
        perks: ['Certificate', 'Letter of Recommendation', 'Performance incentives'],
        openings: 3,
        status: 'active',
        createdAt: new Date().toISOString(),
      }
    ];

    list.forEach((item) => this.internships.set(item.id, item));
  }

  private seedMockCommunityAndUsers() {
    // Seed test employer / student demo accounts
    const testUserId = 'user-demo-student';
    const testUser: User = {
      id: testUserId,
      email: 'student@internconnect.com',
      phone: '+91 9876543210',
      fullName: 'Aarav Sharma',
      passwordHash: '$2b$10$PdPVHN4oi.UA4kNDzMjWz.ck2XEKubXo7vkXcNCgkNIvj4JTB3pfG', // Hash for 'StudentPass123!'
      role: 'student',
      preferredLanguage: 'en',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(testUserId, testUser);

    this.profiles.set(testUserId, {
      userId: testUserId,
      headline: 'Computer Science Undergraduate | Full Stack Aspirant',
      bio: 'Enthusiastic developer who loves building web applications with React, TypeScript, and Node.js. Looking for summer internships.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      location: 'Bengaluru, India',
      education: [
        {
          institution: 'National Institute of Technology',
          degree: 'B.Tech in Computer Science',
          fieldOfStudy: 'Computer Science',
          startYear: '2022',
          endYear: '2026',
          grade: '8.8 CGPA',
        },
      ],
      skills: ['React', 'TypeScript', 'Node.js', 'Express', 'Tailwind CSS', 'PostgreSQL', 'Git'],
      experience: [],
      certifications: [
        {
          name: 'ElevanceSkills Full Stack Internship Track',
          issuer: 'ElevanceSkills',
          issueDate: '2025',
        },
      ],
    });

    // Default Free subscription for Aarav (1 allowance)
    this.subscriptions.set(testUserId, {
      userId: testUserId,
      planId: 'free',
      monthlyPrice: 0,
      monthlyAllowance: 1,
      applicationsUsed: 0,
      cycleStartDate: new Date().toISOString(),
      cycleEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      status: 'active',
      updatedAt: new Date().toISOString(),
    });

    // Seed mock peers for friends testing
    const peer1: User = {
      id: 'peer-priya',
      email: 'priya.n@example.com',
      phone: '+91 9822334455',
      fullName: 'Priya Nair',
      passwordHash: '',
      role: 'student',
      preferredLanguage: 'en',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const peer2: User = {
      id: 'peer-rohit',
      email: 'rohit.v@example.com',
      phone: '+91 9811223344',
      fullName: 'Rohit Verma',
      passwordHash: '',
      role: 'student',
      preferredLanguage: 'en',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(peer1.id, peer1);
    this.users.set(peer2.id, peer2);

    this.profiles.set(peer1.id, {
      userId: peer1.id,
      headline: 'UI/UX Enthusiast & Frontend Builder',
      bio: 'Loves creating delightful user experiences.',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      location: 'Pune, India',
      education: [],
      skills: ['Figma', 'React', 'CSS'],
      experience: [],
      certifications: [],
    });

    this.profiles.set(peer2.id, {
      userId: peer2.id,
      headline: 'Data Science & Python Explorer',
      bio: 'Analyzing large datasets and predictive pipelines.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      location: 'Delhi, India',
      education: [],
      skills: ['Python', 'SQL', 'Pandas'],
      experience: [],
      certifications: [],
    });

    // Add 1 friendship between testUserId and peer1 so default friends = 1
    const friendship1: Friendship = {
      id: `fr-${testUserId}-${peer1.id}`,
      userA: testUserId,
      userB: peer1.id,
      createdAt: new Date().toISOString(),
    };
    this.friendships.set(friendship1.id, friendship1);

    // Seed mock community posts
    const post1: CommunityPost = {
      id: 'post-1',
      authorId: peer1.id,
      authorName: peer1.fullName,
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      content: 'Just wrapped up my first week of the ElevanceSkills Full Stack Internship! Learned how to wire up secure REST endpoints and configure internationalization with strict validation.',
      mediaUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
      mediaType: 'image',
      likesCount: 12,
      commentsCount: 2,
      sharesCount: 1,
      likedBy: [testUserId],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    };

    const post2: CommunityPost = {
      id: 'post-2',
      authorId: peer2.id,
      authorName: peer2.fullName,
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      content: 'Tip for all internship applicants: Customize your resume projects to match the job requirements! It increased my shortlist rate tremendously.',
      mediaType: 'none',
      likesCount: 8,
      commentsCount: 1,
      sharesCount: 0,
      likedBy: [],
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    };

    this.posts.set(post1.id, post1);
    this.posts.set(post2.id, post2);

    this.comments.set('comm-1', {
      id: 'comm-1',
      postId: post1.id,
      authorId: testUserId,
      authorName: testUser.fullName,
      content: 'Super inspiring, Priya! Keep up the great work!',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    });
  }

  // Helper to count accepted friendships for a user
  getAcceptedFriendCount(userId: string): number {
    let count = 0;
    for (const f of this.friendships.values()) {
      if (f.userA === userId || f.userB === userId) {
        count++;
      }
    }
    return count;
  }

  // Count posts created today in IST for a user
  getPostsCreatedToday(userId: string): number {
    const nowIST = getISTTime(new Date());
    let count = 0;
    for (const post of this.posts.values()) {
      if (post.authorId === userId) {
        const postDate = new Date(post.createdAt);
        const postIST = getISTTime(postDate);
        if (postIST.dateString === nowIST.dateString) {
          count++;
        }
      }
    }
    return count;
  }

  // Get daily posting limit for a user based on friend count
  getDailyPostLimit(userId: string, configured3To10Limit: number = 1): {
    friendCount: number;
    dailyLimit: number; // -1 indicates unlimited
    postsToday: number;
    canPost: boolean;
    reason?: string;
  } {
    const friendCount = this.getAcceptedFriendCount(userId);
    const postsToday = this.getPostsCreatedToday(userId);

    let dailyLimit = 0;
    if (friendCount === 0) {
      dailyLimit = 0;
    } else if (friendCount === 1) {
      dailyLimit = 1;
    } else if (friendCount === 2) {
      dailyLimit = 2;
    } else if (friendCount > 10) {
      dailyLimit = -1; // Unlimited
    } else {
      // 3 to 10 friends: configurable limit, defaulting to 1
      dailyLimit = configured3To10Limit;
    }

    const canPost = dailyLimit === -1 ? true : postsToday < dailyLimit;

    let reason: string | undefined;
    if (!canPost) {
      if (friendCount === 0) {
        reason = 'Users with 0 friends cannot post. Connect with friends to start sharing.';
      } else {
        reason = `Daily post limit reached (${postsToday}/${dailyLimit} used today based on your ${friendCount} friends).`;
      }
    }

    return {
      friendCount,
      dailyLimit,
      postsToday,
      canPost,
      reason,
    };
  }
}

export const dbStore = new MemoryStore();
