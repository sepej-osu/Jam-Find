import { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Tag,
  Icon,
  VStack,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Divider,
  Avatar,
  IconButton,
  useToast,
  HStack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Button
} from '@chakra-ui/react';
import { FaMapMarkerAlt, FaGuitar } from 'react-icons/fa';
import { IoMusicalNotes, IoHeart, IoHeartOutline } from 'react-icons/io5';
import {
  GiGuitarHead,
  GiGuitarBassHead,
  GiDrumKit,
  GiGrandPiano,
  GiMusicalKeyboard,
  GiMicrophone,
  GiMusicSpell,
  GiTrumpet,
  GiSaxophone
} from 'react-icons/gi';
import { useNavigate } from 'react-router-dom';
import postService from './services/postService';
import profileService from './services/profileService';

function Feed() {
  const navigate = useNavigate();
  const toast = useToast();

  const [radiusMiles, setRadiusMiles] = useState(25);
  const [posts, setPosts] = useState([]);
  const [profilesByUserId, setProfilesByUserId] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await postService.getFeed({ radiusMiles, limit: 50 });
        setPosts(Array.isArray(data) ? data : []);

      } catch (err) {
        setError(err.message || 'Failed to load feed');
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [radiusMiles, refreshTick]);

  useEffect(() => {
    const fetchMissingProfiles = async () => {
      try {
        setLoadingProfiles(true);

        const uniqueUserIds = Array.from(new Set((posts || []).map(p => (p.userId || p.user_id)).filter(Boolean)));
        const missing = uniqueUserIds.filter(uid => !profilesByUserId[uid]);

        if (missing.length === 0) {
          setLoadingProfiles(false);
          return;
        }

        const results = await Promise.allSettled(missing.map(uid => profileService.getProfile(uid)));

        const next = { ...profilesByUserId };
        for (let i = 0; i < missing.length; i++) {
          if (results[i].status === 'fulfilled') {
            next[missing[i]] = results[i].value;
          }
        }

        setProfilesByUserId(next);

      } finally {
        setLoadingProfiles(false);
      }
    };

    if (posts.length > 0) {
      fetchMissingProfiles();
    }
  }, [posts]);

  const getPostTypeLabel = (type) => {
    const typeMap = {
      'looking_to_jam': 'Looking to Jam 🎶',
      'looking_for_band': 'Looking for a Band 🎤',
      'looking_for_musicians': 'Looking for Musicians 🎸',
      'sharing_music': 'Sharing Music 🎵'
    };
    return typeMap[type] || type;
  };

  const getInstrumentIcon = (instrumentName) => {
    const iconMap = {
      'Electric Guitar': GiGuitarHead,
      'Acoustic Guitar': FaGuitar,
      'Electric Bass': GiGuitarBassHead,
      'Drums': GiDrumKit,
      'Piano': GiGrandPiano,
      'Keyboard': GiMusicalKeyboard,
      'Vocals': GiMicrophone,
      'DJ/Production': GiMusicSpell,
      'Trumpet': GiTrumpet,
      'Saxophone': GiSaxophone,
      'Other': IoMusicalNotes
    };
    return iconMap[instrumentName] || IoMusicalNotes;
  };

  const handleLikeToggle = async (postId) => {
    try {
      const response = await postService.toggleLike(postId);

      setPosts(prev => prev.map(p => {
        if (p.postId !== postId) return p;
        return {
          ...p,
          likes: response.likes,
          likedByCurrentUser: response.liked
        };
      }));

    } catch (err) {
      toast({
        title: 'Failed to update like',
        description: err.message || 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
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
      <Box maxW="900px" mx="auto" mt="80px" p="40px">
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box maxW="1000px" mx="auto" p={6}>
      <Box
        p={6}
        borderWidth="1px"
        borderRadius="lg"
        bg="white"
        boxShadow="md"
        mb={6}
      >
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size="lg">Feed</Heading>
          <Button
            colorScheme="blue"
            variant="outline"
            onClick={() => setRefreshTick(t => t + 1)}
          >
            Refresh
          </Button>
        </Flex>

        <VStack spacing={1} align="stretch">
          <HStack justify="space-between">
            <Text fontWeight="semibold">Distance</Text>
            <Text fontSize="sm" color="gray.600">Within {radiusMiles} miles</Text>
          </HStack>
          <Slider
            value={radiusMiles}
            min={1}
            max={500}
            step={1}
            onChange={(val) => setRadiusMiles(val)}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </VStack>

        {loadingProfiles && (
          <Text mt={3} fontSize="sm" color="gray.600">
            Loading profiles...
          </Text>
        )}
      </Box>

      {posts.length === 0 ? (
        <Box
          p={6}
          borderWidth="1px"
          borderRadius="lg"
          bg="white"
          boxShadow="md"
        >
          <Text color="gray.700">No posts found within {radiusMiles} miles.</Text>
        </Box>
      ) : (
        <VStack spacing={6} align="stretch">
          {posts.map((post) => {
            const authorId = post.userId || post.user_id;
            const postType = post.postType || post.post_type;
            const createdAt = post.created_at || post.createdAt;

            const author = authorId ? profilesByUserId[authorId] : null;
            const likesCount = post.likes || 0;
            const isLiked = post.likedByCurrentUser || false;

            return (
              <Box
                key={post.postId}
                p={6}
                borderWidth="1px"
                borderRadius="lg"
                bg="white"
                boxShadow="md"
                cursor="pointer"
                onClick={() => navigate(`/posts/${post.postId}`)}
              >
                <Flex justify="space-between" align="center" mb={3}>
                  <Badge colorScheme="blue" fontSize="md">
                    {getPostTypeLabel(postType)}
                  </Badge>

                  {typeof post.distanceMiles === 'number' && (
                    <Text fontSize="sm" color="gray.600">
                      {post.distanceMiles} miles away
                    </Text>
                  )}
                </Flex>

                {author && (
                  <Flex align="center" mb={4}>
                    <Avatar
                      size="sm"
                      src={author.profilePicUrl}
                      name={`${author.firstName} ${author.lastName}`}
                      mr={3}
                    />
                    <Box>
                      <Text fontWeight="semibold" fontSize="md">
                        {author.firstName} {author.lastName}
                      </Text>
                      {author.location?.formattedAddress && (
                        <Text fontSize="sm" color="gray.600">
                          <Icon as={FaMapMarkerAlt} color="red.600" display="inline" mb="-1px" mr="1" />
                          {author.location.formattedAddress}
                        </Text>
                      )}
                    </Box>
                  </Flex>
                )}

                <Heading size="md" mb={3}>
                  {post.title}
                </Heading>

                {post.location?.formattedAddress && (
                  <Flex align="center" mb={3} color="gray.600">
                    <Icon as={FaMapMarkerAlt} color="red.600" mr={2} />
                    <Text fontSize="md">{post.location.formattedAddress}</Text>
                  </Flex>
                )}

                <Divider mb={4} />

                <Text fontSize="md" color="gray.800" noOfLines={4} whiteSpace="pre-wrap">
                  {post.body}
                </Text>

                {post.instruments?.length > 0 && (
                  <Box mt={4}>
                    <Flex gap={2} flexWrap="wrap">
                      {post.instruments.slice(0, 6).map((instrument, idx) => (
                        <Tag key={idx} size="md" color="white" fontWeight="semibold" bg="gray.700">
                          <Icon as={getInstrumentIcon(instrument.name)} boxSize={4} mr={2} />
                          {instrument.name}
                        </Tag>
                      ))}
                    </Flex>
                  </Box>
                )}

                {post.genres?.length > 0 && (
                  <Box mt={4}>
                    <Flex gap={2} flexWrap="wrap">
                      {post.genres.slice(0, 8).map((genre, idx) => (
                        <Tag key={idx} size="md" color="white" fontWeight="semibold" bg="blue.500">
                          {genre}
                        </Tag>
                      ))}
                    </Flex>
                  </Box>
                )}

                <Divider my={4} />

                <Flex justify="space-between" align="center">
                  <Flex align="center" gap={2}>
                    <IconButton
                      aria-label={isLiked ? "Unlike post" : "Like post"}
                      icon={<Icon as={isLiked ? IoHeart : IoHeartOutline} boxSize={6} />}
                      colorScheme={isLiked ? "red" : "gray"}
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleLikeToggle(post.postId);
                      }}
                      size="lg"
                    />
                    <Text fontWeight="semibold" fontSize="md">
                      {likesCount} {likesCount === 1 ? 'like' : 'likes'}
                    </Text>
                  </Flex>

                  <Text fontSize="sm" color="gray.500">
                    {createdAt ? new Date(createdAt).toLocaleDateString() : ''}
                  </Text>
                </Flex>
              </Box>
            );
          })}
        </VStack>
      )}
    </Box>
  );
}

export default Feed;
