import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, ShieldAlert, Users } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { getAdminStats, getAdminUsers } from '../lib/admin';
import { useAsync } from '../lib/useAsync';
import { cx } from '../lib/utils';
import type { AdminStats, AdminUser, AdminUserList } from '../types';

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const lastActiveLabel = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Belum pernah';

/** Halaman admin (read-only): statistik dan daftar user yang sudah daftar. */
export default function AdminView() {
  const { user, token, refresh } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Role di localStorage bisa basi (admin baru diberikan / dicabut): ambil ulang dari /auth/me.
  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  if (!isAdmin || !token) {
    return (
      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 p-4 sm:p-8">
        <PageHeader eyebrow="Admin" title="Khusus admin" />
        <EmptyState icon={ShieldAlert} title="Kamu tidak punya akses" text="Halaman ini hanya untuk akun dengan role admin." />
      </div>
    );
  }
  return <AdminDashboard token={token} />;
}

function AdminDashboard({ token }: { token: string }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  // Tunggu user berhenti mengetik sebelum memanggil API; halaman kembali ke 1 hanya saat kata kunci berubah.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = search.trim();
      if (next === query) return;
      setQuery(next);
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [search, query]);

  const stats = useAsync('stats', () => getAdminStats(token));
  const users = useAsync(`${query}|${page}`, () => getAdminUsers(token, query, page, PAGE_SIZE));

  // Tampilkan data sebelumnya selama halaman berikutnya dimuat (tabel tidak berkedip).
  const [last, setLast] = useState<AdminUserList | null>(null);
  if (users.data && users.data !== last) setLast(users.data);
  const list = users.data ?? last;
  const totalPages = list ? Math.max(1, Math.ceil(list.total / list.limit)) : 1;
  // Jumlah user bisa berkurang: jangan tertahan di halaman yang sudah tidak ada.
  if (list && page > totalPages) setPage(totalPages);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-8 p-4 sm:p-8">
      <PageHeader
        eyebrow="Admin"
        title="Data user"
        subtitle="Lihat user yang sudah daftar beserta aktivitasnya. Halaman ini hanya bisa dibaca."
      />

      <StatsRow stats={stats.data} error={stats.error} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[16px] font-bold uppercase tracking-[0.4px] text-ink">
            User terdaftar
            {list && <span className="ml-2 text-[13px] font-medium normal-case tracking-normal text-muted">{list.total} user</span>}
          </h2>
          <label className="flex w-full items-center gap-2 border border-line/60 bg-card px-3 py-2 sm:w-[320px]">
            <Search className="size-4 shrink-0 text-muted" />
            <span className="sr-only">Cari user</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau username"
              maxLength={100}
              className="min-w-0 flex-1 bg-transparent text-[14px] text-ink placeholder:text-muted focus:outline-none"
            />
          </label>
        </div>

        {users.error ? (
          <EmptyState icon={ShieldAlert} title="Gagal memuat user" text={users.error} />
        ) : !list ? (
          <p className="py-10 text-center text-[13px] text-muted">Memuat user…</p>
        ) : list.items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="User tidak ditemukan"
            text={query ? `Tidak ada user yang cocok dengan "${query}".` : 'Belum ada user.'}
          />
        ) : (
          <div aria-busy={users.loading} className={cx('transition-opacity', users.loading && 'opacity-60')}>
            <UserTable users={list.items} />
            <UserCards users={list.items} />
          </div>
        )}

        {list && list.total > list.limit && (
          <nav aria-label="Halaman daftar user" className="flex items-center justify-end gap-3 text-[13px] text-dim">
            <span>
              Halaman {page} dari {totalPages}
            </span>
            <button
              type="button"
              aria-label="Halaman sebelumnya"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              className="flex size-8 items-center justify-center border border-line/60 bg-card hover:text-ink disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Halaman berikutnya"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="flex size-8 items-center justify-center border border-line/60 bg-card hover:text-ink disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}

function StatsRow({ stats, error }: { stats: AdminStats | null; error: string }) {
  if (error) return <p className="text-[13px] text-muted">Statistik gagal dimuat: {error}</p>;
  const tiles: Array<[string, number | undefined]> = [
    ['Total user', stats?.total_users],
    ['Admin', stats?.admins],
    ['Baru 7 hari', stats?.new_users_7d],
    ['Aktif 7 hari', stats?.active_users_7d],
    ['Total playlist', stats?.total_playlists],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map(([label, value]) => (
        <div key={label} className="border border-line/40 bg-card p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted">{label}</p>
          <p className="pt-1 text-[24px] font-bold leading-8 text-ink">{value ?? '–'}</p>
        </div>
      ))}
    </div>
  );
}

function RoleBadge({ role }: { role: AdminUser['role'] }) {
  return (
    <span
      className={cx(
        'px-2 py-[2px] text-[11px] font-semibold uppercase',
        role === 'admin' ? 'bg-primary text-on-primary' : 'bg-line text-dim',
      )}
    >
      {role}
    </span>
  );
}

/** Tabel untuk layar lebar. */
function UserTable({ users }: { users: AdminUser[] }) {
  const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-muted';
  const num = 'px-3 py-3 text-right tabular-nums text-dim';
  return (
    <div className="hidden overflow-x-auto border border-line/40 md:block">
      <table className="w-full text-[13px]">
        <thead className="bg-card">
          <tr>
            <th scope="col" className={th}>
              User
            </th>
            <th scope="col" className={th}>
              Role
            </th>
            <th scope="col" className={th}>
              Bergabung
            </th>
            <th scope="col" className={cx(th, 'text-right')}>
              Playlist
            </th>
            <th scope="col" className={cx(th, 'text-right')}>
              Like
            </th>
            <th scope="col" className={cx(th, 'text-right')}>
              Putar
            </th>
            <th scope="col" className={cx(th, 'text-right')}>
              Follower
            </th>
            <th scope="col" className={th}>
              Terakhir aktif
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-line/40 hover:bg-card/60">
              <td className="px-3 py-3">
                <Link to={`/users/${u.id}`} className="block min-w-0 hover:underline">
                  <span className="block truncate font-semibold text-ink">{u.name}</span>
                  <span className="block truncate text-[12px] text-muted">@{u.username}</span>
                </Link>
              </td>
              <td className="px-3 py-3">
                <RoleBadge role={u.role} />
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-dim">{dateLabel(u.created_at)}</td>
              <td className={num}>{u.playlist_count}</td>
              <td className={num}>{u.liked_count}</td>
              <td className={num}>{u.play_count}</td>
              <td className={num}>{u.followers_count}</td>
              <td className="whitespace-nowrap px-3 py-3 text-dim">{lastActiveLabel(u.last_played)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Kartu untuk HP (tabel terlalu lebar). */
function UserCards({ users }: { users: AdminUser[] }) {
  return (
    <ul className="flex flex-col gap-2 md:hidden">
      {users.map((u) => (
        <li key={u.id} className="border border-line/40 bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <Link to={`/users/${u.id}`} className="min-w-0">
              <span className="block truncate text-[14px] font-semibold text-ink">{u.name}</span>
              <span className="block truncate text-[12px] text-muted">@{u.username}</span>
            </Link>
            <RoleBadge role={u.role} />
          </div>
          <p className="pt-2 text-[12px] text-dim">
            {u.playlist_count} playlist · {u.liked_count} like · {u.play_count} putar · {u.followers_count} follower
          </p>
          <p className="pt-1 text-[12px] text-muted">
            Bergabung {dateLabel(u.created_at)} · Terakhir aktif: {lastActiveLabel(u.last_played)}
          </p>
        </li>
      ))}
    </ul>
  );
}
