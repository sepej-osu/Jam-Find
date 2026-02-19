import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from './contexts/AuthContext';
import {
  Box,
  Center,
  Button,
  Heading,
  VStack,
  useToast,
  Progress,
  Text,
} from '@chakra-ui/react';

import { Link as ChakraLink } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import InputField from './components/InputField';
import PasswordField from './components/PasswordField';
import InstrumentSelector from './components/InstrumentSelector';
import GenreSelector from './components/GenreSelector';
import LocationRadiusMap from './components/LocationRadiusMap';


const GENRES = [
  'Rock', 'Pop', 'Jazz', 'Blues', 'Country', 'R&B',
  'Hip Hop', 'Hardcore', 'Electronic', 'Classical', 'Metal',
  'Death Metal', 'Folk', 'Reggae', 'Punk', 'Indie', 'Soul',
  'Funk', 'Latin', 'Alternative', 'Gospel', 'Experimental', 'Other'
];


function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const { refreshProfile } = useAuth();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

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
    zipCode: '',
    searchRadiusMiles: 25,
    selectedInstruments: {},
    selectedGenres: [],
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

  const isPasswordValid = () => {
    const { password } = formData;
    const hasMinLength = password.length >= 8;
    const hasMaxLength = password.length <= 32;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    return hasMinLength && hasMaxLength && hasUppercase && hasLowercase && hasNumber;
  };

  const isZipValid = (zip) => /^\d{5}$/.test((zip || '').trim());

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.password_confirm) {
      toast({
        title: 'Passwords do not match',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!isPasswordValid()) {
      toast({
        title: 'Password does not meet requirements',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const age = calculateAge(formData.birthDate);
    if (age < 16) {
      toast({
        title: 'You must be at least 16 years old to register',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setStep(2);
  };

const handleStep2Submit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    if (!isZipValid(formData.zipCode)) {
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
    if (isNaN(radiusMiles) || radiusMiles < 5 || radiusMiles > 500) {
      toast({
        title: 'Invalid Distance',
        description: 'Distance must be between 5 and 500 miles',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setLoading(false);
      return;
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      formData.email, 
      formData.password
    );
    
    console.log('Firebase account created!');
    
    const user = userCredential.user;
    const token = await user.getIdToken();
    
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
      zipCode: formData.zipCode.trim(),
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

    await refreshProfile();

    toast({
      title: 'Profile created successfully!',
      description: 'Welcome to Jam Find',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });

    navigate('/home');
    
  } catch (err) {
    toast({
      title: 'Error creating account',
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
    <p style={{ marginTop: 2, marginBottom: 5, textAlign: 'center' }}>
      Already have an account?{' '}
      <ChakraLink as={RouterLink} to="/login" color="blue.500">
        Login
      </ChakraLink>
    </p>

      <VStack spacing={4} mb={6}>
        <Heading size="lg">Create Your Account</Heading>
        <Text color="gray.600">Step {step} of 2</Text>
        <Progress value={step === 1 ? 50 : 100} width="100%" colorScheme="blue" />
      </VStack>


      {/* Step 1: Account Creation */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit}>
          <VStack spacing={4} align="stretch">
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
              colorScheme="blue"
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

            <LocationRadiusMap
              zipCode={formData.zipCode}
              lat={formData.location?.lat}
              lng={formData.location?.lng}
              radiusMiles={formData.searchRadiusMiles}
              onRadiusChange={(val) => setFormData({ ...formData, searchRadiusMiles: val })}
              onLocationResolved={handleLocationResolved}
              getToken={null}
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

            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              isDisabled={loading}
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