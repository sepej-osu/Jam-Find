import { Box, Text, Button, Spinner, Center, EmptyState, List, VStack, HStack, Icon } from '@chakra-ui/react';
import { FaArrowUp } from 'react-icons/fa';
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
    <Box>
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
        <HStack mt={4}>
          <Button onClick={loadMore} loading={loadingMore} flex={1} variant="jam">
            Load More
          </Button>
          <Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} variant="jam">
            Back to Top <Icon as={FaArrowUp} ml={1} />
          </Button>
        </HStack>
      )}
    </Box>
  );
}

export default DiscoveryFeed;