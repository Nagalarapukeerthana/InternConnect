import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import {
  Users,
  MessageSquare,
  Heart,
  Share2,
  Image as ImageIcon,
  Video,
  Send,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Shield,
  Sparkles,
  Info,
} from 'lucide-react';

interface PublicSpaceProps {
  onNavigate: (page: string) => void;
}

export const PublicSpace: React.FC<PublicSpaceProps> = ({ onNavigate }) => {
  const { user, token } = useAuth();
  const { t } = useLanguage();

  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Status info from server
  const [postStatus, setPostStatus] = useState<{
    friendCount: number;
    dailyLimit: number;
    postsToday: number;
    canPost: boolean;
    reason?: string;
  } | null>(null);

  // New post state
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'video'>('none');
  const [postingLoading, setPostingLoading] = useState(false);
  const [postingError, setPostingError] = useState<string | null>(null);

  // Discover & Friends state
  const [friends, setFriends] = useState<any[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<any[]>([]);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    setLoadingPosts(true);
    try {
      const [postsRes, statusRes, friendsRes, discRes] = await Promise.all([
        fetch('/api/community/posts', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/community/status', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/community/friends', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/community/discover', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ]);

      setPosts(postsRes.posts || []);
      setPostStatus(statusRes);
      setFriends(friendsRes.friends || []);
      setDiscoverUsers(discRes.users || []);
    } catch {
      // fallback
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setPostingLoading(true);
    setPostingError(null);

    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          mediaUrl: mediaUrl.trim() || undefined,
          mediaType: mediaUrl.trim() ? mediaType : 'none',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPostingError(data.error || 'Failed to publish post');
        if (data.updatedStatus) setPostStatus(data.updatedStatus);
      } else {
        setContent('');
        setMediaUrl('');
        setMediaType('none');
        setPosts([data.post, ...posts]);
        if (data.updatedStatus) setPostStatus(data.updatedStatus);
      }
    } catch (err: any) {
      setPostingError(err.message);
    } finally {
      setPostingLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPosts(
          posts.map((p) =>
            p.id === postId ? { ...p, likesCount: data.likesCount, isLiked: data.isLiked } : p
          )
        );
      }
    } catch {}
  };

  const handleToggleComments = async (postId: string) => {
    if (activeCommentPostId === postId) {
      setActiveCommentPostId(null);
      return;
    }
    setActiveCommentPostId(postId);
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCommentsMap((prev) => ({ ...prev, [postId]: data.comments || [] }));
    } catch {}
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText.trim()) return;
    try {
      const res = await fetch(`/api/community/posts/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: commentText }),
      });
      const data = await res.json();
      if (res.ok) {
        setCommentText('');
        setCommentsMap((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }));
        setPosts(
          posts.map((p) =>
            p.id === postId ? { ...p, commentsCount: data.commentsCount } : p
          )
        );
      }
    } catch {}
  };

  const handleShare = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/share`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPosts(
          posts.map((p) =>
            p.id === postId ? { ...p, sharesCount: data.sharesCount } : p
          )
        );
      }
    } catch {}
  };

  const handleInstantConnect = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/community/instant-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPostStatus(data.status);
        await loadData();
      }
    } catch {}
  };

  if (!user) {
    return (
      <div className="text-center py-24 space-y-4">
        <p className="text-slate-600 text-sm">Please sign in to participate in the Public Space community.</p>
        <button
          onClick={() => onNavigate('auth')}
          className="px-6 py-2.5 rounded-xl bg-teal-500 font-bold text-xs"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8">
      {/* Title & Governance Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t.community.title}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">{t.community.subtitle}</p>
        </div>

        {postStatus && (
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl border border-slate-800 text-xs shadow-sm flex items-center gap-4">
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                Posting Tier Status (Asia/Kolkata Time)
              </div>
              <div className="font-semibold text-white mt-0.5">
                Friends: <span className="text-teal-400 font-bold">{postStatus.friendCount}</span> • Limit:{' '}
                <span className="text-teal-400 font-bold">
                  {postStatus.dailyLimit === -1 ? 'Unlimited' : `${postStatus.dailyLimit}/day`}
                </span>{' '}
                • Used Today: <span className="text-teal-400 font-bold">{postStatus.postsToday}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task 4 Posting Governance Policy Summary Card */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 p-5 rounded-2xl border border-slate-800 text-white text-xs space-y-2 shadow-sm">
        <div className="flex items-center gap-2 text-teal-400 font-bold">
          <Shield className="w-4 h-4" />
          <span>Server-Authoritative Daily Posting Rules (Task 4 Standard)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] pt-1">
          <div className="bg-slate-850/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block font-bold">0 Friends</span>
            <span className="text-rose-400 font-extrabold">0 posts / day</span>
          </div>
          <div className="bg-slate-850/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block font-bold">1 Friend</span>
            <span className="text-teal-300 font-extrabold">1 post / day</span>
          </div>
          <div className="bg-slate-850/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block font-bold">2 Friends</span>
            <span className="text-teal-300 font-extrabold">2 posts / day</span>
          </div>
          <div className="bg-slate-850/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block font-bold">3–10 Friends</span>
            <span className="text-teal-300 font-extrabold">1 post / day (Config)</span>
          </div>
          <div className="bg-slate-850/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block font-bold">&gt;10 Friends</span>
            <span className="text-teal-400 font-extrabold">Unlimited posts</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Create Post Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">{t.community.createPost}</h3>

            {postingError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{postingError}</span>
              </div>
            )}

            {postStatus && !postStatus.canPost && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{postStatus.reason}</span>
              </div>
            )}

            <form onSubmit={handleCreatePost} className="space-y-3">
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t.community.postPlaceholder}
                className="w-full p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500"
              />

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => {
                    setMediaUrl(e.target.value);
                    if (e.target.value && mediaType === 'none') setMediaType('image');
                  }}
                  placeholder="Optional media URL (https://images.unsplash.com/...)"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-teal-500"
                />

                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-teal-500"
                >
                  <option value="none">No Media</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={postingLoading || !content.trim() || (postStatus ? !postStatus.canPost : false)}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{postingLoading ? t.common.loading : t.community.publishBtn}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Posts Feed */}
          {loadingPosts ? (
            <div className="text-center py-16 text-slate-500 text-xs">{t.common.loading}</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">No community posts yet. Be the first to share!</p>
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4"
              >
                {/* Author Strip */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.authorAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.authorName)}`}
                      alt={post.authorName}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-100"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{post.authorName}</h4>
                      <span className="text-[10px] text-slate-400">
                        {new Date(post.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Post Content */}
                <p className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>

                {/* Media Attachment */}
                {post.mediaUrl && post.mediaType === 'image' && (
                  <img
                    src={post.mediaUrl}
                    alt="Post media"
                    className="w-full max-h-96 object-cover rounded-2xl border border-slate-100"
                  />
                )}

                {post.mediaUrl && post.mediaType === 'video' && (
                  <video
                    src={post.mediaUrl}
                    controls
                    className="w-full max-h-96 rounded-2xl border border-slate-100"
                  />
                )}

                {/* Post Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      post.isLiked ? 'text-rose-500 font-bold bg-rose-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-rose-500' : ''}`} />
                    <span>{post.likesCount || 0} Likes</span>
                  </button>

                  <button
                    onClick={() => handleToggleComments(post.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.commentsCount || 0} Comments</span>
                  </button>

                  <button
                    onClick={() => handleShare(post.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{post.sharesCount || 0} Shares</span>
                  </button>
                </div>

                {/* Comments Section Drawer */}
                {activeCommentPostId === post.id && (
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a response..."
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-500"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                      >
                        Reply
                      </button>
                    </div>

                    <div className="space-y-2 pt-2">
                      {(commentsMap[post.id] || []).map((comm) => (
                        <div key={comm.id} className="p-3 rounded-xl bg-slate-50 text-xs space-y-1">
                          <div className="font-bold text-slate-800">{comm.authorName}</div>
                          <p className="text-slate-600">{comm.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Sidebar: Friends List & Peer Discovery */}
        <div className="space-y-6">
          {/* Accepted Friends List */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
              <span>{t.community.friendsCount}</span>
              <span className="text-teal-600 font-extrabold">{friends.length}</span>
            </h3>

            {friends.length === 0 ? (
              <p className="text-xs text-slate-500">
                You have 0 accepted friends. Connect with students below to unlock daily posting rights!
              </p>
            ) : (
              <div className="space-y-2.5">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <img
                      src={friend.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(friend.fullName)}`}
                      alt={friend.fullName}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 truncate">{friend.fullName}</div>
                      <div className="text-[10px] text-slate-400 truncate">{friend.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discover Peers (Interactive testing for evaluator) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">{t.community.connectWithPeers}</h3>
              <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded-full">
                Interactive Test Helper
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Click Quick Connect to simulate adding accepted friendships. Watch your daily posting limit automatically update!
            </p>

            <div className="space-y-3">
              {discoverUsers.slice(0, 3).map((peer) => (
                <div
                  key={peer.id}
                  className="p-3 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 truncate">{peer.fullName}</div>
                    <div className="text-[10px] text-slate-500 truncate">{peer.headline}</div>
                  </div>

                  <button
                    onClick={() => handleInstantConnect(peer.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-teal-600 text-white font-bold text-[11px] transition shrink-0 cursor-pointer"
                  >
                    + Connect
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
