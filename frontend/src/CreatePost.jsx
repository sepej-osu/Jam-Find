// CreatePost.jsx
// Form for creating a new post (looking for band/musicians, jam session, or sharing music)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Flex, Button, Heading, VStack, HStack, Input, Field, Text, IconButton, FileUpload as ChakraFileUpload } from '@chakra-ui/react';

import InputField from './components/InputField';
import InstrumentSelector from './components/InstrumentSelector';
import GenreSelector from './components/GenreSelector';
import { FileUpload, ACCEPTED_AUDIO_RECORD, MUSIC_TOOLTIP_CONTENT, POST_IMAGE_TOOLTIP_CONTENT, checkAudioDuration, ACCEPTED_AUDIO_TYPES, safeExt } from './components/ui/file-upload';
import { LuX, LuUpload, LuInfo } from 'react-icons/lu';
import { Tooltip } from './components/ui/tooltip';
import ReactPlayer from 'react-player';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { v4 as uuidv4 } from 'uuid';
import postService from './services/postService';
import profileService from './services/profileService';
import { useAuth } from './contexts/AuthContext';
import { toaster } from "./components/ui/toaster"

import { POST_TYPE_DISPLAY_NAMES } from './utils/displayNameMappings';


function CreatePost() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPath, setPhotoPath] = useState(null);
  const [photoThumbPath, setPhotoThumbPath] = useState(null);
  const [songFile, setSongFile] = useState(null);
  const [songObjectUrl, setSongObjectUrl] = useState(null);
  const [songRejectionKey, setSongRejectionKey] = useState(0);

  const handleSongFileAdd = async (file) => {
    if (file.size > 10 * 1024 * 1024) {
      toaster.create({ title: 'File too large', description: 'Maximum size is 10 MB.', type: 'error', closable: true });
      return;
    }
    if (!ACCEPTED_AUDIO_TYPES.split(',').includes(file.type)) {
      toaster.create({ title: 'Unsupported file type', description: 'Please upload an audio file (MP3, WAV, etc.).', type: 'error', closable: true });
      return;
    }
    const valid = await checkAudioDuration(file, 600);
    if (!valid) return;
    if (songObjectUrl) URL.revokeObjectURL(songObjectUrl);
    setSongFile(file);
    setSongObjectUrl(URL.createObjectURL(file));
  };

  const removeSong = () => {
    if (songObjectUrl) URL.revokeObjectURL(songObjectUrl);
    setSongFile(null);
    setSongObjectUrl(null);
  };

  // All form data in one state object
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    postType: 'looking_to_jam',
    location: null,
    selectedInstruments: {},
    selectedGenres: [],
    photoUrl: null,
    photoThumbUrl: null,
  });

  // Grab instruments/genres when post type is looking_to_jam or looking_for_band
  useEffect(() => {
    const loadProfileData = async () => {
      if (formData.postType === 'looking_to_jam' || formData.postType === 'looking_for_band') {
        try {
          const profile = await profileService.getProfile(currentUser?.uid);
          if (profile) {
            // Convert instruments array to selectedInstruments object format
            const instrumentsObj = {};
            profile.instruments?.forEach(instrument => {
              instrumentsObj[instrument.name] = instrument.skillLevel;
            });
            
            setFormData(prev => ({
              ...prev,
              selectedInstruments: instrumentsObj,
              selectedGenres: profile.genres || []
            }));
          }
        } catch (error) {
          console.error('Failed to load profile data:', error);
        }
      }
      else {
        setFormData(prev => ({
          ...prev,
          selectedInstruments: {},
          selectedGenres: []
        }));
      }
    };

    loadProfileData();
  }, [formData.postType, currentUser?.uid]);

  // Handle input changes for text fields
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Submit form data to backend API to create a new post in Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);

    try {
      // Convert selectedInstruments object to array of { name, skillLevel } for the API
      const instruments = Object.entries(formData.selectedInstruments).map(([name, skillLevel]) => ({
        name,
        skillLevel
      }));

      let uploadedSongPath = null;
      let songUrl = null;
      if (songFile) {
        const ext = safeExt(songFile);
        const path = `users/${currentUser.uid}/post-songs/${uuidv4()}.${ext}`;
        await uploadBytes(storageRef(storage, path), songFile);
        songUrl = await getDownloadURL(storageRef(storage, path));
        uploadedSongPath = path;
      }

      const payload = {
        title: formData.title,
        body: formData.body,
        postType: formData.postType,
        location: formData.location?.zipCode ? { zipCode: formData.location.zipCode } : null,
        instruments,
        genres: formData.selectedGenres,
        photoUrl: formData.photoUrl || null,
        photoThumbUrl: formData.photoThumbUrl || null,
        songUrl,
      };

      try {
        await postService.createPost(payload);
      } catch (err) {
        if (uploadedSongPath) {
          try { await deleteObject(storageRef(storage, uploadedSongPath)); } catch (_) {}
        }
        if (photoPath) {
          try { await deleteObject(storageRef(storage, photoPath)); } catch (_) {}
        }
        if (photoThumbPath) {
          try { await deleteObject(storageRef(storage, photoThumbPath)); } catch (_) {}
        }
        throw err;
      }

      toaster.create({
        title: 'Post created successfully!',
        description: 'Your post has been created.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      navigate('/feed');
      
    } catch (err) {
      toaster.create({
        title: 'Error creating post',
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


        <Box p={3} mb={4} layerStyle="card">
          <VStack gap={4} mb={6}>
            <Heading size="lg">Create a Post</Heading>
          </VStack>

          <form onSubmit={handleSubmit}>
            <VStack gap={4} align="stretch">
              <InputField
                label="Post Type"
                name="postType"
                type="select"
                value={formData.postType}
                onChange={handleChange}
                required
                selectOptions={Object.entries(POST_TYPE_DISPLAY_NAMES).map(([value, label]) => ({ value, label }))}
              />

              <InputField
                label="Title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                required
                maxLength={100}
              />

              <InputField
                label="Body"
                name="body"
                type="textarea"
                value={formData.body}
                onChange={handleChange}
                required
                maxLength={1000}
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

              <InstrumentSelector
                value={formData.selectedInstruments}
                onChange={(instruments) => setFormData({ ...formData, selectedInstruments: instruments })}
              />

              <GenreSelector
                value={formData.selectedGenres}
                onChange={(genres) => setFormData({ ...formData, selectedGenres: genres })}
                label="Select Genres"
              />

              <Field.Root>
                <Field.Label>
                  <HStack gap={1}>
                    Photo (optional)
                    <Tooltip content={POST_IMAGE_TOOLTIP_CONTENT}>
                      <IconButton variant="ghost" size="2xs" aria-label="Photo requirements">
                        <LuInfo />
                      </IconButton>
                    </Tooltip>
                  </HStack>
                </Field.Label>
                <FileUpload
                  type="post-image"
                  onUpload={(url, thumbUrl, path, thumbPath) => {
                    setFormData(prev => ({ ...prev, photoUrl: url, photoThumbUrl: thumbUrl || null }));
                    setPhotoPath(path || null);
                    setPhotoThumbPath(thumbPath || null);
                  }}
                  onUploadStart={() => setPhotoUploading(true)}
                  onUploadEnd={() => setPhotoUploading(false)}
                />
              </Field.Root>

              <Box>
                <Text fontWeight="medium" mb={2}>Song / Audio Sample (optional)</Text>
                {songFile ? (
                  <HStack gap={2}>
                    <Box flex={1} minWidth={0}>
                      <ReactPlayer src={songObjectUrl} controls width="100%" height="50px" />
                    </Box>
                    <IconButton size="md" variant="solid" colorPalette="red" aria-label="Remove song" onClick={removeSong}>
                      <LuX />
                    </IconButton>
                  </HStack>
                ) : (
                  <ChakraFileUpload.Root
                    key={songRejectionKey}
                    maxFiles={1}
                    accept={ACCEPTED_AUDIO_RECORD}
                    onFileChange={async ({ acceptedFiles }) => {
                      if (acceptedFiles[0]) {
                        await handleSongFileAdd(acceptedFiles[0]);
                        setSongRejectionKey(k => k + 1);
                      }
                    }}
                    onFileReject={() => {
                      toaster.create({ title: 'Unsupported file type', description: 'Please upload an audio file (MP3, WAV, etc.).', type: 'error', closable: true });
                      setSongRejectionKey(k => k + 1);
                    }}
                  >
                    <ChakraFileUpload.HiddenInput />
                    <HStack gap={1}>
                      <ChakraFileUpload.Trigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          <LuUpload /> Add Song
                        </Button>
                      </ChakraFileUpload.Trigger>
                      <Tooltip content={MUSIC_TOOLTIP_CONTENT}>
                        <IconButton variant="ghost" size="2xs" aria-label="Song requirements">
                          <LuInfo />
                        </IconButton>
                      </Tooltip>
                    </HStack>
                  </ChakraFileUpload.Root>
                )}
              </Box>
              
              <HStack gap={3} pr={3}>
                <Button
                  type="submit"
                  variant="jam"
                  size="lg"
                  width="70%"
                  loading={loading}
                  disabled={photoUploading}
                  loadingText="Creating Post..."
                >
                  Create Post
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
}

export default CreatePost;