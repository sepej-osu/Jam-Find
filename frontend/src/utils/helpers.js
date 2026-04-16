/**
 * Haversine formula — returns distance in miles between two lat/lng coordinates.
 * https://en.wikipedia.org/wiki/Haversine_formula
 */
export function getDistanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// This helps convert ISO date strings into "just now", "5m ago", "2h ago", etc. for timestamps
export function getRelativeTime(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  if (diffMins < 1) return 'just now';
  if (diffHours < 1) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// Extracts the Firebase Storage object path from a download URL.
// Returns a decoded path like users/uid/profile-picture/filename.jpg.
// Firebase Storage URLs have the format https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
// So we're taking the part after /o/ and decoding any URL-encoded characters.
// Returns null when the value is empty, invalid, or not a Firebase Storage object URL.
export function pathFromStorageUrl(url) {
  if (typeof url !== 'string' || url.trim() === '') {
    return null;
  }
  try {
    const { pathname } = new URL(url);
    const encodedPath = pathname.split('/o/')[1];
    if (!encodedPath) {
      return null;
    }
    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
}
