import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth} from './contexts/AuthContext';
import profileService from './services/profileService';
import { Box, Center, Button, Heading, VStack, Field, Input } from '@chakra-ui/react';

import InputField from './components/InputField';
import InstrumentSelector from './components/InstrumentSelector';
import GenreSelector from './components/GenreSelector';
import { toaster } from "./components/ui/toaster";
import { GENDER_DISPLAY_NAMES } from './utils/mappings';


function UpdateProfile() {
  const navigate = useNavigate(); // For navigation after profile creation
  const { currentUser, refreshProfile, profile } = useAuth(); // Get current user and refreshProfile function from AuthContext
  const [loading, setLoading] = useState(false);


  const [formData, setFormData] = useState({
    // Profile fields
    email: profile?.email || currentUser?.email || '', // Pre-fill email from profile or currentUser
    gender: profile?.gender || '',
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    bio: profile?.bio || '',
    birthDate: profile?.birthDate || '',
    experienceYears: profile?.experienceYears || '',

    // For instruments, we convert the array of { name, skillLevel } to an object for easier form handling
    selectedInstruments: Object.fromEntries(
    profile?.instruments?.map(instrument => [instrument.name, instrument.skillLevel]) || []
    ) || {},  // This will create an object like { electric_guitar: 3, drums: 1 }
    selectedGenres: profile?.genres || [], 
    location: profile?.location || {
      placeId: '',
      formattedAddress: '',
      lat: 0,
      lng: 0
    }, profilePicUrl: profile?.profilePicUrl || ''
  });


  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value // Update the specific field that changed
    });
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    // convert selectedInstruments object to array of { name, skillLevel } for the API
    const instruments = Object.entries(formData.selectedInstruments).map(([name, skillLevel]) => ({
      name,
      skillLevel
    }));

    const payload = {
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

    // Use the profileService.updateProfile method instead of direct fetch
    await profileService.updateProfile(currentUser.uid, payload);

    toaster.create({
      title: 'Profile updated successfully!',
      description: 'Your profile has been updated.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
    
    await refreshProfile();   // Refresh the profile data in AuthContext after updating
  
    navigate('/'); // Redirect to home or profile page after successful update
    
  } catch (err) {
    toaster.create({
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

        <VStack gap={4} mb={6}>
          <Heading size="lg">Jam Find</Heading>
          <Heading size="md" color="gray.600">Update Your Profile</Heading>
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
                label="Gender"
                name="gender"
                type="select"
                value={formData.gender}
                onChange={handleChange}
                required
                selectOptions={Object.entries(GENDER_DISPLAY_NAMES).map(([value, label]) => ({ value, label }))}
              />

              <Field.Root>
                <Field.Label>Zipcode</Field.Label>
                <Input 
                  placeholder="Enter Zipcode"
                  required 
                  name="zipCode"
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
                label="Select Your Preferred Genres"
              />  
              
              <Button
                type="submit"
                colorPalette="blue"
                size="lg"
                width="100%"
                loading={loading}
                loadingText="Updating Profile..."
              >
                Update
              </Button>
              <Button
                colorPalette="red"
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
