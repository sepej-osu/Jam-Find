
import {
  Steps,
  Box,
  Heading,
  Text,
  Image,
  Grid,
  GridItem,
  IconButton,
  Flex,
  Tag,
  Icon,
  Progress,
  VStack,
  Spinner,
  Alert,
} from '@chakra-ui/react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { IoMusicalNotes } from 'react-icons/io5';
import { FaGuitar, FaMapMarkerAlt } from 'react-icons/fa';
import { CgPlayButtonO, CgProfile } from "react-icons/cg";
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
import { useAuth } from './contexts/AuthContext';
import profileService from './services/profileService';

function Profile() {
  const { userId } = useParams();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const items = Array.from({ length: 5 });
  const [currentSlide, setCurrentSlide] = useState(0);

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
      gap={4}
      p={4}
      maxW="1400px"
      mx="auto"
    >
      <GridItem rowSpan={2} colSpan={1} pt={1}>
        <Box 
          p={3}
          borderWidth="1px" 
          borderRadius="md" 
          bg="white"
          boxShadow="sm"
          height="100%" 
          width="100%"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {profile?.profilePictureUrl ? (
            <Image borderRadius="full" boxSize="150px" src={profile.profilePictureUrl} alt={`${profile?.firstName}'s profile picture`} />
          ) : (
            <Icon as={CgProfile} boxSize="150px" color="gray.300" aria-label="Profile Picture" />
          )}
        </Box>
      </GridItem>
      <GridItem colSpan={4} textAlign={'left'} pl={6}>
        <Box mb={4}>
          <Heading size="lg">{profile?.firstName} {profile?.lastName}</Heading>
          <Text fontSize="sm" fontWeight="semibold" color="gray.600" mt={1}>
            {profile?.gender && `${profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)} - `}
            <Icon as={FaMapMarkerAlt} color="red.600" display="inline" mb="-1px" mr="1" />
            {profile?.location?.formattedAddress || 'No location set'}
          </Text>
        </Box>
        <Box mt={2}>
          <Box mb={2}>
            <Text fontSize="lg" fontWeight="semibold" mb={1}>Instruments:</Text>
            <Flex gap={3} flexWrap="wrap">
              {profile?.instruments?.length > 0 ? (
                profile.instruments.map((instrument, index) => (
                  <Box 
                    key={index} 
                    p={3} 
                    borderWidth="1px" 
                    borderRadius="md" 
                    bg="white"
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
                        <Text fontSize="sm" fontWeight="bold" color={`${getExperienceColor(instrument.experienceLevel)}.600`}>{instrument.experienceLevel}/5</Text>
                      </Flex>
                      <Progress.Root
                        value={String(instrument.experienceLevel * 20)}
                        size="sm"
                        colorPalette={getExperienceColor(instrument.experienceLevel)}
                        borderRadius="full">
                        <Progress.Track>
                          <Progress.Range />
                        </Progress.Track>
                      </Progress.Root>
                    </VStack>
                  </Box>
                ))
              ) : (
                <Text fontSize="md" color="gray.600">No instruments listed</Text>
              )}
            </Flex>
          </Box>
          <Box>
            <Text fontSize="lg" fontWeight="semibold" mb={1}>Genres Played:</Text>
            <Flex gap={2} flexWrap="wrap">
              {profile?.genres?.length > 0 ? (
                profile.genres.map((genre, index) => (
                  <Tag.Root key={index} size="md" color="white" fontWeight="semibold" bg="blue.500">
                    {genre}
                  </Tag.Root>
                ))
              ) : (
                <Text fontSize="md" color="gray.600">No genres listed</Text>
              )}
            </Flex>
          </Box>
        </Box>
      </GridItem>
      <GridItem colSpan={4} textAlign={'left'} pl={6}>
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={1}>
            Bio:
          </Text>
          <Text fontSize="lg" color="gray.900">
            {profile?.bio}
          </Text>
        </Box>
      </GridItem>
      <GridItem colSpan={1}>
        {/* Spacer to align with the profile picture column */}
      </GridItem>
      <GridItem colSpan={4} textAlign={'left'} pl={6}>
        <Box mt={2}>
          <Box mb={2}>
            <Text fontSize="lg" fontWeight="semibold" mb={1}>Media:</Text>
          </Box>
        </Box>
      </GridItem>
      <GridItem colSpan={5}>
        <Box maxW="md" mx="auto" position="relative">
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

          {/* Navigation Controls */}
          <Flex justifyContent="center" alignItems="center" gap={4} mt={4}>
            <IconButton size="xs" variant="ghost" onClick={prevSlide} aria-label="Previous Slide"><LuChevronLeft /></IconButton>

            {/* Indicators */}
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
      </GridItem>
    </Grid>
  );
}

export default Profile;
