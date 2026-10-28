import { useEffect, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  error: string;
  loading: boolean;
}

/**
 * Jalankan loader setiap `key` berubah. Hasil dari key lama diabaikan supaya
 * halaman tidak menampilkan data usang saat user cepat berpindah halaman.
 */
export function useAsync<T>(key: string, loader: () => Promise<T>): AsyncState<T> {
  const [store, setStore] = useState<{ key: string; data: T | null; error: string }>({
    key: '',
    data: null,
    error: '',
  });

  useEffect(() => {
    let active = true;
    loader().then(
      (data) => active && setStore({ key, data, error: '' }),
      (cause: unknown) =>
        active &&
        setStore({ key, data: null, error: cause instanceof Error ? cause.message : 'Terjadi kesalahan. Coba lagi.' }),
    );
    return () => {
      active = false;
    };
    // loader sengaja tidak masuk dependency: cukup dimuat ulang saat key berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = store.key === key;
  return {
    data: current ? store.data : null,
    error: current ? store.error : '',
    loading: !current,
  };
}
