// CreatePost.jsx
// Form for creating a new post (looking for band/musicians, jam session, or sharing music)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Center, Button, Heading, VStack} from '@chakra-ui/react';

import InputField from './components/InputField';
import InstrumentSelector from './components/InstrumentSelector';
import GenreSelector from './components/GenreSelector';
import postService from './services/postService';
import profileService from './services/profileService';
import { useAuth } from './contexts/AuthContext';
import { toaster } from "./components/ui/toaster"

const GENRES = [
  'Rock', 'Pop', 'Jazz', 'Blues', 'Country', 'R&B',
  'Hip Hop', 'Hardcore', 'Electronic', 'Classical', 'Metal',
  'Death Metal', 'Folk', 'Reggae', 'Punk', 'Indie', 'Soul',
  'Funk', 'Latin', 'Alternative', 'Gospel', 'Experimental', 'Other'
];


function CreatePost() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [loading, setLoading] = useState(false);

  // All form data in one state object
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    postType: 'looking_to_jam',
    location: null,
    selectedInstruments: {},
    selectedGenres: [],
    media: []
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
              instrumentsObj[instrument.name] = instrument.experienceLevel;
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
      // Convert selectedInstruments object to array of { name, experienceLevel } for the API
      const instruments = Object.entries(formData.selectedInstruments).map(([name, experienceLevel]) => ({
        name,
        experienceLevel
      }));

      const payload = {
        title: formData.title,
        body: formData.body,
        postType: formData.postType,
        location: formData.location,
        instruments,
        genres: formData.selectedGenres,
        media: formData.media
      };

      await postService.createPost(payload);

      toaster.create({
        title: 'Post created successfully!',
        description: 'Your post has been created.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      navigate('/home');
      
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
                selectOptions={[
                  { value: 'looking_to_jam', label: 'Looking to Jam 🎶' },
                  { value: 'looking_for_band', label: 'Looking for a Band 🎤' },
                  { value: 'looking_for_musicians', label: 'Looking for Musicians 🎸' },
                  { value: 'sharing_music', label: 'Sharing Music 🎵' }
                ]}
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

              {/* TODO: add input field for location here. */}

              <InstrumentSelector
                value={formData.selectedInstruments}
                onChange={(instruments) => setFormData({ ...formData, selectedInstruments: instruments })}
              />

              <GenreSelector
                value={formData.selectedGenres}
                onChange={(genres) => setFormData({ ...formData, selectedGenres: genres })}
                options={GENRES}
                label="Select Genres"
              />

              {/* TODO: add input field for media here. */}
              
              <Button
                type="submit"
                colorPalette="blue"
                size="lg"
                width="100%"
                loading={loading}
                loadingText="Creating Post..."
              >
                Create Post
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
}

export default CreatePost;