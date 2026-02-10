import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebase';
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


const GENRES = [
  'Rock', 'Pop', 'Jazz', 'Blues', 'Country', 'R&B',
  'Hip Hop', 'Hardcore', 'Electronic', 'Classical', 'Metal',
  'Death Metal', 'Folk', 'Reggae', 'Punk', 'Indie', 'Soul',
  'Funk', 'Latin', 'Alternative', 'Gospel', 'Experimental', 'other'
];


function CreateProfile() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // All form data in one state object
  const [formData, setFormData] = useState({
    // Profile fields
    email: '',
    gender: '',
    firstName: '',
    lastName: '',
    bio: '',
    birthDate: '',
    experienceYears: '',
    selectedInstruments: {},  // { 'Guitar': 3, 'Drums': 5 }
    selectedGenres: [],       // ['Rock', 'Jazz']
    location: {
      placeId: '',
      formattedAddress: '',
      lat: 0,
      lng: 0
    }, profilePicUrl: ''
  });


  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

const handleStep2Submit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }
    const token = await user.getIdToken();
    
    // convert selectedInstruments object to array of { name, experienceLevel } for the API
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
      experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : null,
      location: formData.location,
      instruments: instruments,
      genres: formData.selectedGenres
    };

    console.log('=== SENDING TO BACKEND ===');
    console.log('URL:', `${import.meta.env.VITE_API_URL}/api/v1/profiles`);
    console.log('Payload:', payload);
    console.log('Token:', token);

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
      } catch (_) {
        // Ignore JSON parsing errors
      }
      throw new Error(errorMsg);
    }

    toast({
      title: 'Profile created successfully!',
      description: 'Welcome to Jam Find',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });

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
        <Heading size="lg">Create Your Account</Heading>
      </VStack>

      {/* Step 2: Profile Setup */}
        <form onSubmit={handleStep2Submit}>
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

            // TODO: add input field for location here.

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

            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              isDisabled={loading}
            >
              Back
            </Button>
          </VStack>
        </form>
    </Box>
    </Center>
  );
};

export default CreateProfile;
