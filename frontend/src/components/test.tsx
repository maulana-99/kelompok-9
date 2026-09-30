import { useState } from 'react';

export default function Search({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="search-input">Cari Musik</label>
      <input
        id="search-input"
        type="text"
        placeholder="Ketik nama lagu..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit">Cari</button>
    </form>
  );
}