import { DEFAULT_FILTERS } from '../components/FeedFilterBar';

export const DISTANCE_SORTS = ['distance'];

// Convert search params from URL into filter object for API calls
export function filtersFromSearchParams(searchParams) {
  const radius = searchParams.get('radiusMiles');
  return {
    postType: searchParams.get('postType') ?? DEFAULT_FILTERS.postType,
    genres: searchParams.getAll('genres'),
    genreMode: searchParams.get('genreMode') ?? DEFAULT_FILTERS.genreMode,
    instruments: searchParams.getAll('instruments'),
    instrumentMode: searchParams.get('instrumentMode') ?? DEFAULT_FILTERS.instrumentMode,
    sortBy: searchParams.get('sortBy') ?? DEFAULT_FILTERS.sortBy,
    sortOrder: searchParams.get('sortOrder') ?? DEFAULT_FILTERS.sortOrder,
    radiusMiles: radius !== null ? Number(radius) : DEFAULT_FILTERS.radiusMiles,
  };
}

// Convert filter object into search params for URL
export function filtersToSearchParams(filters) {
  const p = new URLSearchParams();
  if (filters.postType) p.set('postType', filters.postType);
  filters.genres.forEach(g => p.append('genres', g));
  if (filters.genres.length > 1) p.set('genreMode', filters.genreMode);
  filters.instruments.forEach(i => p.append('instruments', i));
  if (filters.instruments.length > 1) p.set('instrumentMode', filters.instrumentMode);
  if (filters.sortBy !== DEFAULT_FILTERS.sortBy) p.set('sortBy', filters.sortBy);
  if (filters.sortOrder !== DEFAULT_FILTERS.sortOrder) p.set('sortOrder', filters.sortOrder);
  if (filters.radiusMiles !== null) p.set('radiusMiles', String(filters.radiusMiles));
  return p;
}

// Build API params from filters, user location, and pagination token.
// Distance sort uses page-offset pagination (page number) since the backend sorts by
// computed distance — cursor-based pagination can't be used with a derived sort key.
export function buildParams(filters, userLat = null, userLng = null, pageOrCursor = null) {
  const hasLocation = userLat !== null && userLng !== null;
  // Distance sort requires coordinates — fall back to createdAt if they're missing.
  const sortBy = filters.sortBy === 'distance' && !hasLocation ? 'createdAt' : filters.sortBy;
  const isDistanceSort = DISTANCE_SORTS.includes(sortBy);
  const params = {
    limit: 10,
    sortBy: sortBy,
    sortOrder: filters.sortOrder,
  };
  if (isDistanceSort) {
    if (pageOrCursor !== null) params.page = Number(pageOrCursor);
  } else {
    if (pageOrCursor !== null) params.lastDocId = pageOrCursor;
  }
  if (filters.postType) params.postType = filters.postType;
  if (filters.genres.length) {
    params.genres = filters.genres;
    params.genreMode = filters.genreMode;
  }
  if (filters.instruments.length) {
    params.instruments = filters.instruments.map(i => `${i}:1:5`);
    params.instrumentMode = filters.instrumentMode;
  }
  if (userLat !== null && userLng !== null) {
    params.userLat = userLat;
    params.userLng = userLng;
  }
  if (filters.radiusMiles !== null) {
    params.radiusMiles = filters.radiusMiles;
  }
  return params;
}
