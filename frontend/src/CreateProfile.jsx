import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth} from './contexts/AuthContext';
import { Box, Center, Button, Heading, VStack, HStack, Field, Input, Text, IconButton, FileUpload as ChakraFileUpload } from '@chakra-ui/react';

import InputField from './components/InputField';
import InstrumentSelector from './components/InstrumentSelector';
import GenreSelector from './components/GenreSelector';
import { toaster } from "./components/ui/toaster";
import { FileUpload, ACCEPTED_AUDIO_RECORD, MUSIC_TOOLTIP_CONTENT } from './components/ui/file-upload';
import { LuX, LuUpload, LuInfo } from 'react-icons/lu';
import { Tooltip } from './components/ui/tooltip';
import ReactPlayer from 'react-player';
import { GENDER_DISPLAY_NAMES } from './utils/displayNameMappings';
import { createMusicSampleHandlers, uploadMusicSamples, validateMusicSampleTitles, instrumentsFromSelected, deleteStoragePaths } from './utils/helpers';

const MAX_MUSIC_SAMPLES = 3;


function CreateProfile() {
  const navigate = useNavigate(); // For navigation after profile creation
  const { currentUser, refreshProfile } = useAuth(); // Get current user and refreshProfile function from AuthContext
  const [loading, setLoading] = useState(false);
  const [musicSamples, setMusicSamples] = useState([]);
  const [musicRejectionKey, setMusicRejectionKey] = useState(0);
  const photoUploadRef = useRef(null);

  const { handleMusicFileAdd, handleMusicSampleTitleChange, removeMusicSample } =
    createMusicSampleHandlers(setMusicSamples, MAX_MUSIC_SAMPLES);


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
    },
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
  let uploadedPaths = [];

  try {
    const user = currentUser; // Use currentUser from AuthContext
    if (!user) {
      throw new Error('No user logged in');
    }
    const token = await user.getIdToken();

    if (!validateMusicSampleTitles(musicSamples)) { setLoading(false); return; }
    
    const instruments = instrumentsFromSelected(formData.selectedInstruments);

    const photoResult = await photoUploadRef.current?.upload(user.uid) ?? null;
    if (photoResult?.path) uploadedPaths.push(photoResult.path);
    if (photoResult?.thumbPath) uploadedPaths.push(photoResult.thumbPath);

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
      genres: formData.selectedGenres,
      profilePicUrl: photoResult?.url ?? null,
    };

    const { samples: uploadedSamples, uploadedPaths: newPaths } = await uploadMusicSamples(user.uid, musicSamples);
    uploadedPaths = [...uploadedPaths, ...newPaths];
    if (uploadedSamples.length > 0) payload.musicSamples = uploadedSamples;

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
    await deleteStoragePaths(currentUser?.uid, uploadedPaths);
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
                selectOptions={Object.entries(GENDER_DISPLAY_NAMES).map(([value, label]) => ({ value, label }))}
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

              <FileUpload
                ref={photoUploadRef}
                type="profile-image"
                label="Profile Picture"
                disabled={loading}
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

              <Box>
                <Text fontWeight="medium" mb={2}>
                  Music Samples ({musicSamples.length}/{MAX_MUSIC_SAMPLES})
                </Text>
                <VStack align="stretch" gap={2}>
                  {musicSamples.map((sample, index) => (
                    <VStack key={index} gap={1} p={2} align="stretch">
                      <Text fontSize="sm" color="jam.accent">Sample {index + 1}</Text>
                      <Input
                        placeholder="Title/Description (required)"
                        size="sm"
                        value={sample.title}
                        onChange={e => handleMusicSampleTitleChange(index, e.target.value)}
                        required
                      />
                      <HStack gap={2}>
                        <Box flex={1} minWidth={0}>
                          <ReactPlayer src={sample.objectUrl} controls width="100%" height="50px" />
                        </Box>
                        <IconButton
                          size="md"
                          variant="solid"
                          colorPalette="red"
                          aria-label="Remove sample"
                          onClick={() => removeMusicSample(index, musicSamples)}
                          disabled={loading}
                        >
                          <LuX />
                        </IconButton>
                      </HStack>
                    </VStack>
                  ))}
                  {musicSamples.length < MAX_MUSIC_SAMPLES && (
                    <ChakraFileUpload.Root
                      key={musicRejectionKey}
                      maxFiles={1}
                      accept={ACCEPTED_AUDIO_RECORD}
                      onFileChange={async ({ acceptedFiles }) => {
                        if (acceptedFiles[0]) {
                          await handleMusicFileAdd(acceptedFiles[0], musicSamples.length);
                          setMusicRejectionKey(k => k + 1);
                        }
                      }}
                      onFileReject={() => {
                        toaster.create({ title: 'Unsupported file type', description: 'Please upload an audio file (MP3, WAV, etc.).', type: 'error', closable: true });
                        setMusicRejectionKey(k => k + 1);
                      }}
                    >
                      <ChakraFileUpload.HiddenInput />
                      <HStack gap={1}>
                        <ChakraFileUpload.Trigger asChild>
                          <Button type="button" variant="outline" size="sm" disabled={loading}>
                            <LuUpload /> Add Sample
                          </Button>
                        </ChakraFileUpload.Trigger>
                        <Tooltip content={MUSIC_TOOLTIP_CONTENT}>
                          <IconButton variant="ghost" size="2xs" aria-label="Music sample requirements">
                            <LuInfo />
                          </IconButton>
                        </Tooltip>
                      </HStack>
                    </ChakraFileUpload.Root>
                  )}
                </VStack>
              </Box>
              
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
