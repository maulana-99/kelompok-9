import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { User as UserIcon, Pencil } from 'lucide-react';
import LoadMore from '../components/LoadMore';
import UserCard from '../components/UserCard';
import PlaylistCard from '../components/PlaylistCard';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { fetchPlaylists, fetchPlaylistDetail, toPlaylist } from '../lib/playlists';
import { followUser, getFollowers, getFollowing, getUser, unfollowUser, updateUser } from '../lib/users';
import { cx, initialsOf } from '../lib/utils';
import type { BackendUser, Playlist, UserDetail } from '../types';

type ListTab = 'followers' | 'following';

/** Public profile — GET /users/:id + followers/following + follow/unfollow. */
export default function ProfileView() {
  const { userId } = useParams<{ userId: string }>();
  const { user: me, token, refresh } = useAuth();
  const { playlists, hydrateTrackMetadata, openPlaylist } = usePlayer();

  const profileId = Number(userId);
  const validId = Number.isInteger(profileId) && profileId > 0;

  const [profile, setProfile] = useState<UserDetail | null>(null);
  const [followers, setFollowers] = useState<BackendUser[]>([]);
  const [followersTotal, setFollowersTotal] = useState(0);
  const [followersHasMore, setFollowersHasMore] = useState(false);
  const [following, setFollowing] = useState<BackendUser[]>([]);
  const [followingTotal, setFollowingTotal] = useState(0);
  const [followingHasMore, setFollowingHasMore] = useState(false);
  const [listNextPage, setListNextPage] = useState({ followers: 2, following: 2 });
  const [listPending, setListPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [listTab, setListTab] = useState<ListTab>('followers');
  const [followPending, setFollowPending] = useState(false);
  const [followError, setFollowError] = useState('');

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const isOwn = me != null && profile != null && me.id === profile.id;
  // Follow state dari backend (daftar follower sekarang dipaginasi, jadi tidak
  // bisa lagi dihitung dari followers.some).
  const isFollowing = profile?.is_following === true;

  const load = useCallback(async () => {
    if (!validId) {
      setLoading(false);
      setError('ID user tidak valid.');
      return;
    }
    setLoading(true);
    setError('');
    setFollowError('');
    try {
      const [u, fers, fing] = await Promise.all([
        getUser(profileId, token),
        getFollowers(profileId),
        getFollowing(profileId),
      ]);
      setProfile(u);
      setFollowers(fers.items);
      setFollowersTotal(fers.total);
      setFollowersHasMore(fers.has_more);
      setFollowing(fing.items);
      setFollowingTotal(fing.total);
      setFollowingHasMore(fing.has_more);
      setListNextPage({ followers: 2, following: 2 });
    } catch (cause) {
      setProfile(null);
      setError(cause instanceof Error ? cause.message : 'Gagal memuat profil.');
    } finally {
      setLoading(false);
    }
  }, [profileId, validId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Muat halaman berikutnya dari tab follower/following yang sedang aktif.
  const loadMoreList = async () => {
    if (!validId || listPending) return;
    const isFollowersTab = listTab === 'followers';
    if (isFollowersTab ? !followersHasMore : !followingHasMore) return;
    setListPending(true);
    try {
      const page = isFollowersTab
        ? await getFollowers(profileId, listNextPage.followers)
        : await getFollowing(profileId, listNextPage.following);
      if (isFollowersTab) {
        setFollowers((prev) => [...prev, ...page.items]);
        setFollowersHasMore(page.has_more);
      } else {
        setFollowing((prev) => [...prev, ...page.items]);
        setFollowingHasMore(page.has_more);
      }
      setListNextPage((prev) =>
        isFollowersTab
          ? { ...prev, followers: page.page + 1 }
          : { ...prev, following: page.page + 1 },
      );
    } catch (cause) {
      setFollowError(cause instanceof Error ? cause.message : 'Gagal memuat lebih banyak.');
    } finally {
      setListPending(false);
    }
  };

  // ---- Playlist publik milik profil yang sedang dilihat (GET /playlists?user_id=) ----
  // Di-tag owner-nya agar hasil profil sebelumnya tidak kedapatan saat ganti halaman.
  const [publicPlaylists, setPublicPlaylists] = useState<{ owner: number; list: Playlist[] } | null>(null);

  useEffect(() => {
    if (!validId || isOwn) return undefined;
    let cancelled = false;
    void (async () => {
      try {
        // Tanpa / dengan token: backend hanya membalas playlist publik milik user tsb.
        const list = await fetchPlaylists(profileId, token);
        const details = await Promise.all(
          list.map((b) =>
            fetchPlaylistDetail(String(b.id), token).catch((err) => {
              console.error(`gagal ambil detail playlist ${b.id}:`, err);
              return null;
            }),
          ),
        );
        if (cancelled) return;
        const mapped = details
          .filter((d): d is NonNullable<typeof d> => d != null)
          .map((d) => toPlaylist(d, d.songs));
        setPublicPlaylists({ owner: profileId, list: mapped });
        void hydrateTrackMetadata(mapped.flatMap((p) => p.trackIds));
      } catch (err) {
        console.error('gagal memuat playlist profil:', err);
        if (!cancelled) setPublicPlaylists({ owner: profileId, list: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [validId, isOwn, profileId, token, hydrateTrackMetadata]);

  const toggleEdit = () => {
    // Prefill edit form when opening it (event handler, not an effect).
    if (!showEdit && profile) {
      setEditName(profile.name);
      setEditUsername(profile.username);
      setEditPassword('');
      setEditError('');
      setEditSuccess('');
    }
    setShowEdit((v) => !v);
  };

  const handleFollowToggle = async () => {
    if (!token || !profile || !me) return;
    if (me.id === profile.id) return;
    setFollowPending(true);
    setFollowError('');
    try {
      if (isFollowing) {
        await unfollowUser(profile.id, token);
        setFollowers((list) => list.filter((f) => f.id !== me.id));
        setFollowersTotal((n) => Math.max(0, n - 1));
      } else {
        await followUser(profile.id, token);
        setFollowers((list) => [...list, me]);
        setFollowersTotal((n) => n + 1);
      }
      setProfile((prev) => (prev ? { ...prev, is_following: !isFollowing } : prev));
    } catch (cause) {
      setFollowError(cause instanceof Error ? cause.message : 'Gagal memperbarui follow.');
    } finally {
      setFollowPending(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !profile) return;
    setEditSaving(true);
    setEditError('');
    setEditSuccess('');
    try {
      const body: { name?: string; username?: string; password?: string } = {};
      if (editName.trim() && editName.trim() !== profile.name) body.name = editName.trim();
      if (editUsername.trim() && editUsername.trim() !== profile.username) body.username = editUsername.trim();
      if (editPassword) body.password = editPassword;
      if (Object.keys(body).length === 0) {
        setEditError('Tidak ada perubahan.');
        return;
      }
      const updated = await updateUser(profile.id, body, token);
      setProfile(updated);
      setEditSuccess('Profil berhasil diperbarui.');
      setEditPassword('');
      // Refresh header/sidebar session so the new name shows up right away.
      try {
        await refresh();
      } catch {
        // Session refresh is best-effort; profile data above is already fresh.
      }
    } catch (cause) {
      setEditError(cause instanceof Error ? cause.message : 'Gagal menyimpan perubahan.');
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return <p className="px-8 py-12 text-center text-[14px] text-muted">Memuat profil...</p>;
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center gap-3 px-8 py-16">
        <p className="text-center text-[14px] text-muted">{error || 'User tidak ditemukan.'}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="h-9 border border-line/60 bg-card px-4 text-[13px] font-medium text-dim hover:border-primary/50 hover:text-ink"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  const list = listTab === 'followers' ? followers : following;
  const listHasMore = listTab === 'followers' ? followersHasMore : followingHasMore;
  // Milik sendiri: dari state PlayerContext (sudah termasuk privat).
  // Orang lain: hasil fetch playlist publik di atas (di-tag owner agar tidak basi).
  const ownPlaylists = isOwn
    ? playlists
    : (publicPlaylists?.owner === profileId ? publicPlaylists.list : []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/15 via-primary/5 to-transparent">
        <div className="flex flex-col gap-7 p-8 sm:flex-row sm:items-end">
          <div
            aria-hidden="true"
            className="flex size-56 shrink-0 items-center justify-center border border-line/60 bg-gradient-to-br from-raised to-sunken shadow-card"
          >
            {profile.name ? (
              <span className="text-[64px] font-bold tracking-[-1px] text-primary-soft">
                {initialsOf(profile.name)}
              </span>
            ) : (
              <UserIcon className="size-14 text-muted" strokeWidth={1.2} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="pb-1 text-[12px] font-semibold uppercase leading-4 tracking-[1.2px] text-muted">
              Profile
            </p>
            <h1 className="break-words pb-1 text-[48px] font-bold leading-[48px] tracking-[-1.2px] text-ink">
              {profile.name}
            </h1>
            <p className="pb-4 pt-1 text-[16px] leading-[23px] text-dim">@{profile.username}</p>
            <div className="flex flex-wrap items-center gap-2 pb-6 text-[12px] leading-4">
              <button
                type="button"
                onClick={() => setListTab('followers')}
                className={cx('font-medium hover:text-primary', listTab === 'followers' ? 'text-ink' : 'text-muted')}
              >
                {followersTotal} followers
              </button>
              <span className="text-muted">•</span>
              <button
                type="button"
                onClick={() => setListTab('following')}
                className={cx('font-medium hover:text-primary', listTab === 'following' ? 'text-ink' : 'text-muted')}
              >
                {followingTotal} following
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!isOwn && me && (
                <button
                  type="button"
                  onClick={() => void handleFollowToggle()}
                  disabled={followPending}
                  className={cx(
                    'flex h-11 items-center bg-primary px-7 text-[14px] font-semibold leading-5 text-on-primary shadow-primary transition hover:brightness-110',
                    followPending && 'cursor-wait opacity-60',
                  )}
                >
                  {followPending ? 'Menyimpan...' : isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )}
              {isOwn && (
                <button
                  type="button"
                  onClick={toggleEdit}
                  aria-expanded={showEdit}
                  className="flex h-11 items-center gap-2 border border-line/60 bg-card px-5 text-[14px] font-medium text-dim transition-colors hover:border-primary/50 hover:text-ink"
                >
                  <Pencil className="size-[14px]" />
                  {showEdit ? 'Tutup edit profil' : 'Edit profil'}
                </button>
              )}
            </div>
            {followError && <p role="alert" className="pt-3 text-[13px] text-primary-soft">{followError}</p>}
          </div>
        </div>
      </section>

      {/* Edit own profile */}
      {isOwn && showEdit && (
        <section className="px-8 pt-2">
          <form
            onSubmit={(e) => void handleSaveEdit(e)}
            className="flex max-w-[480px] flex-col gap-3 border border-line/50 bg-sunken/60 p-5"
          >
            <h2 className="text-[12px] font-semibold uppercase leading-4 tracking-[1.2px] text-muted">
              Edit profil
            </h2>
            <label className="flex flex-col gap-1 text-[13px] text-dim">
              Nama
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                minLength={2}
                maxLength={100}
                className="h-10 border border-line/50 bg-card px-3 text-[14px] text-ink outline-none focus:border-primary/60"
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] text-dim">
              Username
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                minLength={3}
                maxLength={50}
                className="h-10 border border-line/50 bg-card px-3 text-[14px] text-ink outline-none focus:border-primary/60"
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] text-dim">
              Password baru (opsional, min 8 karakter)
              <input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                minLength={8}
                placeholder="Kosongkan jika tidak diganti"
                className="h-10 border border-line/50 bg-card px-3 text-[14px] text-ink outline-none placeholder:text-muted focus:border-primary/50"
              />
            </label>
            {editError && <p role="alert" className="text-[13px] text-primary-soft">{editError}</p>}
            {editSuccess && <p role="status" className="text-[13px] text-dim">{editSuccess}</p>}
            <button
              type="submit"
              disabled={editSaving}
              className={cx(
                'h-10 bg-primary text-[14px] font-semibold text-on-primary transition hover:brightness-110',
                editSaving && 'cursor-wait opacity-60',
              )}
            >
              {editSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </form>
        </section>
      )}

      {/* Followers / Following */}
      <section className="px-8 pt-6">
        <div className="flex items-center gap-2 pb-3" role="tablist" aria-label="Followers and following">
          {(['followers', 'following'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={listTab === key}
              onClick={() => setListTab(key)}
              className={cx(
                'h-8 px-4 text-[13px] font-medium capitalize leading-5 transition-colors',
                listTab === key
                  ? 'bg-ink text-base'
                  : 'border border-line/60 bg-card text-dim hover:border-primary/50 hover:text-ink',
              )}
            >
              {key} ({key === 'followers' ? followersTotal : followingTotal})
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-muted">
            {listTab === 'followers' ? 'Belum ada follower.' : 'Belum mengikuti siapa pun.'}
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {list.map((u) => (
                <UserCard key={u.id} user={u} />
              ))}
            </div>
            {listHasMore && <LoadMore pending={listPending} onClick={() => void loadMoreList()} />}
          </>
        )}
      </section>

      {/* Playlists */}
      <section className="px-8 pb-8 pt-6">
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-[12px] font-semibold uppercase leading-4 tracking-[1.2px] text-muted">
            {isOwn ? 'Your playlists' : 'Playlists'}
          </h3>
        </div>
        {ownPlaylists.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {ownPlaylists.map((p) => (
              <PlaylistCard key={p.id} playlist={p} onOpen={openPlaylist} />
            ))}
          </div>
        ) : isOwn ? (
          <p className="py-4 text-[14px] text-muted">Belum ada playlist. Buat dari sidebar.</p>
        ) : (
          <p className="py-4 text-[14px] text-muted">Belum ada playlist publik.</p>
        )}
      </section>
    </div>
  );
}
