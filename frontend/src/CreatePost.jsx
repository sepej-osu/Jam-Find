import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth} from './contexts/AuthContext';
import {
  Box,
  Center,
  Button,
  Heading,
  VStack,
  useToast,
} from '@chakra-ui/react';

import InputField from './components/InputField';
import InstrumentSelector from './components/InstrumentSelector';
import GenreSelector from './components/GenreSelector';
import LocationRadiusMap from './components/LocationRadiusMap';



const GENRES = [
  'Rock', 'Pop', 'Jazz', 'Blues', 'Country', 'R&B',
  'Hip Hop', 'Hardcore', 'Electronic', 'Classical', 'Metal',
  'Death Metal', 'Folk', 'Reggae', 'Punk', 'Indie', 'Soul',
  'Funk', 'Latin', 'Alternative', 'Gospel', 'Experimental', 'other'
];


function CreateProfile() {
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);


  const [formData, setFormData] = useState({
    email: '',
    gender: '',
    firstName: '',
    lastName: '',
    bio: '',
    birthDate: '',
    zipCode: '',
    searchRadiusMiles: 25,
    experienceYears: '',
    selectedInstruments: {},
    selectedGenres: [],
    location: {
      placeId: '',
      formattedAddress: '',
      lat: 0,
      lng: 0
    }, profilePicUrl: ''
  });

  const getToken = useCallback(async () => {
    if (!currentUser) throw new Error('No user logged in');
    return currentUser.getIdToken();
  }, [currentUser]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLocationResolved = useCallback(({ lat, lng, formattedAddress }) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        placeId: '',
        formattedAddress: formattedAddress || '',
        lat,
        lng,
      },
    }));
  }, []);

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const user = currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }
    const token = await user.getIdToken();

    const zip = (formData.zipCode || '').trim();
    if (!/^\d{5}$/.test(zip)) {
      toast({
        title: 'Invalid ZIP Code',
        description: 'Enter a 5-digit ZIP code',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setLoading(false);
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
      setLoading(false);
      return;
    }

    const instruments = Object.entries(formData.selectedInstruments).map(([name, experienceLevel]) => ({
      name,
      experienceLevel
    }));

    const payload = {
      user_id: user.uid,
      email: user.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      birthDate: formData.birthDate,
      gender: formData.gender,
      bio: formData.bio,
      zipCode: zip,
      searchRadiusMiles: radiusMiles,
      experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : null,
      location: formData.location,
      instruments: instruments,
      genres: formData.selectedGenres
    };

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMsg = 'Failed to create profile';
      try {
        const errorData = await response.json();
        if (errorData?.detail) {
          errorMsg = errorData.detail;
        }
      } catch (_) {}
      throw new Error(errorMsg);
    }

    toast({
      title: 'Profile created successfully!',
      description: 'Welcome to Jam Find',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });

    await refreshProfile();
    navigate('/');
    
  } catch (err) {
    toast({
      title: 'Error creating a profile',
      description: err.message,
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  } finally {
    setLoading(false);
  }
}
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
        <Heading size="lg">Welcome to Jam Find!</Heading>
        <Heading size="md" color="gray.600">Let's set up your profile.</Heading>
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
              label="Birthdate"
              name="birthDate"
              type="date"
              value={formData.birthDate}
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

            <LocationRadiusMap
              zipCode={formData.zipCode}
              lat={formData.location?.lat}
              lng={formData.location?.lng}
              radiusMiles={formData.searchRadiusMiles}
              onRadiusChange={(val) => setFormData({ ...formData, searchRadiusMiles: val })}
              onLocationResolved={handleLocationResolved}
              getToken={getToken}
            />

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
              loadingText="Creating Profile..."
            >
              Complete
            </Button>

          </VStack>
        </form>
    </Box>
    </Center>
  );
};

export default CreateProfile;