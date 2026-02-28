import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth} from './contexts/AuthContext';
import { Box, Center, Button, Heading, VStack, Field, Input} from '@chakra-ui/react';

import InputField from './components/InputField';
import InstrumentSelector from './components/InstrumentSelector';
import GenreSelector from './components/GenreSelector';
import { toaster } from "./components/ui/toaster";


const GENRES = [
  'Rock', 'Pop', 'Jazz', 'Blues', 'Country', 'R&B',
  'Hip Hop', 'Hardcore', 'Electronic', 'Classical', 'Metal',
  'Death Metal', 'Folk', 'Reggae', 'Punk', 'Indie', 'Soul',
  'Funk', 'Latin', 'Alternative', 'Gospel', 'Experimental', 'other'
];


function CreateProfile() {
  const navigate = useNavigate(); // For navigation after profile creation
  const { currentUser, refreshProfile } = useAuth(); // Get current user and refreshProfile function from AuthContext
  const [loading, setLoading] = useState(false);


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

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const user = currentUser; // Use currentUser from AuthContext
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
      userId: user.uid,
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

    // Call the backend API to create the profile (../backend/models/profile.js - createProfile function)
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
        // Try to extract error message from response body if available
        const errorData = await response.json();
        if (errorData?.detail) {
          errorMsg = errorData.detail;
        }
      } catch (_) {
        // Ignore JSON parsing errors
      }
      throw new Error(errorMsg);
    }

    toaster.create({
      title: 'Profile created successfully!',
      description: 'Welcome to Jam Find',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });

    await refreshProfile(); // Refresh profile in AuthContext after creation
    navigate('/');
    
  } catch (err) {
    toaster.create({
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

        <VStack gap={4} mb={6}>
          <Heading size="lg">Welcome to Jam Find!</Heading>
          <Heading size="md" color="gray.600">Let's set up your profile.</Heading>
        </VStack>

        {/* Step 2: Profile Setup */}
          <form onSubmit={handleSubmit}>
            <VStack gap={4} align="stretch">
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

              <Field.Root>
                <Field.Label>Zipcode</Field.Label>
                <Input 
                  placeholder="Enter Zipcode" 
                  name="zipCode"
                  required
                  value={formData.location?.zipCode || ''}
                  onChange={(e) => setFormData({ ...formData, location: { ...formData.location, zipCode: e.target.value } })}
                />
              </Field.Root>

              <InputField
                label="Bio"
                name="bio"
                type="textarea"
                value={formData.bio}
                onChange={handleChange}
                maxLength={500}
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
                colorPalette="blue"
                size="lg"
                width="100%"
                loading={loading}
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
