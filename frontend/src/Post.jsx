import {
  Box,
  Heading,
  Text,
  Flex,
  Tag,
  Icon,
  Progress,
  VStack,
  Spinner,
  Alert,
  Avatar,
  IconButton,
  Separator
} from '@chakra-ui/react';
import { toaster } from "./components/ui/toaster"
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
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import postService from './services/postService';

function Post() {
  const { postId } = useParams();
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

  const getExperienceColor = (level) => {
    const colorMap = {
      1: 'red',
      2: 'orange',
      3: 'yellow',
      4: 'teal',
      5: 'green'
    };
    return colorMap[level] || 'gray';
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
    <Box maxW="1000px" mx="auto" p={6}>
      <Box p={6} borderWidth="1px" borderRadius="lg" bg="white" boxShadow="md">
        
        {/* Render Author Info directly from the post object */}
        <Flex align="center" mb={4}>
          <Avatar.Root size="md" mr={3}>
            <Avatar.Fallback name={`${post.firstName} ${post.lastName}`} />
            <Avatar.Image src={post.profilePicUrl} />
          </Avatar.Root>
          <Box>
            <Text fontWeight="semibold" fontSize="md">
              {post.firstName} {post.lastName}
            </Text>
            {/* If you also embedded the location in the snapshot, 
               you'd access it here via post.location 
            */}
            {post.location?.formattedAddress && (
              <Text fontSize="sm" color="gray.600">
                <Icon as={FaMapMarkerAlt} color="red.600" mr="1" />
                {post.location.formattedAddress}
              </Text>
            )}
          </Box>
        </Flex>

        <Heading size="lg" mb={4}>{post.title}</Heading>

        

        {post.location?.formattedAddress && (
          <Flex align="center" mb={4} color="gray.600">
            <Icon as={FaMapMarkerAlt} color="red.600" mr={2} />
            <Text fontSize="md">{post.location.formattedAddress}</Text>
          </Flex>
        )}

        <Separator mb={4} />

        <Box mb={6}>
          <Text fontSize="lg" color="gray.800" whiteSpace="pre-wrap">
            {post.body}
          </Text>
        </Box>

        {post.instruments?.length > 0 && (
          <Box mb={6}>
            <Flex gap={3} flexWrap="wrap">
              {post.instruments.map((instrument, index) => (
                <Box 
                  key={index} 
                  p={3} 
                  borderWidth="1px" 
                  borderRadius="md" 
                  bg="gray.50"
                  minW="200px"
                  boxShadow="sm"
                >
                  <Flex align="center" mb={2}>
                    <Icon as={getInstrumentIcon(instrument.name)} boxSize={5} mr={2} color="black" />
                    <Text fontSize="md" fontWeight="semibold">{instrument.name}</Text>
                  </Flex>
                  <VStack align="stretch" gap={1}>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="sm" color="gray.600">Experience Level</Text>
                      <Text fontSize="sm" fontWeight="bold" color={`${getExperienceColor(instrument.experienceLevel)}.600`}>
                        {instrument.experienceLevel}/5
                      </Text>
                    </Flex>
                    <Progress.Root
                      value={parseInt(instrument.experienceLevel * 20)}
                      size="sm"
                      colorPalette={getExperienceColor(instrument.experienceLevel)}
                      borderRadius="full">
                      <Progress.Track>
                        <Progress.Range />
                      </Progress.Track>
                    </Progress.Root>
                  </VStack>
                </Box>
              ))}
            </Flex>
          </Box>
        )}

        {post.genres?.length > 0 && (
          <Box mb={6}>
            <Flex gap={2} flexWrap="wrap">
              {post.genres.map((genre, index) => (
                <Tag.Root key={index} size="md" color="white" fontWeight="semibold" bg="blue.500">
                  {genre}
                </Tag.Root>
              ))}
            </Flex>
          </Box>
        )}

        <Separator my={4} />
        
        {/* Likes Section */}
        <Flex justify="space-between" align="center" mb={4}>
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

        <Separator mb={4} />
        
        <Flex justify="space-between" fontSize="sm" color="gray.500">
          <Text>{new Date(post.createdAt).toLocaleDateString()}</Text>
          {post.edited && <Text>(edited)</Text>}
        </Flex>
      </Box>
    </Box>
  );
}

export default Post;