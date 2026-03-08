import {
  Box,
  Heading,
  Text,
  Flex,
  Badge,
  Icon,
  VStack,
  Spinner,
  Alert,
  Avatar,
  IconButton,
  Separator,
  Link,
  Wrap,
} from '@chakra-ui/react';
import { toaster } from "./ui/toaster"
import { FaMapMarkerAlt } from 'react-icons/fa';
import { IoHeart, IoHeartOutline } from 'react-icons/io5';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import postService from '../services/postService';
import { INSTRUMENT_DISPLAY_NAMES, GENRE_DISPLAY_NAMES, POST_TYPE_DISPLAY_NAMES, POST_TYPE_PLAY_LABELS } from '../utils/displayNameMappings';
import { getInstrumentIcon, getSkillColor } from '../utils/iconMappings';
import { getRelativeTime } from '../utils/helpers';
import { Tooltip } from './ui/tooltip';

function Post() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likingInProgress, setLikingInProgress] = useState(false);

useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await postService.getPost(postId);
        
        if (data) {
          setPost(data);
          setLikesCount(data.likes || 0);
          setIsLiked(data.likedByCurrentUser || false);
        } else {
          setError('Post not found');
        }
      } catch (err) {
        setError(err.message || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    if (postId) fetchPost();
  }, [postId]);

  const handleLikeToggle = async () => {
    if (likingInProgress) return;
    
    try {
      setLikingInProgress(true);
      const response = await postService.toggleLike(postId);
      
      // Update local state based on response
      setLikesCount(response.likes);
      setIsLiked(response.liked);
    } catch (err) {
      console.error('Failed to toggle like:', err);
      toaster.create({
        title: 'Failed to update like',
        description: err.message || 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLikingInProgress(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
        <Spinner size="xl" color="blue.500" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box maxW="600px" mx="auto" mt="80px" p="40px">
        <Alert.Root status="error" borderRadius="md">
          <Alert.Indicator />
          {error}
        </Alert.Root>
      </Box>
    );
  }

  if (!post) {
    return (
      <Box maxW="600px" mx="auto" mt="80px" p="40px">
        <Alert.Root status="info" borderRadius="md">
          <Alert.Indicator />
          Post not found
        </Alert.Root>
      </Box>
    );
  }
  
return (
    <Box maxW="1000px" mx="auto" mb={4} layerStyle="card">
      {/* Header: avatar + title + post type */}
      <Flex align="center" mb={4}>
        <Avatar.Root size="xl" shape="rounded" mr={3} cursor="pointer" onClick={() => navigate(`/profile/${post.userId}`)}>
          <Avatar.Fallback name={`${post.firstName} ${post.lastName}`} />
          <Avatar.Image src={post.profilePicUrl} />
        </Avatar.Root>
        <Box flex="1">
          <Flex justify="space-between" align="center" mb={1}>
            <Heading size="lg" color="jam.text">{post.title}</Heading>
            {post.postType && (
              <Badge size="sm" color="jam.text" fontWeight="medium" bg="jam.50">
                {POST_TYPE_DISPLAY_NAMES[post.postType] ?? post.postType}
              </Badge>
            )}
          </Flex>
          {(post.location?.formattedAddress) && (
            <Flex align="center" color="jam.textMuted">
              <Link fontSize="sm" color="jam.text" fontWeight="semibold" mr={1} onClick={() => navigate(`/profile/${post.userId}`)} cursor="pointer">{post.firstName} {post.lastName}</Link>
              <Text fontSize="sm" mx={1}>·</Text>
              <Tooltip content={new Date(post.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })} contentProps={{ bg: "jam.800", color: "jam.50" }}>
                <Text fontSize="sm" cursor="default" mr={1}>{getRelativeTime(post.createdAt)}</Text>
              </Tooltip>
              <Text fontSize="sm" mx={1}>·</Text>
              <Icon as={FaMapMarkerAlt} color="red.600" mr="1" />
              <Text fontSize="sm">{post.location.formattedAddress}</Text>
            </Flex>
          )}
        </Box>
      </Flex>

      <Separator mb={2} />

      <Box mb={3}>
        <Text fontSize="lg" color="jam.text" whiteSpace="pre-wrap">
          {post.body}
        </Text>
      </Box>

      {post.instruments?.length > 0 && (
        <Box mb={2}>
          {POST_TYPE_PLAY_LABELS[post.postType] && (
            <Text fontSize="sm" color="jam.textMuted" fontWeight="normal" mb={1}>{POST_TYPE_PLAY_LABELS[post.postType]}</Text>
          )}
          <Wrap gap={1}>
            {post.instruments.map((i, index) => (
              <Tooltip key={index} openDelay={10} closeDelay={10} content={`Skill level: ${i.skillLevel}/5`}>
                <Badge
                  bg={`${getSkillColor(i.skillLevel)}.subtle`}
                  color={`${getSkillColor(i.skillLevel)}.fg`}
                  cursor="default">
                  <Icon as={getInstrumentIcon(i.name)} />
                  {INSTRUMENT_DISPLAY_NAMES[i.name] ?? i.name}
                </Badge>
              </Tooltip>
            ))}
          </Wrap>
        </Box>
      )}

      {post.genres?.length > 0 && (
        <Box mb={3}>
          <Wrap gap={1}>
            {post.genres.map((g, index) => (
              <Badge key={index} variant="jam">
                {GENRE_DISPLAY_NAMES[g] ?? g}
              </Badge>
            ))}
          </Wrap>
        </Box>
      )}

      <Separator my={4} />

      {/* Likes Section */}
      <Flex justify="space-between" align="center" mb={0}>
        <Flex align="center" gap={2}>
          <IconButton
            aria-label={isLiked ? "Unlike post" : "Like post"}
            variant="ghost"
            onClick={handleLikeToggle}
            loading={likingInProgress}
            size="lg"><Icon as={isLiked ? IoHeart : IoHeartOutline} boxSize={6} color={isLiked ? "jam.liked" : "jam.textMuted"} /></IconButton>
          <Text color="jam.text" fontWeight="semibold" fontSize="md">
            {likesCount} {likesCount === 1 ? 'like' : 'likes'}
          </Text>
        </Flex>
        <Flex fontSize="sm" color="jam.textMuted" gap={2}>
          <Text>{new Date(post.createdAt).toLocaleDateString()}</Text>
          {post.edited && <Text>(edited)</Text>}
        </Flex>
      </Flex>
    </Box>
  );
}

export default Post;