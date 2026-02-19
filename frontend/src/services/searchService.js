export async function searchMusicians(token, params) {
  const apiBase = import.meta.env.VITE_API_URL;
  if (!apiBase) {
    throw new Error('VITE_API_URL is not set');
  }

  const qs = new URLSearchParams();
  if (params.radiusMiles) qs.set('radius_miles', String(params.radiusMiles));
  if (params.instrument) qs.set('instrument', params.instrument);
  if (params.genre) qs.set('genre', params.genre);
  if (params.limit) qs.set('limit', String(params.limit));

  const res = await fetch(`${apiBase}/api/v1/search/musicians?${qs.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    let msg = 'Failed to search musicians';
    try {
      const data = await res.json();
      if (data && data.detail) msg = data.detail;
    } catch (e) {}
    throw new Error(msg);
  }

  return res.json();
}
