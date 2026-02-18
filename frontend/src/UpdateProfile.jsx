import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth} from './contexts/AuthContext';
import profileService from './services/profileService';
import {
  Box,
  Center,
  Button,
  Heading,
  VStack,
  useToast,
  HStack, 
  Slider, 
  SliderTrack, 
  SliderFilledTrack, 
  SliderThumb,
  Text
} from '@chakra-ui/react';

import InputField from './components/InputField';
import InstrumentSelector from './components/InstrumentSelector';
import GenreSelector from './components/GenreSelector';


const GENRES = [
  'Rock', 'Pop', 'Jazz', 'Blues', 'Country', 'R&B',
  'Hip Hop', 'Hardcore', 'Electronic', 'Classical', 'Metal',
  'Death Metal', 'Folk', 'Reggae', 'Punk', 'Indie', 'Soul',
  'Funk', 'Latin', 'Alternative', 'Gospel', 'Experimental', 'other'
];


function UpdateProfile() {
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser, refreshProfile, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const isZipValid = (zip) => /^\d{5}$/.test((zip || '').trim());

  const [formData, setFormData] = useState({
    email: profile?.email || currentUser?.email || '',
    gender: profile?.gender || '',
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    bio: profile?.bio || '',
    birthDate: profile?.birthDate || '',
    zipCode: profile?.zipCode || '',
    searchRadiusMiles: profile?.searchRadiusMiles || 25,
    experienceYears: profile?.experienceYears || '',
    selectedInstruments: Object.fromEntries(
      profile?.instruments?.map(instrument => [instrument.name, instrument.experienceLevel]) || []
    ) || {},
    selectedGenres: profile?.genres || [], 
    location: profile?.location || {
      placeId: '',
      formattedAddress: '',
      lat: 0,
      lng: 0
    }, profilePicUrl: profile?.profilePicUrl || ''
  });

  useEffect(() => {
    if (!profile) return;

    setFormData({
      email: profile.email || currentUser?.email || '',
      gender: profile.gender || '',
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      bio: profile.bio || '',
      birthDate: profile.birthDate || '',
      zipCode: profile.zipCode || '',
      searchRadiusMiles: profile.searchRadiusMiles || 25,
      experienceYears: profile.experienceYears || '',
      selectedInstruments: Object.fromEntries(
        (profile.instruments || []).map(instrument => [instrument.name, instrument.experienceLevel])
      ),
      selectedGenres: profile.genres || [],
      location: profile.location || {
        placeId: '',
        formattedAddress: '',
        lat: 0,
        lng: 0
      },
      profilePicUrl: profile.profilePicUrl || ''
    });

  }, [profile, currentUser]);


  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {

      if (!currentUser) {
        throw new Error('No user logged in');
      }

      if (!isZipValid(formData.zipCode)) {
        toast({
          title: 'Invalid ZIP Code',
          description: 'Enter a 5-digit ZIP code',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const radiusMiles = parseInt(formData.searchRadiusMiles, 10);
      if (isNaN(radiusMiles) || radiusMiles < 1 || radiusMiles > 500) {
        toast({
          title: 'Invalid Distance',
          description: 'Distance must be between 1 and 500 miles',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const instruments = Object.entries(formData.selectedInstruments).map(([name, experienceLevel]) => ({
        name,
        experienceLevel
      }));

      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        birthDate: formData.birthDate,
        gender: formData.gender,
        bio: formData.bio,
        zipCode: formData.zipCode.trim(),
        searchRadiusMiles: radiusMiles,
        experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : null,
        location: formData.location,
        instruments: instruments,
        genres: formData.selectedGenres
      };

      await profileService.updateProfile(currentUser.uid, payload);

      toast({
        title: 'Profile updated successfully!',
        description: 'Your profile has been updated.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      await refreshProfile();

      navigate('/');

    } catch (err) {

      toast({
        title: 'Error updating profile',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });

    } finally {
      setLoading(false);
    }
  };


  return (
  <Center minH="100vh" bg="gray.50" px={4}>
  <Box 
    maxW="600px" 
    w="full"
    p={10} 
    borderWidth="1px" 
    borderRadius="lg" 
    shadow="lg"
    bg="white"
  >

      <VStack spacing={4} mb={6}>
        <Heading size="lg">Jam Find</Heading>
        <Heading size="md" color="gray.600">Update Your Profile</Heading>
      </VStack>

        <form onSubmit={handleSubmit}>
          <VStack spacing={4} align="stretch">
            <InputField
              label="First Name"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              required
            />

            <InputField
              label="Last Name"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              required
            />

            <InputField
              label="Gender"
              name="gender"
              type="select"
              value={formData.gender}
              onChange={handleChange}
              required
            />

            <InputField
              label="Bio"
              name="bio"
              type="textarea"
              value={formData.bio}
              onChange={handleChange}
              maxLength={500}
            />

            <InputField
              label="ZIP Code"
              name="zipCode"
              type="text"
              value={formData.zipCode}
              onChange={handleChange}
              required
              placeholder="e.g., 34119"
            />

            <VStack spacing={1} align="stretch">
              <HStack justify="space-between">
                <Text fontWeight="semibold">Distance</Text>
                <Text fontSize="sm" color="gray.600">Within {formData.searchRadiusMiles} miles</Text>
              </HStack>
              <Slider
                value={formData.searchRadiusMiles}
                min={1}
                max={500}
                step={1}
                onChange={(val) => setFormData({ ...formData, searchRadiusMiles: val })}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </VStack>

            <InputField
              label="Years of Experience"
              name="experienceYears"
              type="number"
              value={formData.experienceYears}
              onChange={handleChange}
            />

            <InstrumentSelector
              value={formData.selectedInstruments}
              onChange={(instruments) => setFormData({ ...formData, selectedInstruments: instruments })}
            />

            <GenreSelector
              value ={formData.selectedGenres}
              onChange={(genres) => setFormData({ ...formData, selectedGenres: genres })}
              options={GENRES}
              label="Select Your Preferred Genres"
            />  
            
            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              width="100%"
              isLoading={loading}
              loadingText="Updating Profile..."
            >
              Complete
            </Button>
            <Button
              colorScheme="red"
              size="sm"
              width="100%"
              alignSelf="center"
              onClick={() => navigate('/')}
            >
              Back
            </Button>

          </VStack>
        </form>
    </Box>
    </Center>
  );
};

export default UpdateProfile;
