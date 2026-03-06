import { Box, Text, Button, Spinner, Center, EmptyState, List, VStack } from '@chakra-ui/react';
import { IoMusicalNotes } from 'react-icons/io5';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import postService from './services/postService';
import FeedPostCard from './components/FeedPostCard';
import FeedFilterBar from './components/FeedFilterBar';
import { useAuth } from './contexts/AuthContext';
import { filtersFromSearchParams, filtersToSearchParams, buildParams } from './services/discoveryService';

function DiscoveryFeed() {
  const { profile } = useAuth();
  const userLat = profile?.location?.lat ?? null;
  const userLng = profile?.location?.lng ?? null;
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
      const { posts: fetched, nextPageToken: token } = await postService.getPosts(buildParams(currentFilters, userLat, userLng));
      setPosts(fetched ?? []);
      setNextPageToken(token ?? null);
    } catch (err) {
      setError(err.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [userLat, userLng]);

  const loadMore = async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const { posts: more, nextPageToken: token } = await postService.getPosts(buildParams(filters, userLat, userLng, nextPageToken));
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
  }, [searchParams, fetchPosts]);

  return (
    <Box maxW="800px" mx="auto" mt="80px" px={4} pb={8}>
      <Text fontSize="2xl" mb={4}>Discovery Feed</Text>
      <FeedFilterBar filters={filters} onChange={handleFilterChange} hasLocation={userLat !== null && userLng !== null} />
      {loading && <Center py={8}><Spinner /></Center>}
      {error && <Text color="red.500">{error}</Text>}
      {!loading && !error && posts.length === 0 && (
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Indicator>
              <IoMusicalNotes />
            </EmptyState.Indicator>
            <VStack textAlign="center">
              <EmptyState.Title>No posts found</EmptyState.Title>
              <EmptyState.Description>Try adjusting your filters</EmptyState.Description>
            </VStack>
            <List.Root variant="marker">
              <List.Item>Try removing filters</List.Item>
              <List.Item>Try increasing the distance radius</List.Item>
              <List.Item>Try a different post type</List.Item>
            </List.Root>
          </EmptyState.Content>
        </EmptyState.Root>
      )}
      {posts.map(post => <FeedPostCard key={post.postId} post={post} userLat={userLat} userLng={userLng} />)}
      {nextPageToken && (
        <Button onClick={loadMore} loading={loadingMore} mt={4} w="full" variant="outline">
          Load More
        </Button>
      )}
    </Box>
  );
}

export default DiscoveryFeed;