import { Box, Text, Button } from '@chakra-ui/react';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import postService from './services/postService';
import FeedPostCard from './components/FeedPostCard';
import FeedFilterBar, { DEFAULT_FILTERS } from './components/FeedFilterBar';

function filtersFromSearchParams(searchParams) {
  return {
    postType: searchParams.get('postType') ?? DEFAULT_FILTERS.postType,
    genres: searchParams.getAll('genres'),
    genreMode: searchParams.get('genreMode') ?? DEFAULT_FILTERS.genreMode,
    instruments: searchParams.getAll('instruments'),
    instrumentMode: searchParams.get('instrumentMode') ?? DEFAULT_FILTERS.instrumentMode,
    sortBy: searchParams.get('sortBy') ?? DEFAULT_FILTERS.sortBy,
    sortOrder: searchParams.get('sortOrder') ?? DEFAULT_FILTERS.sortOrder,
  };
}

function filtersToSearchParams(filters) {
  const p = new URLSearchParams();
  if (filters.postType) p.set('postType', filters.postType);
  filters.genres.forEach(g => p.append('genres', g));
  if (filters.genres.length > 1) p.set('genreMode', filters.genreMode);
  filters.instruments.forEach(i => p.append('instruments', i));
  if (filters.instruments.length > 1) p.set('instrumentMode', filters.instrumentMode);
  if (filters.sortBy !== DEFAULT_FILTERS.sortBy) p.set('sortBy', filters.sortBy);
  if (filters.sortOrder !== DEFAULT_FILTERS.sortOrder) p.set('sortOrder', filters.sortOrder);
  return p;
}

function buildParams(filters, lastDocId = null) {
  const params = {
    limit: 10,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    lastDocId,
  };
  if (filters.postType) params.postType = filters.postType;
  if (filters.genres.length) {
    params.genres = filters.genres;
    params.genreMode = filters.genreMode;
  }
  if (filters.instruments.length) {
    params.instruments = filters.instruments.map(i => `${i}:1:5`);
    params.instrumentMode = filters.instrumentMode;
  }
  return params;
}

function DiscoveryFeed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const filters = filtersFromSearchParams(searchParams);

  const fetchPosts = useCallback(async (currentFilters) => {
    setLoading(true);
    setError(null);
    try {
      const { posts: fetched, nextPageToken: token } = await postService.getPosts(buildParams(currentFilters));
      setPosts(fetched ?? []);
      setNextPageToken(token ?? null);
    } catch (err) {
      setError(err.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const { posts: more, nextPageToken: token } = await postService.getPosts(buildParams(filters, nextPageToken));
      setPosts(prev => [...prev, ...(more ?? [])]);
      setNextPageToken(token ?? null);
    } catch (err) {
      setError(err.message || 'Failed to load more posts');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setSearchParams(filtersToSearchParams(newFilters), { replace: true });
  };

  useEffect(() => {
    fetchPosts(filters);
  }, [searchParams]);

  return (
    <Box maxW="800px" mx="auto" mt="80px" px={4} pb={8}>
      <Text fontSize="2xl" mb={4}>Discovery Feed</Text>
      <FeedFilterBar filters={filters} onChange={handleFilterChange} />
      {loading && <Text>Loading posts...</Text>}
      {error && <Text color="red.500">{error}</Text>}
      {!loading && !error && posts.length === 0 && <Text>No posts found.</Text>}
      {posts.map(post => <FeedPostCard key={post.postId} post={post} />)}
      {nextPageToken && (
        <Button onClick={loadMore} loading={loadingMore} mt={4} w="full" variant="outline">
          Load More
        </Button>
      )}
    </Box>
  );
}

export default DiscoveryFeed;