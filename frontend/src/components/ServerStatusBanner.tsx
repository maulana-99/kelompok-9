import { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import { SERVER_STATUS_EVENT, pingServer } from '../lib/api';

const RETRY_MS = 20_000;

/**
 * Banner di atas halaman saat internet pengguna putus atau server Melodi mati.
 * Selama server mati, cek /health tiap 20 detik dan hilang sendiri begitu server kembali.
 */
export default function ServerStatusBanner() {
  const [internetDown, setInternetDown] = useState(() => !navigator.onLine);
  const [serverDown, setServerDown] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const onStatus = (e: Event) => setServerDown(!(e as CustomEvent<boolean>).detail);
    const onOnline = () => {
      setInternetDown(false);
      void pingServer();
    };
    const onOffline = () => setInternetDown(true);
    window.addEventListener(SERVER_STATUS_EVENT, onStatus);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener(SERVER_STATUS_EVENT, onStatus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!serverDown || internetDown) return undefined;
    const timer = window.setInterval(() => void pingServer(), RETRY_MS);
    return () => window.clearInterval(timer);
  }, [serverDown, internetDown]);

  const retry = async () => {
    setChecking(true);
    await pingServer();
    setChecking(false);
  };

  const show = internetDown || serverDown;

  // Live region selalu ada di DOM supaya pembaca layar ikut mengumumkan perubahan.
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[80] flex justify-center px-4">
      {show && (
        <div className="pointer-events-auto flex max-w-xl items-start gap-3 border border-primary/40 bg-raised px-4 py-3 text-[13px] text-ink shadow-card">
          {internetDown ? (
            <WifiOff aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          ) : (
            <CloudOff aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          )}
          <div className="min-w-0">
            <p className="font-semibold">{internetDown ? 'Kamu sedang offline' : 'Server Melodi sedang tidak aktif'}</p>
            <p className="mt-0.5 text-dim">
              {internetDown
                ? 'Periksa Wi-Fi atau data seluler kamu. Melodi akan tersambung lagi otomatis.'
                : 'Ini biasanya sementara. Halaman akan tersambung lagi otomatis begitu server kembali.'}
            </p>
          </div>
          {!internetDown && (
            <button
              type="button"
              onClick={() => void retry()}
              disabled={checking}
              className="flex shrink-0 items-center gap-1.5 self-center border border-line px-3 py-1.5 font-semibold text-ink hover:border-primary disabled:opacity-60"
            >
              <RefreshCw aria-hidden="true" className={checking ? 'size-3.5 animate-spin' : 'size-3.5'} />
              {checking ? 'Mengecek…' : 'Coba lagi'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
