import { Box, Text, Button, VStack } from '@chakra-ui/react';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import postService from './services/postService';
import FeedPostCard from './components/FeedPostCard';

function DiscoveryFeed() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);   // missing state
  const [error, setError] = useState(null);        // missing state
  const [posts, setPosts] = useState([]);

  useEffect(() => {                                // moved inside component
    const fetchPosts = async () => {
      try {
        setError(null);
        const { posts: fetchedPosts } = await postService.getPosts();
        if (fetchedPosts) {
            setPosts(fetchedPosts);
        } else {
            setError('Posts not found');
        }
      } catch (err) {
        setError(err.message || 'Failed to load posts');
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <Box maxW="800px" mx="auto" mt="80px" p="40px"
      borderWidth="1px" borderRadius="lg" boxShadow="md" bg="white">
      <Text fontSize="2xl" mb={4}>Discovery Feed</Text>
        {loading && <Text>Loading posts...</Text>}
        {error && <Text color="red.500">{error}</Text>}
        {!loading && !error && posts.length === 0 && <Text>No posts found.</Text>}
        {!loading && !error && posts.map(post => (
            <FeedPostCard key={post.postId} post={post} />
        ))}
    </Box>
  );
}

export default DiscoveryFeed;