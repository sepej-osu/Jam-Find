import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from './contexts/AuthContext';
import { Box, Center, Button, Heading, VStack, Progress, Text } from '@chakra-ui/react';
import { toaster } from "./components/ui/toaster"

import { Link as ChakraLink } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import InputField from './components/InputField';
import PasswordField from './components/PasswordField';
import InstrumentSelector from './components/InstrumentSelector';
import GenreSelector from './components/GenreSelector';


const GENRES = [
  'Rock', 'Pop', 'Jazz', 'Blues', 'Country', 'R&B',
  'Hip Hop', 'Hardcore', 'Electronic', 'Classical', 'Metal',
  'Death Metal', 'Folk', 'Reggae', 'Punk', 'Indie', 'Soul',
  'Funk', 'Latin', 'Alternative', 'Gospel', 'Experimental', 'Other'
];


function Register() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth(); // called after successful profile creation to update AuthContext with new profile data
  
  // Tracks which step the user is on (1 or 2)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // All form data in one state object
  const [formData, setFormData] = useState({
    // Step 1 fields
    email: '',
    password: '',
    password_confirm: '',
    birthDate: '',
    gender: '',
    
    // Step 2 fields
    firstName: '',
    lastName: '',
    bio: '',
    experienceYears: '',
    selectedInstruments: {},  // { 'Guitar': 3, 'Drums': 5 }
    selectedGenres: [],       // ['Rock', 'Jazz']
    location: {
      placeId: '',
      formattedAddress: '',
      lat: 0,
      lng: 0,
      geohash: ''
    }, profilePicUrl: ''
  });

  // Handle input changes for text fields
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value 
    });
  };

  // Calculate age from birthdate
  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Validate password requirements
  const isPasswordValid = () => {
    const { password } = formData;
    const hasMinLength = password.length >= 8;
    const hasMaxLength = password.length <= 32;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    return hasMinLength && hasMaxLength && hasUppercase && hasLowercase && hasNumber;
  };

  // Step 1 Submit - Validate inputs, ensure user is old enough, and move to step 2
  // toast is used to show error messages if validation fails
  // setStep(2) is called to move to the next step and update progress bar

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.password_confirm) {
      toaster.create({
        title: 'Passwords do not match',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Validate password requirements
    if (!isPasswordValid()) {
      toaster.create({
        title: 'Password does not meet requirements',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Validate age (must be 16+)
    const age = calculateAge(formData.birthDate);
    if (age < 16) {
      toaster.create({
        title: 'You must be at least 16 years old to register',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setLoading(false);
    setStep(2);

  };

  // Step 2 Submit - Create Firebase account, then send profile data to backend API
  // If any step fails, show an error toast. On success, show a success toast and navigate to home page.

  // TODO: add error handling for API call failures.
  // TODO: Figure out how to handle profile picture upload and include the URL in the payload
  //       NOTE: chakra has a file upload component; might be helpful
  // TODO: Add input Field for Location API and include that in the payload 

const handleStep2Submit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    // Create Firebase account
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      formData.email, 
      formData.password
    );
    
    console.log('Firebase account created!');
    
    const user = userCredential.user;
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
      birthDate:new Date(formData.birthDate).toISOString(),
      gender: formData.gender,
      bio: formData.bio,
      experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : null,
      location: formData.location,
      instruments: instruments,
      genres: formData.selectedGenres
    };

    // Send profile data to backend API

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    // Check if response is ok, if not try to extract error message from response body and 
    // throw an error to be caught in catch block
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

    // Refresh the profile in AuthContext so hasProfile becomes true
    // Add small delay to ensure Firestore finished writing the new profile before we try to fetch it in refreshProfile
    // this removes the premature 404 error when trying to fetch the profile immediately after creation
    await new Promise(resolve => setTimeout(resolve, 500));
    await refreshProfile();

    toaster.create({
      title: 'Profile created successfully!',
      description: 'Welcome to Jam Find',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });

    navigate('/home');
    
  } catch (err) {
    console.error('Registration error:', err);
    toaster.create({
      title: 'Error creating account',
      description: err.message,
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  } finally {
    // stop loading spinner regardless of sucess or failure
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
        <p style={{ marginTop: 2, marginBottom: 5, textAlign: 'center' }}>
          Already have an account?{' '}
          <ChakraLink color="blue.500" asChild><RouterLink to="/login">Login
                  </RouterLink></ChakraLink>
        </p>
          {/* Progress indicator */}

          <VStack gap={4} mb={6}>
            <Heading size="lg">Create Your Account</Heading>
            <Text color="gray.600">Step {step} of 2</Text>
            <Progress.Root value={step === 1 ? 50 : 100} width="100%" colorPalette="blue">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          </VStack>


          {/* Step 1: Account Creation */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit}>
              <VStack gap={4} align="stretch">
                <InputField
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />

                <PasswordField
                  label="Password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />

                <InputField
                  label="Confirm Password"
                  name="password_confirm"
                  type="password"
                  value={formData.password_confirm}
                  onChange={handleChange}
                  required
                />
                {formData.password_confirm && formData.password !== formData.password_confirm && (
                  <Text color="red.500" fontSize="sm" mt={-2}>
                    Passwords do not match
                  </Text>
                )}

                <InputField
                  label="Birthdate"
                  name="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={handleChange}
                  required
                />

                <Button
                  type="submit"
                  colorPalette="blue"
                  size="lg"
                  width="100%"
                  isLoading={loading}
                  loadingText="Creating Account..."
                >
                  Next
                </Button>
              </VStack>
            </form>
          )}

          {/* Step 2: Profile Setup */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit}>
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
                  selectOptions={[
                    { value: '', label: 'Select Gender' },
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'non-binary', label: 'Non-binary' },
                  ]}
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
                  colorPalette="blue"
                  size="lg"
                  width="100%"
                  loading={loading}
                  loadingText="Creating Profile..."
                >
                  Complete
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Back
                </Button>
              </VStack>
            </form>
          )}
        </Box>
    </Center>
  );
}

export default Register;