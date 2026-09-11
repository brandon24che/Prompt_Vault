import React, { useState, useEffect } from 'react';
import { Prompt, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Users,
  FileText,
  Heart,
  Copy,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Crown,
  UserX,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Filter,
} from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { purgeSamplePromptsFromFirestore } from '../utils/promptUtils';

interface AdminDashboardProps {
  prompts: Prompt[];
  onRefreshPrompts: () => void;
  onOpenPromptDetail: (prompt: Prompt) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  prompts,
  onRefreshPrompts,
  onOpenPromptDetail,
}) => {
  const {
    currentUser,
    isAdmin,
    updateUserRole,
    suspendUser,
    unsuspendUser,
    deleteUserAccount,
  } = useAuth();
  const { addToast } = useToast();

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended' | 'admin'>('all');
  const [searchPromptQuery, setSearchPromptQuery] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState<'analytics' | 'users' | 'moderation'>('analytics');
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);

  // Suspend User Modal State
  const [suspendModalUser, setSuspendModalUser] = useState<UserProfile | null>(null);
  const [suspendReason, setSuspendReason] = useState('Violation of community guidelines');
  const [customReason, setCustomReason] = useState('');
  const [isSubmittingSuspend, setIsSubmittingSuspend] = useState(false);

  // Delete User Modal State
  const [deleteModalUser, setDeleteModalUser] = useState<UserProfile | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const fetchUsers = async () => {
    setIsRefreshingUsers(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const listMap = new Map<string, UserProfile>();
      snap.forEach((d) => {
        const u = d.data() as UserProfile;
        listMap.set(u.uid, u);
      });

      // Ensure current logged-in user is listed
      if (currentUser && !listMap.has(currentUser.uid)) {
        const selfProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          username: currentUser.displayName || currentUser.email?.split('@')[0] || 'Admin',
          role: isAdmin ? 'admin' : 'user',
          createdAt: new Date().toISOString(),
          isSuspended: false,
        };
        listMap.set(currentUser.uid, selfProfile);
        setDoc(doc(db, 'users', currentUser.uid), selfProfile, { merge: true }).catch(() => {});
      }

      // Reconcile any authors from prompts
      prompts.forEach((p) => {
        if (p.authorId && p.authorId !== 'system-seed' && !listMap.has(p.authorId)) {
          const authorProfile: UserProfile = {
            uid: p.authorId,
            email: p.authorEmail || `${(p.authorUsername || 'creator').toLowerCase()}@vault.community`,
            username: p.authorUsername || 'PromptCreator',
            role: 'user',
            createdAt: p.createdAt || new Date().toISOString(),
            isSuspended: false,
          };
          listMap.set(p.authorId, authorProfile);
          setDoc(doc(db, 'users', p.authorId), authorProfile, { merge: true }).catch(() => {});
        }
      });

      setUsersList(Array.from(listMap.values()));
    } catch (err) {
      console.error('Error fetching users for admin:', err);
      // Fallback reconciliation so users are always visible
      const fallbackMap = new Map<string, UserProfile>();
      if (currentUser) {
        fallbackMap.set(currentUser.uid, {
          uid: currentUser.uid,
          email: currentUser.email || '',
          username: currentUser.displayName || currentUser.email?.split('@')[0] || 'Admin',
          role: isAdmin ? 'admin' : 'user',
          createdAt: new Date().toISOString(),
          isSuspended: false,
        });
      }
      prompts.forEach((p) => {
        if (p.authorId && p.authorId !== 'system-seed' && !fallbackMap.has(p.authorId)) {
          fallbackMap.set(p.authorId, {
            uid: p.authorId,
            email: p.authorEmail || `${(p.authorUsername || 'creator').toLowerCase()}@vault.community`,
            username: p.authorUsername || 'PromptCreator',
            role: 'user',
            createdAt: p.createdAt || new Date().toISOString(),
            isSuspended: false,
          });
        }
      });
      setUsersList(Array.from(fallbackMap.values()));
    } finally {
      setLoadingUsers(false);
      setIsRefreshingUsers(false);
    }
  };

  // Real-time Firestore sync for users
  useEffect(() => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(
      usersCol,
      (snapshot) => {
        const listMap = new Map<string, UserProfile>();
        snapshot.forEach((d) => {
          listMap.set(d.id, d.data() as UserProfile);
        });

        // Ensure current user is in list
        if (currentUser && !listMap.has(currentUser.uid)) {
          const selfProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            username: currentUser.displayName || currentUser.email?.split('@')[0] || 'Admin',
            role: isAdmin ? 'admin' : 'user',
            createdAt: new Date().toISOString(),
            isSuspended: false,
          };
          listMap.set(currentUser.uid, selfProfile);
          setDoc(doc(db, 'users', currentUser.uid), selfProfile, { merge: true }).catch(() => {});
        }

        // Reconcile authors from prompts
        prompts.forEach((p) => {
          if (p.authorId && p.authorId !== 'system-seed' && !listMap.has(p.authorId)) {
            const authorProfile: UserProfile = {
              uid: p.authorId,
              email: p.authorEmail || `${(p.authorUsername || 'creator').toLowerCase()}@vault.community`,
              username: p.authorUsername || 'PromptCreator',
              role: 'user',
              createdAt: p.createdAt || new Date().toISOString(),
              isSuspended: false,
            };
            listMap.set(p.authorId, authorProfile);
            setDoc(doc(db, 'users', p.authorId), authorProfile, { merge: true }).catch(() => {});
          }
        });

        setUsersList(Array.from(listMap.values()));
        setLoadingUsers(false);
      },
      (err) => {
        console.warn('Real-time users snapshot warning:', err);
        fetchUsers();
      }
    );

    return () => unsubscribe();
  }, [isAdmin, currentUser, prompts]);

  if (!isAdmin) {
    return (
      <div id="admin-dashboard" className="max-w-xl mx-auto my-16 p-8 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-center animate-in fade-in duration-300">
        <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Restricted Access</h2>
        <p className="text-sm text-slate-300">
          This area is restricted to administrators. Your current account ({currentUser?.email || 'Guest'}) does not have admin permissions.
        </p>
      </div>
    );
  }

  // Analytics Metrics
  const totalUsers = usersList.length;
  const activeUsersCount = usersList.filter((u) => !u.isSuspended).length;
  const suspendedUsersCount = usersList.filter((u) => u.isSuspended).length;
  const adminUsersCount = usersList.filter((u) => u.role === 'admin').length;

  const totalPrompts = prompts.length;
  const totalLikes = prompts.reduce((sum, p) => sum + (p.likesCount || 0), 0);
  const totalCopies = prompts.reduce((sum, p) => sum + (p.copiesCount || 0), 0);

  // Filtered users
  const filteredUsers = usersList.filter((u) => {
    const q = searchUserQuery.toLowerCase();
    const matchesQuery =
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (userStatusFilter === 'active') return !u.isSuspended;
    if (userStatusFilter === 'suspended') return Boolean(u.isSuspended);
    if (userStatusFilter === 'admin') return u.role === 'admin';
    return true;
  });

  // Filtered prompts for moderation
  const filteredPrompts = prompts.filter(
    (p) =>
      p.title.toLowerCase().includes(searchPromptQuery.toLowerCase()) ||
      p.authorUsername.toLowerCase().includes(searchPromptQuery.toLowerCase()) ||
      p.targetPlatform.toLowerCase().includes(searchPromptQuery.toLowerCase())
  );

  const handleRoleToggle = async (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await updateUserRole(user.uid, newRole);
      setUsersList((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, role: newRole } : u))
      );
      addToast({
        title: 'Role Updated',
        description: `@${user.username} is now an ${newRole}.`,
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Update failed',
        description: String(err),
        type: 'error',
      });
    }
  };

  const handleOpenSuspendModal = (user: UserProfile) => {
    setSuspendModalUser(user);
    setSuspendReason('Violation of community guidelines');
    setCustomReason('');
  };

  const handleConfirmSuspend = async () => {
    if (!suspendModalUser) return;
    const finalReason = customReason.trim() || suspendReason;
    setIsSubmittingSuspend(true);
    try {
      await suspendUser(suspendModalUser.uid, finalReason);
      setUsersList((prev) =>
        prev.map((u) =>
          u.uid === suspendModalUser.uid
            ? { ...u, isSuspended: true, suspendedReason: finalReason }
            : u
        )
      );
      addToast({
        title: 'User Suspended',
        description: `@${suspendModalUser.username} account suspended.`,
        type: 'warning',
      });
      setSuspendModalUser(null);
    } catch (err) {
      addToast({
        title: 'Suspension Failed',
        description: String(err),
        type: 'error',
      });
    } finally {
      setIsSubmittingSuspend(false);
    }
  };

  const handleUnsuspendUser = async (user: UserProfile) => {
    try {
      await unsuspendUser(user.uid);
      setUsersList((prev) =>
        prev.map((u) =>
          u.uid === user.uid
            ? { ...u, isSuspended: false, suspendedReason: '' }
            : u
        )
      );
      addToast({
        title: 'User Re-activated',
        description: `@${user.username} is active and permissions restored.`,
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Re-activation Failed',
        description: String(err),
        type: 'error',
      });
    }
  };

  const handleOpenDeleteModal = (user: UserProfile) => {
    setDeleteModalUser(user);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalUser) return;
    setIsSubmittingDelete(true);
    try {
      await deleteUserAccount(deleteModalUser.uid);
      setUsersList((prev) => prev.filter((u) => u.uid !== deleteModalUser.uid));
      addToast({
        title: 'User Deleted',
        description: `User account @${deleteModalUser.username} removed from the system.`,
        type: 'info',
      });
      setDeleteModalUser(null);
    } catch (err) {
      addToast({
        title: 'Delete Failed',
        description: String(err),
        type: 'error',
      });
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleDeletePromptModeration = async (promptId: string, title: string) => {
    if (!confirm(`Moderation Action: Delete prompt "${title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'prompts', promptId));
      onRefreshPrompts();
      addToast({
        title: 'Prompt Removed',
        description: 'The prompt was deleted by moderation.',
        type: 'info',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `prompts/${promptId}`);
    }
  };

  const [purgingLoading, setPurgingLoading] = useState(false);

  const handlePurgeSampleData = async () => {
    if (
      !confirm(
        'Scan and purge all sample/seed prompts from Firestore? This leaves only authentic user-uploaded prompts with genuine metrics.'
      )
    )
      return;
    setPurgingLoading(true);
    try {
      const removedCount = await purgeSamplePromptsFromFirestore();
      onRefreshPrompts();
      addToast({
        title: 'Sample Data Cleaned',
        description: `Successfully cleared ${removedCount} sample prompt(s) from Firestore.`,
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Purge Failed',
        description: String(err),
        type: 'error',
      });
    } finally {
      setPurgingLoading(false);
    }
  };

  return (
    <div id="admin-dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-purple-500/20 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Crown className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              PromptVault <span className="text-purple-400">Admin Control</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Platform governance, community analytics, registered user management, and prompt moderation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePurgeSampleData}
            disabled={purgingLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/40 text-amber-200 text-xs font-semibold transition cursor-pointer"
            title="Scan and delete all sample and seed prompts"
          >
            <Trash2 className="w-3.5 h-3.5 text-amber-400" />
            {purgingLoading ? 'Purging Sample Data...' : 'Purge Sample Prompts'}
          </button>
          <button
            onClick={() => {
              fetchUsers();
              onRefreshPrompts();
            }}
            disabled={isRefreshingUsers}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-60 text-xs font-semibold"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingUsers ? 'animate-spin text-purple-400' : ''}`} />
            <span>{isRefreshingUsers ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 mb-8 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveAdminTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeAdminTab === 'analytics'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Overview & Metrics
        </button>
        <button
          onClick={() => setActiveAdminTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
            activeAdminTab === 'users'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>User Management</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-900/60 border border-purple-500/30 text-purple-200">
            {usersList.length}
          </span>
        </button>
        <button
          onClick={() => setActiveAdminTab('moderation')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
            activeAdminTab === 'moderation'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Prompt Moderation</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 border border-slate-700 text-slate-300">
            {prompts.length}
          </span>
        </button>
      </div>

      {/* Tab: Analytics Overview */}
      {activeAdminTab === 'analytics' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#12192b] to-[#0c1220] border border-cyan-500/20 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">Registered Users</span>
                <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white font-mono">{totalUsers}</div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-1">
                <span className="text-emerald-400">{activeUsersCount} active</span>
                {suspendedUsersCount > 0 && (
                  <span className="text-rose-400">• {suspendedUsersCount} suspended</span>
                )}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#12192b] to-[#0c1220] border border-purple-500/20 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">Total Prompts Stored</span>
                <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-400">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white font-mono">{totalPrompts}</div>
              <span className="text-[11px] text-purple-400/80 font-mono mt-1 block">
                Active in repository
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#12192b] to-[#0c1220] border border-rose-500/20 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">Community Likes Given</span>
                <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-400">
                  <Heart className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white font-mono">{totalLikes}</div>
              <span className="text-[11px] text-rose-400/80 font-mono mt-1 block">
                Verified upvotes
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#12192b] to-[#0c1220] border border-emerald-500/20 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">Total Prompts Copied</span>
                <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                  <Copy className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white font-mono">{totalCopies}</div>
              <span className="text-[11px] text-emerald-400/80 font-mono mt-1 block">
                Clipboard integrations
              </span>
            </div>
          </div>

          {/* Quick Platform Breakdown */}
          <div className="p-6 rounded-2xl bg-[#0f172a]/80 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-4">Prompts by Target AI Platform</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(['ChatGPT', 'Claude', 'Gemini', 'Midjourney', 'Stable Diffusion'] as const).map(
                (platform) => {
                  const count = prompts.filter((p) => p.targetPlatform === platform).length;
                  return (
                    <div
                      key={platform}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 text-center"
                    >
                      <span className="text-xs font-medium text-slate-400 block mb-1">
                        {platform}
                      </span>
                      <span className="text-xl font-bold font-mono text-white">{count}</span>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: User Management */}
      {activeAdminTab === 'users' && (
        <div className="space-y-4">
          {/* Controls Bar: Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0f172a]/80 p-4 rounded-2xl border border-slate-800">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                placeholder="Search by username, email, or UID..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-purple-400 transition"
              />
            </div>

            {/* Filter Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setUserStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  userStatusFilter === 'all'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                All ({usersList.length})
              </button>
              <button
                onClick={() => setUserStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  userStatusFilter === 'active'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Active ({activeUsersCount})
              </button>
              <button
                onClick={() => setUserStatusFilter('suspended')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  userStatusFilter === 'suspended'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                Suspended ({suspendedUsersCount})
              </button>
              <button
                onClick={() => setUserStatusFilter('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  userStatusFilter === 'admin'
                    ? 'bg-purple-900/40 text-purple-300 border border-purple-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                Admins ({adminUsersCount})
              </button>
            </div>
          </div>

          {loadingUsers ? (
            <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
              <span>Loading registered user records from Firestore...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 bg-[#0f172a]/50 rounded-2xl border border-slate-800/80">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-300">No users match your criteria</p>
              <p className="text-slate-500 mt-1">Try clearing your search query or switching filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0f172a]/90 shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold">
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Prompts</th>
                    <th className="py-3.5 px-4">Joined</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredUsers.map((user) => {
                    const isSelf = user.uid === currentUser?.uid;
                    const isSuspended = Boolean(user.isSuspended);
                    const userPromptsCount = prompts.filter((p) => p.authorId === user.uid).length;

                    return (
                      <tr
                        key={user.uid}
                        className={`hover:bg-slate-900/60 transition ${
                          isSuspended ? 'bg-rose-950/10' : ''
                        }`}
                      >
                        {/* Username & Avatar */}
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm">
                              {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate">@{user.username || 'User'}</span>
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono block truncate">
                                ID: {user.uid.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          {user.email || '—'}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          {isSuspended ? (
                            <div>
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-rose-950/80 border border-rose-500/40 text-rose-300 shadow-sm shadow-rose-950/50"
                                title={user.suspendedReason || 'Suspended by admin'}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                                Suspended
                              </span>
                              {user.suspendedReason && (
                                <p className="text-[10px] text-rose-400/80 mt-0.5 truncate max-w-xs" title={user.suspendedReason}>
                                  {user.suspendedReason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          )}
                        </td>

                        {/* Role Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                              user.role === 'admin'
                                ? 'bg-purple-950/80 border border-purple-500/40 text-purple-300'
                                : 'bg-slate-800 border border-slate-700 text-slate-300'
                            }`}
                          >
                            {user.role === 'admin' ? (
                              <ShieldCheck className="w-3 h-3 text-purple-400" />
                            ) : (
                              <Shield className="w-3 h-3 text-slate-500" />
                            )}
                            {user.role}
                          </span>
                        </td>

                        {/* Prompts Count */}
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                            {userPromptsCount} prompt{userPromptsCount !== 1 ? 's' : ''}
                          </span>
                        </td>

                        {/* Joined Date */}
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Suspend / Unsuspend Button */}
                            {isSuspended ? (
                              <button
                                onClick={() => handleUnsuspendUser(user)}
                                disabled={isSelf}
                                title="Re-activate suspended user account"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-[11px] font-medium text-emerald-300 transition disabled:opacity-40 cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                                Unsuspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenSuspendModal(user)}
                                disabled={isSelf}
                                title={isSelf ? 'Cannot suspend your own account' : 'Suspend user account'}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-[11px] font-medium text-amber-300 transition disabled:opacity-40 cursor-pointer"
                              >
                                <UserX className="w-3.5 h-3.5 text-amber-400" />
                                Suspend
                              </button>
                            )}

                            {/* Toggle Role */}
                            <button
                              onClick={() => handleRoleToggle(user)}
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? 'Cannot change your own role'
                                  : user.role === 'admin'
                                  ? 'Demote to regular user'
                                  : 'Promote to System Admin'
                              }
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 transition disabled:opacity-40 cursor-pointer"
                            >
                              {user.role === 'admin' ? 'Demote' : 'Make Admin'}
                            </button>

                            {/* Delete User */}
                            <button
                              onClick={() => handleOpenDeleteModal(user)}
                              disabled={isSelf}
                              title={isSelf ? 'Cannot delete your own account' : 'Permanently delete user account'}
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 transition disabled:opacity-40 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Prompt Moderation */}
      {activeAdminTab === 'moderation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchPromptQuery}
                onChange={(e) => setSearchPromptQuery(e.target.value)}
                placeholder="Filter by title, platform, or author..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-purple-400 transition"
              />
            </div>
            <span className="text-xs text-slate-400">
              Showing {filteredPrompts.length} prompt{filteredPrompts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filteredPrompts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No prompts found.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0f172a]/90">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold">
                    <th className="py-3 px-4">Title & Description</th>
                    <th className="py-3 px-4">Platform</th>
                    <th className="py-3 px-4">Author</th>
                    <th className="py-3 px-4">Likes</th>
                    <th className="py-3 px-4">Copies</th>
                    <th className="py-3 px-4 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredPrompts.map((prompt) => (
                    <tr key={prompt.id} className="hover:bg-slate-900/50 transition">
                      <td className="py-3 px-4 max-w-xs">
                        <div
                          onClick={() => onOpenPromptDetail(prompt)}
                          className="font-bold text-white hover:text-cyan-300 cursor-pointer truncate"
                        >
                          {prompt.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {prompt.outputDescription}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-cyan-400">
                        {prompt.targetPlatform}
                      </td>
                      <td className="py-3 px-4 text-slate-300">@{prompt.authorUsername || 'anon'}</td>
                      <td className="py-3 px-4 font-mono">{prompt.likesCount || 0}</td>
                      <td className="py-3 px-4 font-mono">{prompt.copiesCount || 0}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeletePromptModeration(prompt.id, prompt.title)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-rose-300 text-xs font-medium transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Suspend User */}
      {suspendModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#0f172a] border border-amber-500/40 rounded-2xl p-6 shadow-2xl text-slate-100">
            <button
              onClick={() => setSuspendModalUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Suspend User Account</h3>
                <p className="text-xs text-slate-400">
                  User: <span className="text-white font-semibold">@{suspendModalUser.username}</span> ({suspendModalUser.email})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Suspending this user will prevent them from publishing or editing prompts in the community vault. You can unsuspend them at any time.
            </p>

            <div className="space-y-3 mb-5">
              <label className="block text-xs font-semibold text-slate-300">
                Select Reason for Suspension:
              </label>
              {[
                'Violation of community guidelines',
                'Spam or automated content posting',
                'Inappropriate or offensive prompt submissions',
                'Administrative review in progress',
              ].map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs text-slate-300"
                >
                  <input
                    type="radio"
                    name="suspend-reason"
                    checked={suspendReason === r && !customReason}
                    onChange={() => {
                      setSuspendReason(r);
                      setCustomReason('');
                    }}
                    className="text-amber-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>{r}</span>
                </label>
              ))}

              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Or provide a custom reason:
                </label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="e.g. Terms of Service Section 4 violation"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400 transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSuspendModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={isSubmittingSuspend}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-60"
              >
                <UserX className="w-3.5 h-3.5" />
                {isSubmittingSuspend ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete User Confirmation */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#0f172a] border border-rose-500/40 rounded-2xl p-6 shadow-2xl text-slate-100">
            <button
              onClick={() => setDeleteModalUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Permanently Delete User</h3>
                <p className="text-xs text-slate-400">
                  User: <span className="text-white font-semibold">@{deleteModalUser.username}</span> ({deleteModalUser.email})
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs mb-5 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Warning: Irreversible Action</span>
                This will delete the user's profile and administrative records from the database. This action cannot be undone.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isSubmittingDelete ? 'Deleting...' : 'Permanently Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
