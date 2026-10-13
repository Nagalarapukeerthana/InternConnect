import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { dbStore, CommunityPost, PostComment, Friendship, FriendRequest, User } from '../store.js';
import { requireAuth } from './auth.js';

export const communityRouter = Router();

// Configurable limit for 3 to 10 friends (default: 1)
const CONFIGURED_3_TO_10_LIMIT = process.env.POST_LIMIT_3_TO_10_FRIENDS
  ? parseInt(process.env.POST_LIMIT_3_TO_10_FRIENDS, 10)
  : 1;

/**
 * 1. Get user's posting permission status and friend count
 */
communityRouter.get('/status', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const status = dbStore.getDailyPostLimit(user.id, CONFIGURED_3_TO_10_LIMIT);
  return res.status(200).json(status);
});

/**
 * 2. Get Community Feed Posts (with pagination)
 */
communityRouter.get('/posts', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  const allPosts = Array.from(dbStore.posts.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const startIndex = (page - 1) * limit;
  const paginated = allPosts.slice(startIndex, startIndex + limit).map((post) => ({
    ...post,
    isLiked: post.likedBy?.includes(user.id),
  }));

  return res.status(200).json({
    posts: paginated,
    page,
    limit,
    total: allPosts.length,
    hasMore: startIndex + limit < allPosts.length,
  });
});

/**
 * 3. Create a community post
 * Strictly enforces server-side atomic daily posting limits based on friend count:
 * - 0 friends: 0 posts/day
 * - 1 friend: 1 post/day
 * - 2 friends: 2 posts/day
 * - 3 to 10 friends: default 1 post/day (configured)
 * - > 10 friends: unlimited
 */
communityRouter.post('/posts', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const { content, mediaUrl, mediaType = 'none' } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content cannot be empty.' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: 'Post content exceeds the 2,000 character maximum limit.' });
    }

    // Atomic server-side limit check
    const status = dbStore.getDailyPostLimit(user.id, CONFIGURED_3_TO_10_LIMIT);

    if (!status.canPost) {
      return res.status(403).json({
        error: status.reason || 'You have reached your daily post limit.',
        code: 'DAILY_POST_LIMIT_EXCEEDED',
        friendCount: status.friendCount,
        dailyLimit: status.dailyLimit,
        postsToday: status.postsToday,
      });
    }

    const postId = `post-${crypto.randomUUID()}`;
    const userProfile = dbStore.profiles.get(user.id);

    const newPost: CommunityPost = {
      id: postId,
      authorId: user.id,
      authorName: user.fullName,
      authorAvatar: userProfile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName)}`,
      content: content.trim(),
      mediaUrl: mediaUrl || undefined,
      mediaType: ['image', 'video'].includes(mediaType) ? mediaType : 'none',
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      likedBy: [],
      createdAt: new Date().toISOString(),
    };

    dbStore.posts.set(postId, newPost);

    const updatedStatus = dbStore.getDailyPostLimit(user.id, CONFIGURED_3_TO_10_LIMIT);

    return res.status(201).json({
      message: 'Post published successfully!',
      post: { ...newPost, isLiked: false },
      updatedStatus,
    });
  } catch (error: any) {
    return res.status(500).json({ error: `Failed to create post: ${error.message}` });
  }
});

/**
 * 4. Like / Unlike Post
 */
communityRouter.post('/posts/:id/like', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const post = dbStore.posts.get(id);

  if (!post) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  if (!post.likedBy) post.likedBy = [];

  const index = post.likedBy.indexOf(user.id);
  let isLiked = false;
  if (index === -1) {
    post.likedBy.push(user.id);
    post.likesCount++;
    isLiked = true;
  } else {
    post.likedBy.splice(index, 1);
    post.likesCount = Math.max(0, post.likesCount - 1);
    isLiked = false;
  }

  return res.status(200).json({
    likesCount: post.likesCount,
    isLiked,
  });
});

/**
 * 5. Add Comment to Post
 */
communityRouter.post('/posts/:id/comment', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const { content } = req.body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Comment text cannot be empty.' });
  }

  const post = dbStore.posts.get(id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  const commentId = `comm-${crypto.randomUUID()}`;
  const userProfile = dbStore.profiles.get(user.id);

  const comment: PostComment = {
    id: commentId,
    postId: id,
    authorId: user.id,
    authorName: user.fullName,
    authorAvatar: userProfile?.avatarUrl,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  dbStore.comments.set(commentId, comment);
  post.commentsCount = (post.commentsCount || 0) + 1;

  return res.status(201).json({ comment, commentsCount: post.commentsCount });
});

/**
 * 6. Get comments for a post
 */
communityRouter.get('/posts/:id/comments', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const postComments = Array.from(dbStore.comments.values())
    .filter((c) => c.postId === id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return res.status(200).json({ comments: postComments });
});

/**
 * 7. Share Post
 */
communityRouter.post('/posts/:id/share', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const post = dbStore.posts.get(id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found.' });
  }
  post.sharesCount = (post.sharesCount || 0) + 1;
  return res.status(200).json({ sharesCount: post.sharesCount });
});

/**
 * 8. List Accepted Friends for Authenticated User
 */
communityRouter.get('/friends', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const friends: Array<{ id: string; fullName: string; email: string; avatarUrl?: string; headline?: string }> = [];

  for (const f of dbStore.friendships.values()) {
    let friendId: string | null = null;
    if (f.userA === user.id) friendId = f.userB;
    else if (f.userB === user.id) friendId = f.userA;

    if (friendId) {
      const friendUser = dbStore.users.get(friendId);
      const friendProfile = dbStore.profiles.get(friendId);
      if (friendUser) {
        friends.push({
          id: friendUser.id,
          fullName: friendUser.fullName,
          email: friendUser.email,
          avatarUrl: friendProfile?.avatarUrl,
          headline: friendProfile?.headline,
        });
      }
    }
  }

  return res.status(200).json({ friends, count: friends.length });
});

/**
 * 9. List Discoverable Users to Connect With
 */
communityRouter.get('/discover', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const currentFriendIds = new Set<string>();

  for (const f of dbStore.friendships.values()) {
    if (f.userA === user.id) currentFriendIds.add(f.userB);
    if (f.userB === user.id) currentFriendIds.add(f.userA);
  }

  const discoverable = Array.from(dbStore.users.values())
    .filter((u) => u.id !== user.id && !currentFriendIds.has(u.id))
    .map((u) => {
      const profile = dbStore.profiles.get(u.id);
      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        headline: profile?.headline || 'InternConnect Student',
        avatarUrl: profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName)}`,
      };
    });

  return res.status(200).json({ users: discoverable });
});

/**
 * 10. Send Friend Request
 */
communityRouter.post('/friend-requests/send', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { targetUserId } = req.body;

  if (!targetUserId || targetUserId === user.id) {
    return res.status(400).json({ error: 'Invalid target user specified.' });
  }

  const targetUser = dbStore.users.get(targetUserId);
  if (!targetUser) {
    return res.status(404).json({ error: 'Target user does not exist.' });
  }

  // Check if friendship already exists
  for (const f of dbStore.friendships.values()) {
    if (
      (f.userA === user.id && f.userB === targetUserId) ||
      (f.userA === targetUserId && f.userB === user.id)
    ) {
      return res.status(400).json({ error: 'You are already connected as friends.' });
    }
  }

  // Check if pending request exists
  for (const r of dbStore.friendRequests.values()) {
    if (
      r.status === 'pending' &&
      ((r.fromUserId === user.id && r.toUserId === targetUserId) ||
        (r.fromUserId === targetUserId && r.toUserId === user.id))
    ) {
      return res.status(400).json({ error: 'A pending friend request already exists between you.' });
    }
  }

  const requestId = `req-${crypto.randomUUID()}`;
  const newRequest: FriendRequest = {
    id: requestId,
    fromUserId: user.id,
    toUserId: targetUserId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  dbStore.friendRequests.set(requestId, newRequest);

  return res.status(201).json({ message: 'Friend request sent successfully!', request: newRequest });
});

/**
 * 11. Respond to Friend Request (Accept / Decline)
 */
communityRouter.post('/friend-requests/:id/respond', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const { action } = req.body; // 'accept' | 'decline'

  const request = dbStore.friendRequests.get(id);
  if (!request || request.toUserId !== user.id || request.status !== 'pending') {
    return res.status(404).json({ error: 'Pending friend request not found or unauthorized.' });
  }

  if (action === 'accept') {
    request.status = 'accepted';
    request.respondedAt = new Date().toISOString();

    const friendshipId = `fr-${request.fromUserId}-${request.toUserId}`;
    const friendship: Friendship = {
      id: friendshipId,
      userA: request.fromUserId,
      userB: request.toUserId,
      createdAt: new Date().toISOString(),
    };
    dbStore.friendships.set(friendshipId, friendship);

    return res.status(200).json({ message: 'Friend request accepted! Your posting allowance has increased.' });
  } else if (action === 'decline') {
    request.status = 'declined';
    request.respondedAt = new Date().toISOString();
    return res.status(200).json({ message: 'Friend request declined.' });
  }

  return res.status(400).json({ error: 'Invalid action. Must be accept or decline.' });
});

/**
 * 12. Instant Connect Helper (useful for interactive testing so user can test posting limits easily)
 */
communityRouter.post('/instant-connect', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { targetUserId } = req.body;

  if (!targetUserId || targetUserId === user.id) {
    return res.status(400).json({ error: 'Invalid target user.' });
  }

  const friendshipId = `fr-${user.id}-${targetUserId}`;
  const friendship: Friendship = {
    id: friendshipId,
    userA: user.id,
    userB: targetUserId,
    createdAt: new Date().toISOString(),
  };
  dbStore.friendships.set(friendshipId, friendship);

  const updatedStatus = dbStore.getDailyPostLimit(user.id, CONFIGURED_3_TO_10_LIMIT);

  return res.status(200).json({
    message: 'Friend connected successfully!',
    status: updatedStatus,
  });
});
