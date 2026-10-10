const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}
