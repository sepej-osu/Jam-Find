import {
  Box,
  Text,
  Flex,
  Tag,
  Icon,
  Avatar,
  IconButton,
  Separator,
  Link,
  Badge,
  Wrap
} from '@chakra-ui/react';
import { toaster } from "./ui/toaster"
import { FaMapMarkerAlt } from 'react-icons/fa';
import { IoHeart, IoHeartOutline } from 'react-icons/io5';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import postService from '../services/postService';
import { INSTRUMENT_DISPLAY_NAMES, GENRE_DISPLAY_NAMES, POST_TYPE_DISPLAY_NAMES, POST_TYPE_PLAY_LABELS } from '../utils/displayNameMappings';
import { getSkillColor, getInstrumentIcon } from '../utils/iconMappings';
import { getRelativeTime, getDistanceMiles } from '../utils/helpers';
import { Tooltip } from './ui/tooltip';

function FeedPostCard({ post, userLat = null, userLng = null }) {
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [isLiked, setIsLiked] = useState(post.likedByCurrentUser || false);
  const [likingInProgress, setLikingInProgress] = useState(false);
  const navigate = useNavigate();
  const instrumentLabel = POST_TYPE_PLAY_LABELS[post.postType];

  const distanceMiles =
    userLat !== null && userLng !== null &&
    post.location?.lat != null && post.location?.lng != null
      ? getDistanceMiles(userLat, userLng, post.location.lat, post.location.lng)
      : null;

  const handleLikeToggle = async () => {
    if (likingInProgress) return;

    try {
      setLikingInProgress(true);
      const response = await postService.toggleLike(post.postId);
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
  
return (
    <Box maxW="1000px" mx="auto" p={3} mb={4} borderWidth="1px" borderRadius="lg" bg="white" boxShadow="md">
        <Flex align="center" mb={4}>
          <Avatar.Root size="xl" shape="rounded" mr={3} cursor="pointer" onClick={() => navigate(`/profile/${post.userId}`)}>
            <Avatar.Fallback name={`${post.firstName} ${post.lastName}`} />
            <Avatar.Image src={post.profilePicUrl} />
          </Avatar.Root>
          <Box flex="1">
            <Flex justify="space-between" align="center" mb={1}>
              <Link fontWeight="semibold" fontSize="lg" onClick={() => navigate(`/posts/${post.postId}`)} cursor="pointer">
                {post.title}
              </Link>
              {post.postType && (
                <Tag.Root size="sm" color="white" fontWeight="medium" bg="blue.400">
                  {POST_TYPE_DISPLAY_NAMES[post.postType] ?? post.postType}
                </Tag.Root>
              )}
            </Flex>
            {(post.location?.formattedAddress || distanceMiles !== null) && (
              <Flex align="center" color="gray.600">
                <Link fontSize="sm" fontWeight="semibold" mr={1} onClick={() => navigate(`/profile/${post.userId}`)} cursor="pointer">{post.firstName} {post.lastName}</Link>
                <Text fontSize="sm" mx={1}>·</Text>
                <Tooltip content={new Date(post.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })} showArrow>
                  <Text fontSize="sm" color="gray.500" cursor="default" mr={1}>{getRelativeTime(post.createdAt)}</Text>
                </Tooltip>
                <Text fontSize="sm" mx={1}>·</Text>
                <Icon as={FaMapMarkerAlt} color="red.600" mr="1" />
                {post.location?.formattedAddress && (
                  <Text fontSize="sm">{post.location.formattedAddress}</Text>
                )}
                {distanceMiles !== null && (
                  <>
                    {post.location?.formattedAddress && <Text fontSize="sm" mx={1}>·</Text>}
                    <Text fontSize="sm" color="gray.500">{distanceMiles < 5 ? 'within 5 mi' : `~${Math.round(distanceMiles)} mi away`}</Text>
                  </>
                )}
              </Flex>
            )}
          </Box>
        </Flex>

        <Separator mb={4} />

        <Box mb={6}>
          <Text fontSize="lg" color="gray.800" whiteSpace="pre-wrap">
            {post.body}
          </Text>
        </Box>
        
        {post.instruments?.length > 0 && (
          <Box mb={2}>
            {instrumentLabel && (
              <Text fontSize="sm" fontWeight="semibold" mb={1}>{instrumentLabel}</Text>
            )}
            <Wrap gap={1}>
              {post.instruments.map((i, index) => (
                <Tooltip key={index} openDelay={10} closeDelay={10} content={`Skill level: ${i.skillLevel}/5`} showArrow>
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
                <Badge key={index} bg="blue.subtle" color="blue.fg">
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
              colorPalette={isLiked ? "red" : "gray"}
              variant="ghost"
              onClick={handleLikeToggle}
              loading={likingInProgress}
              size="lg"><Icon as={isLiked ? IoHeart : IoHeartOutline} boxSize={6} /></IconButton>
            <Text fontWeight="semibold" fontSize="md">
              {likesCount} {likesCount === 1 ? 'like' : 'likes'}
            </Text>
          </Flex>
        </Flex>
    </Box>
  );
}

export default FeedPostCard;