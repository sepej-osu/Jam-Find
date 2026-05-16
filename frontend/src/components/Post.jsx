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
  Button,
  IconButton,
  Separator,
  Link,
  Wrap,
  Image,
  Skeleton,
  Dialog,
  CloseButton,
  Portal,
} from '@chakra-ui/react';
import { FaMapMarkerAlt, FaCommentAlt, FaTrash } from 'react-icons/fa';
import { IoHeart, IoHeartOutline } from 'react-icons/io5';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import postService from '../services/postService';
import { toaster } from './ui/toaster';
import { INSTRUMENT_DISPLAY_NAMES, GENRE_DISPLAY_NAMES, POST_TYPE_DISPLAY_NAMES, POST_TYPE_PLAY_LABELS } from '../utils/displayNameMappings';
import { useAuth } from '../contexts/AuthContext';
import { getInstrumentIcon, getSkillColor } from '../utils/iconMappings';
import { getRelativeTime, deleteStoragePaths, pathFromStorageUrl } from '../utils/helpers';
import { Tooltip } from './ui/tooltip';
import { useLike } from '../hooks/useLike';
import { useStartConversation } from '../hooks/useStartConversation';
import { postImageDialog } from './ui/PostImageDialog';

function Post() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const isOwnPost = currentUser?.uid === post?.userId;
  const { likesCount, isLiked, likingInProgress, handleLikeToggle } = useLike(postId, post?.likes || 0, post?.likedByCurrentUser || false);
  const { messagingInProgress, handleStartConversation } = useStartConversation();
  const [deletingInProgress, setDeletingInProgress] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Prompt user to confirm deletion, then delete the post, clean up associated media from storage, and navigate back to feed
  const handleDelete = async () => {
    setDeleteDialogOpen(false);
    // Disable the delete button and show loading state during deletion process
    try {
      setDeletingInProgress(true);
      await postService.deletePost(post.postId); // Delete the post from the database first
      const paths = [post.photoUrl, post.photoThumbUrl, post.songUrl]
        .map(pathFromStorageUrl) // Convert URLs to storage paths for deletion
        .filter(Boolean); // Filter out any nulls (if URL was invalid or not a storage URL)
      await deleteStoragePaths(currentUser.uid, paths); // Clean up media files from storage after the post is deleted
      navigate('/feed'); // Navigate back to the feed after deletion
    } catch (err) {
      toaster.create({
        title: 'Failed to delete post',
        description: err.message || 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setDeletingInProgress(false); // Re-enable the delete button in case of error
    }
  };

useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await postService.getPost(postId);
        if (data) {
          setPost(data);
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
    <>
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

      <Flex gap={3} mb={3} align="flex-start">
        <Box flex="1">
          <Text fontSize="lg" color="jam.text" whiteSpace="pre-wrap">
            {post.body}
          </Text>

          {post.instruments?.length > 0 && (
            <Box mt={2} mb={2}>
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
            <Box>
              <Wrap gap={1}>
                {post.genres.map((g, index) => (
                  <Badge key={index} variant="jam">
                    {GENRE_DISPLAY_NAMES[g] ?? g}
                  </Badge>
                ))}
              </Wrap>
            </Box>
          )}

          {post.songUrl && (
            <Box mt={2}>
              <audio controls src={post.songUrl} style={{ width: '100%' }} />
            </Box>
          )}
        </Box>
        {post.photoUrl && (
          <Box flexShrink={0} layerStyle="postImage">
            <Skeleton loading={!thumbLoaded} borderRadius="md" width="100%" height="100%">
              <Image
                src={post.photoThumbUrl || post.photoUrl}
                alt="Post photo"
                borderRadius="md"
                maxH="100%"
                maxW="100%"
                fit="cover"
                display="block"
                ml="auto"
                cursor="pointer"
                onLoad={() => setThumbLoaded(true)}
                onClick={() => postImageDialog.open(post.postId, { photoUrl: post.photoUrl })}
              />
            </Skeleton>
          </Box>
        )}
      </Flex>

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
        {!isOwnPost && currentUser?.uid && (
          <Button
            size="sm"
            variant="jam"
            onClick={() => handleStartConversation(post.userId)}
            loading={messagingInProgress}
          >
            <Icon as={FaCommentAlt} />
            Message
          </Button>
        )}
        {isOwnPost && (
          <Button
            size="sm"
            colorPalette="red"
            variant="solid"
            onClick={() => setDeleteDialogOpen(true)}
            loading={deletingInProgress}
          >
            <Icon as={FaTrash} />
            Delete Post
          </Button>
        )}
      </Flex>
    </Box>
    <postImageDialog.Viewport />
    <Dialog.Root open={deleteDialogOpen} onOpenChange={(e) => setDeleteDialogOpen(e.open)}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete Post</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>Are you sure you want to delete this post? This action cannot be undone.</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="red" onClick={handleDelete} loading={deletingInProgress}>Delete</Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
    </>
  );
}

export default Post;