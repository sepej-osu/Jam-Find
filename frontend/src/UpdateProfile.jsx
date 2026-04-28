import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth} from './contexts/AuthContext';
import profileService from './services/profileService';
import { Box, Center, Button, Heading, VStack, HStack, Field, Input, Image, Text, IconButton } from '@chakra-ui/react';
import { FileUpload } from './components/ui/file-upload';
import { FileUpload as ChakraFileUpload } from '@chakra-ui/react';
import { toaster } from './components/ui/toaster';
import { ACCEPTED_AUDIO_TYPES, MIME_TO_EXT, MUSIC_TOOLTIP_CONTENT } from './components/ui/file-upload';
import { ref as storageRef, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { pathFromStorageUrl, createMusicSampleHandlers } from './utils/helpers';
import { v4 as uuidv4 } from 'uuid';
import { LuX, LuUpload, LuInfo } from 'react-icons/lu';
import { Tooltip } from './components/ui/tooltip';
import ReactPlayer from 'react-player';

import InputField from './components/InputField';
import InstrumentSelector from './components/InstrumentSelector';
import GenreSelector from './components/GenreSelector';
import { GENDER_DISPLAY_NAMES } from './utils/displayNameMappings';

const MAX_MUSIC_SAMPLES = 3;


function UpdateProfile() {
  const navigate = useNavigate(); // For navigation after profile creation
  const { currentUser, refreshProfile, profile } = useAuth(); // Get current user and refreshProfile function from AuthContext
  const [loading, setLoading] = useState(false);
  const [photoRemoved, setPhotoRemoved] = useState(false); // Marks existing photo for deletion on submit — no storage ops until then.
  const [hasPendingFile, setHasPendingFile] = useState(false); // True when user has selected a new file.
  const fileUploadRef = useRef(null);

  // Each item is either { type: 'existing', url, title } or { type: 'pending', file, title }
  // We keep pending samples in state to allow for title editing and playback before upload, and to manage the limit of 3 samples.
  const [musicSamples, setMusicSamples] = useState(
    (profile?.musicSamples || []).slice(0, MAX_MUSIC_SAMPLES).map(s => ({ type: 'existing', url: s.url, title: s.title || '' }))
  );
  const [musicUrlsToDelete, setMusicUrlsToDelete] = useState([]);
  const [musicRejectionKey, setMusicRejectionKey] = useState(0);

  const { handleMusicFileAdd, handleMusicSampleTitleChange, removeMusicSample } =
    createMusicSampleHandlers(setMusicSamples, MAX_MUSIC_SAMPLES, {
      onRemoveExisting: (url) => setMusicUrlsToDelete(prev => [...prev, url]),
    });


  // Mark the existing photo for removal without touching storage — deletion happens on submit.
  const handleDeleteProfilePic = () => setPhotoRemoved(true);

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

  if (musicSamples.some(s => !s.title.trim())) {
    toaster.create({ title: 'Missing title', description: 'Please add a title for each music sample.', type: 'error', closable: true });
    setLoading(false);
    return;
  }

  try {
    const originalUrl = profile?.profilePicUrl || null;
    let finalUrl = originalUrl;

    // User pressed "Remove photo": delete the old file from storage now.
    if (photoRemoved && originalUrl) {
      try {
        const path = pathFromStorageUrl(originalUrl);
        if (path.startsWith(`users/${currentUser.uid}/`)) await deleteObject(storageRef(storage, path));
      } catch (err) { console.warn('Could not delete profile picture:', err); }
      finalUrl = null;
    }

    // Upload any pending file selection.
    const newUrl = await fileUploadRef.current?.upload(currentUser.uid);
    if (newUrl) {
      // User picked a replacement without pressing Remove first: delete the old photo.
      if (originalUrl && !photoRemoved) {
        try {
          const path = pathFromStorageUrl(originalUrl);
          if (path.startsWith(`users/${currentUser.uid}/`)) await deleteObject(storageRef(storage, path));
        } catch (err) { console.warn('Could not delete previous photo:', err); }
      }
      finalUrl = newUrl;
    }

    // convert selectedInstruments object to array of { name, skillLevel } for the API
    const instruments = Object.entries(formData.selectedInstruments).map(([name, skillLevel]) => ({
      name,
      skillLevel
    }));

    // Delete removed music samples from storage
    for (const url of musicUrlsToDelete) {
      try {
        const path = pathFromStorageUrl(url);
        if (path?.startsWith(`users/${currentUser.uid}/`)) await deleteObject(storageRef(storage, path));
      } catch (err) { console.warn('Could not delete music sample:', err); }
    }

    // Upload any pending music samples
    const uploadedSamples = [];
    for (const sample of musicSamples) {
      if (sample.type === 'pending') {
        const ext = MIME_TO_EXT[sample.file.type] ?? 'mp3';
        const path = `users/${currentUser.uid}/music/${uuidv4()}.${ext}`;
        console.log('[MusicUpload] Uploading to path:', path, 'file:', sample.file.name, sample.file.type, sample.file.size);
        await uploadBytes(storageRef(storage, path), sample.file);
        const url = await getDownloadURL(storageRef(storage, path));
        console.log('[MusicUpload] Upload succeeded, url:', url);
        uploadedSamples.push({ url, title: sample.title });
      }
    }

    const finalMusicSamples = [
      ...musicSamples.filter(s => s.type === 'existing').map(s => ({ url: s.url, title: s.title })),
      ...uploadedSamples,
    ];

    const payload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      birthDate: formData.birthDate,
      gender: formData.gender,
      bio: formData.bio,
      experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : null,
      location: formData.location,
      instruments: instruments,
      genres: formData.selectedGenres,
      profilePicUrl: finalUrl,
      musicSamples: finalMusicSamples,
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
    <Box layerStyle="card">

      <VStack gap={4} mb={6}>
        <Heading size="lg">Update Your Profile</Heading>
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

            

            <FileUpload
              ref={fileUploadRef}
              type="profile-image"
              label="Profile Picture"
              currentUrl={profile?.profilePicUrl}
              deferred
              onFileSelect={(file) => setHasPendingFile(!!file)}
            />

            {profile?.profilePicUrl && !photoRemoved && !hasPendingFile && (
              <VStack gap={2} align="start">
                <Image
                  src={profile.profilePicUrl}
                  alt="Current profile picture"
                  boxSize="120px"
                  objectFit="cover"
                  borderRadius="md"
                />
                <Button
                  size="sm"
                  variant="solid"
                  colorPalette="red"
                  onClick={handleDeleteProfilePic}
                >
                  Remove photo
                </Button>
              </VStack>
            )}

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
                    {sample.type === 'existing' ? (
                      <Box flex={1} minWidth={0}>
                        <ReactPlayer
                          src={sample.url}
                          controls
                          width="100%"
                          height="auto"
                        />
                      </Box>
                    ) : (
                      <Box flex={1} minWidth={0}>
                        <ReactPlayer
                          src={sample.objectUrl}
                          controls
                          width="100%"
                          height="auto"
                        />
                      </Box>
                    )}
                    <IconButton
                      size="md"
                      variant="solid"
                      colorPalette="red"
                      aria-label="Remove sample"
                      onClick={() => removeMusicSample(index, musicSamples)}
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
                    onFileChange={async ({ acceptedFiles }) => {
                      if (acceptedFiles[0]) {
                        await handleMusicFileAdd(acceptedFiles[0], musicSamples.length);
                        setMusicRejectionKey(k => k + 1);
                      }
                    }}
                  >
                    <ChakraFileUpload.HiddenInput />
                    <HStack gap={1}>
                      <ChakraFileUpload.Trigger asChild>
                        <Button type="button" variant="outline" size="sm">
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
            
            <HStack gap={3} pr={3}>
              <Button
                type="submit"
                variant="jam"
                size="lg"
                width="70%"
                loading={loading}
                loadingText="Updating Profile..."
              >
                Update
              </Button>
              <Button
                variant="jamDark"
                size="lg"
                width="30%"
                onClick={() => navigate('/')}
                disabled={loading}
              >
                Back
              </Button>
            </HStack>

          </VStack>
        </form>
    </Box>
);
};

export default UpdateProfile;
