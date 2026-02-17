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
  AlertIcon,
  Badge,
  Divider,
  Avatar
} from '@chakra-ui/react';
import { FaMapMarkerAlt, FaGuitar } from 'react-icons/fa';
import { IoMusicalNotes } from 'react-icons/io5';
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
import profileService from './services/profileService';

function Post() {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await postService.getPost(postId);
        setPost(data);
        
        // Fetch the profile of the user who created the post
        if (data?.userId) {
          const profileData = await profileService.getProfile(data.userId);
          setProfile(profileData);
        }
      } catch (err) {
        setError(err.message || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPost();
    }
  }, [postId]);

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
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }

  if (!post) {
    return (
      <Box maxW="600px" mx="auto" mt="80px" p="40px">
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          Post not found
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
      >
        <Badge colorScheme="blue" fontSize="md" mb={3}>
          {getPostTypeLabel(post.postType)}
        </Badge>


        {profile && (
          <Flex align="center" mb={4}>
            <Avatar 
              size="md" 
              src={profile.profilePictureUrl} 
              name={`${profile.firstName} ${profile.lastName}`}
              mr={3}
            />
            <Box>
              <Text fontWeight="semibold" fontSize="md">
                {profile.firstName} {profile.lastName}
              </Text>
              {profile.location?.formattedAddress && (
                <Text fontSize="sm" color="gray.600">
                  <Icon as={FaMapMarkerAlt} color="red.600" display="inline" mb="-1px" mr="1" />
                  {profile.location.formattedAddress}
                </Text>
              )}
            </Box>
          </Flex>
        )}

        <Heading size="lg" mb={4}>
          {post.title}
        </Heading>

        

        {post.location?.formattedAddress && (
          <Flex align="center" mb={4} color="gray.600">
            <Icon as={FaMapMarkerAlt} color="red.600" mr={2} />
            <Text fontSize="md">{post.location.formattedAddress}</Text>
          </Flex>
        )}

        <Divider mb={4} />

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
                  <VStack align="stretch" spacing={1}>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="sm" color="gray.600">Experience Level</Text>
                      <Text fontSize="sm" fontWeight="bold" color={`${getExperienceColor(instrument.experienceLevel)}.600`}>
                        {instrument.experienceLevel}/5
                      </Text>
                    </Flex>
                    <Progress 
                      value={instrument.experienceLevel * 20} 
                      size="sm" 
                      colorScheme={getExperienceColor(instrument.experienceLevel)}
                      borderRadius="full"
                    />
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
                <Tag key={index} size="md" color="white" fontWeight="semibold" bg="blue.500">
                  {genre}
                </Tag>
              ))}
            </Flex>
          </Box>
        )}

        <Divider my={4} />
        <Flex justify="space-between" fontSize="sm" color="gray.500">
          <Text>{new Date(post.created_at).toLocaleDateString()}</Text>
          {post.edited && <Text>(edited)</Text>}
        </Flex>
      </Box>
    </Box>
  );
}

export default Post;