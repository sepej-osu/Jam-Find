// CreatePost.jsx
// Form for creating a new post (looking for band/musicians, jam session, or sharing music)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Flex, Button, Heading, VStack, HStack, Input, Field } from '@chakra-ui/react';

import InputField from './components/InputField';
import InstrumentSelector from './components/InstrumentSelector';
import GenreSelector from './components/GenreSelector';
import postService from './services/postService';
import profileService from './services/profileService';
import { useAuth } from './contexts/AuthContext';
import { toaster } from "./components/ui/toaster"

import { POST_TYPE_DISPLAY_NAMES } from './utils/displayNameMappings';


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

      const payload = {
        title: formData.title,
        body: formData.body,
        postType: formData.postType,
        location: formData.location?.zipCode ? { zipCode: formData.location.zipCode } : null,
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

              {/* TODO: add input field for media here. */}
              
              <HStack gap={3} pr={3}>
                <Button
                  type="submit"
                  variant="jam"
                  size="lg"
                  width="70%"
                  loading={loading}
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