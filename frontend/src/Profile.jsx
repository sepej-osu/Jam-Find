
import {
  Steps,
  Box,
  Heading,
  Text,
  Image,
  Grid,
  GridItem,
  IconButton,
  Button,
  Flex,
  Badge,
  Icon,
  Progress,
  VStack,
  Wrap,
  WrapItem,
  Spinner,
  Alert
} from '@chakra-ui/react';
import InstrumentCard from './components/ui/InstrumentCard';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { FaMapMarkerAlt, FaCommentAlt } from 'react-icons/fa';
import { CgPlayButtonO, CgProfile } from "react-icons/cg";
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import profileService from './services/profileService';
import conversationService from './services/conversationService';
import { toaster } from './components/ui/toaster';
import { INSTRUMENT_DISPLAY_NAMES, GENRE_DISPLAY_NAMES, GENDER_DISPLAY_NAMES } from './utils/displayNameMappings';
import { getDistanceMiles } from './utils/helpers';

function Profile() {
  const { userId } = useParams();
  const { currentUser, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const items = Array.from({ length: 5 });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [messageLoading, setMessageLoading] = useState(false);

  // Use the userId from URL params, or fall back to current user's ID
  const profileUserId = userId || currentUser?.uid;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await profileService.getProfile(profileUserId);
        setProfile(data);
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (profileUserId) {
      fetchProfile();
    }
  }, [profileUserId]);

  const canMessageUser = !!currentUser?.uid && !!profileUserId && currentUser.uid !== profileUserId;

  const handleMessageUser = async () => {
    if (!canMessageUser || messageLoading) return;

    try {
      setMessageLoading(true);
      const conversation = await conversationService.createConversation(profileUserId);
      navigate(`/messages/${conversation.conversationId}`);
    } catch (err) {
      toaster.create({
        title: 'Unable to start conversation',
        description: err.message || 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setMessageLoading(false);
    }
  };

  const userLat = currentUserProfile?.location?.lat ?? null;
  const userLng = currentUserProfile?.location?.lng ?? null;

  const distanceMiles =
    userLat !== null && userLng !== null &&
    profile?.location?.lat != null && profile?.location?.lng != null
      ? getDistanceMiles(userLat, userLng, profile.location.lat, profile.location.lng)
      : null;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % items.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + items.length) % items.length);
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

  if (!profile) {
    return (
      <Box maxW="600px" mx="auto" mt="80px" p="40px">
        <Alert.Root status="info" borderRadius="md">
          <Alert.Indicator />
          Profile not found
        </Alert.Root>
      </Box>
    );
  }
  
  return (
    <Grid
      templateColumns="repeat(5, 1fr)"
      gap={0}
      mx="auto"
      layerStyle="card"
    >
      <GridItem colSpan={3} textAlign="left">
        <Box mb={4}>
          <Flex align="center" justify="space-between" pr={4}>
            <Heading size="2xl">{profile?.firstName} {profile?.lastName}</Heading>
            {canMessageUser && (
              <Button
                size="sm"
                variant="jam"
                onClick={handleMessageUser}
                loading={messageLoading}
              >
                <Icon as={FaCommentAlt} />
                Message
              </Button>
            )}
          </Flex>
          <Text fontSize="sm" color="gray.600" mt={1}>
            {profile?.gender ? GENDER_DISPLAY_NAMES[profile.gender] + ' · ' : 'No gender set · '}
            <Icon as={FaMapMarkerAlt} color="red.600" display="inline" mb="-1px" mr="1" />
            {profile?.location?.formattedAddress || 'No location set'}
            {distanceMiles !== null && (
              <>
                {profile?.location?.formattedAddress && <Text as="span" mx={1}>·</Text>}
                <Text as="span">{distanceMiles < 5 ? 'within 5 mi' : `~${Math.round(distanceMiles)} mi away`}</Text>
              </>
            )}
          </Text>
        </Box>
        <GridItem colSpan={4} textAlign="left" pr={4}>
          <Box mb={4}>
            <Text fontSize="lg" fontWeight="semibold" mb={1}>Bio:</Text>
            <Text fontSize="lg" color="gray.900">{profile?.bio}</Text>
          </Box>
        </GridItem>
        <Box mb={4} pr={4}>
          <Text fontSize="lg" fontWeight="semibold" mb={1}>Instruments Played:</Text>
          <Wrap gap={3}>
            {profile?.instruments?.length > 0 ? (
              profile.instruments.map((instrument, index) => (
                <WrapItem key={index} flex="1" minW="200px">
                  <InstrumentCard instrument={instrument} w="100%" />
                </WrapItem>
              ))
            ) : (
              <Text fontSize="md" color="gray.600">No instruments listed</Text>
            )}
          </Wrap>
        </Box>
        <Box mb={4}>
          <Text fontSize="lg" fontWeight="semibold" mb={1}>Genres Played:</Text>
          <Flex gap={2} flexWrap="wrap">
            {profile?.genres?.length > 0 ? (
              profile.genres.map((genre, index) => (
                <Badge key={index} variant="jam">
                  {GENRE_DISPLAY_NAMES[genre] ?? genre}
                </Badge>
              ))
            ) : (
              <Text fontSize="md" color="gray.600">No genres listed</Text>
            )}
          </Flex>
        </Box>
      </GridItem>
      <GridItem rowSpan={2} colSpan={2} pt={1}>
        <Box 
          p={3}
          borderWidth="1px" 
          borderRadius="md" 
          bg="white"
          boxShadow="sm"
          height="400px" 
          width="100%"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {profile?.profilePictureUrl ? (
            <Image borderRadius="full" src={profile.profilePictureUrl} alt={`${profile?.firstName}'s profile picture`} />
          ) : (
            <Icon as={CgProfile} boxSize="150px" color="gray.300" aria-label="Profile Picture" />
          )}
        </Box>
      </GridItem>
      <GridItem colSpan={3} pr={4}>
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={2}>Media:</Text>
          <Box maxW="100%" position="relative">
            <Box overflow="hidden" borderRadius="lg">
              <Box
                display="flex"
                transform={`translateX(-${currentSlide * 100}%)`}
                transition="transform 0.3s ease"
              >
                {items.map((_, index) => (
                  <Box
                    key={index}
                    minW="100%"
                    h="100px"
                    bg="gray.100"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="2.5rem"
                  >
                    <Icon as={CgPlayButtonO} color="blue.500" />
                  </Box>
                ))}
              </Box>
            </Box>
            <Flex justifyContent="center" alignItems="center" gap={4} mt={4}>
              <IconButton size="xs" variant="ghost" onClick={prevSlide} aria-label="Previous Slide"><LuChevronLeft /></IconButton>
              <Flex gap={2}>
                {items.map((_, index) => (
                  <Box
                    as="button"
                    type="button"
                    key={index}
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg={currentSlide === index ? "blue.500" : "gray.300"}
                    cursor="pointer"
                    aria-label={`Go to slide ${index + 1}`}
                    aria-current={currentSlide === index ? "true" : undefined}
                  />
                ))}
              </Flex>
              <IconButton size="xs" variant="ghost" onClick={nextSlide} aria-label="Next Slide"><LuChevronRight /></IconButton>
            </Flex>
          </Box>
        </Box>
      </GridItem>
    </Grid>
  );
}

export default Profile;
