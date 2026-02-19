import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  VStack,
  Spinner,
  Alert,
  AlertIcon,
  Button,
  useToast,
} from '@chakra-ui/react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import postService from './services/postService';
import profileService from './services/profileService';
import { useAuth } from './contexts/AuthContext';
import LocationRadiusMap from './components/LocationRadiusMap';
import PostCard, { getPostTypeLabel } from './components/PostCard';
import { useNavigate } from 'react-router-dom';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const postIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function Feed() {
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser, profile: currentUserProfile } = useAuth();

  const [radiusMiles, setRadiusMiles] = useState(25);
  const [posts, setPosts] = useState([]);
  const [profilesByUserId, setProfilesByUserId] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Derive user center from their profile location
  const userCenter = useMemo(() => {
    const loc = currentUserProfile?.location;
    if (loc && loc.lat && loc.lng) {
      return [loc.lat, loc.lng];
    }
    return null;
  }, [currentUserProfile]);

  const getToken = useCallback(async () => {
    if (!currentUser) throw new Error('No user logged in');
    return currentUser.getIdToken();
  }, [currentUser]);

  // Collect posts that have valid coordinates for map markers
  const mappablePosts = useMemo(() => {
    return posts.filter(p => {
      const loc = p.location;
      return loc && loc.lat && loc.lng;
    });
  }, [posts]);

  // Fetch feed posts
  useEffect(() => {
    const fetchFeed = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await postService.getFeed({ radiusMiles, limit: 50 });
        setPosts(Array.isArray(data) ? data : []);

      } catch (err) {
        setError(err.message || 'Failed to load feed');
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [radiusMiles, refreshTick]);

  // Fetch missing author profiles
  useEffect(() => {
    const fetchMissingProfiles = async () => {
      try {
        setLoadingProfiles(true);

        const uniqueUserIds = Array.from(new Set((posts || []).map(p => (p.userId || p.user_id)).filter(Boolean)));
        const missing = uniqueUserIds.filter(uid => !profilesByUserId[uid]);

        if (missing.length === 0) {
          setLoadingProfiles(false);
          return;
        }

        const results = await Promise.allSettled(missing.map(uid => profileService.getProfile(uid)));

        const next = { ...profilesByUserId };
        for (let i = 0; i < missing.length; i++) {
          if (results[i].status === 'fulfilled') {
            next[missing[i]] = results[i].value;
          }
        }

        setProfilesByUserId(next);

      } finally {
        setLoadingProfiles(false);
      }
    };

    if (posts.length > 0) {
      fetchMissingProfiles();
    }
  }, [posts]);

  const handleLikeToggle = async (postId) => {
    try {
      const response = await postService.toggleLike(postId);

      setPosts(prev => prev.map(p => {
        if (p.postId !== postId) return p;
        return {
          ...p,
          likes: response.likes,
          likedByCurrentUser: response.liked
        };
      }));

    } catch (err) {
      toast({
        title: 'Failed to update like',
        description: err.message || 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
        <Spinner size="xl" color="blue.500" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box maxW="900px" mx="auto" mt="80px" p="40px">
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box maxW="1000px" mx="auto" p={6}>
      <Box
        p={6}
        borderWidth="1px"
        borderRadius="lg"
        bg="white"
        boxShadow="md"
        mb={6}
      >
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size="lg">Feed</Heading>
          <Button
            colorScheme="blue"
            variant="outline"
            onClick={() => setRefreshTick(t => t + 1)}
          >
            Refresh
          </Button>
        </Flex>

        {userCenter ? (
          <LocationRadiusMap
            zipCode={currentUserProfile?.zipCode}
            lat={userCenter[0]}
            lng={userCenter[1]}
            radiusMiles={radiusMiles}
            onRadiusChange={setRadiusMiles}
            onLocationResolved={() => {}}
            getToken={getToken}
            mapHeight="320px"
            label="Distance"
          >
            {/* Post markers rendered inside the map */}
            {mappablePosts.map(post => {
              const postType = post.postType || post.post_type;
              return (
                <Marker
                  key={post.postId}
                  position={[post.location.lat, post.location.lng]}
                  icon={postIcon}
                >
                  <Popup>
                    <div style={{ maxWidth: 200 }}>
                      <strong style={{ fontSize: 13 }}>{post.title}</strong><br />
                      <span style={{ fontSize: 11, color: '#666' }}>{getPostTypeLabel(postType)}</span>
                      {post.location.formattedAddress && (
                        <>
                          <br />
                          <span style={{ fontSize: 11, color: '#888' }}>{post.location.formattedAddress}</span>
                        </>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </LocationRadiusMap>
        ) : (
          <Text mt={3} fontSize="sm" color="orange.500">
            Set your location in your profile to see the map.
          </Text>
        )}

        {loadingProfiles && (
          <Text mt={3} fontSize="sm" color="gray.600">
            Loading profiles...
          </Text>
        )}
      </Box>

      {posts.length === 0 ? (
        <Box
          p={6}
          borderWidth="1px"
          borderRadius="lg"
          bg="white"
          boxShadow="md"
        >
          <Text color="gray.700">No posts found within {radiusMiles} miles.</Text>
        </Box>
      ) : (
        <VStack spacing={6} align="stretch">
          {posts.map((post) => {
            const authorId = post.userId || post.user_id;
            const author = authorId ? profilesByUserId[authorId] : null;

            return (
              <PostCard
                key={post.postId}
                post={post}
                author={author}
                onLikeToggle={handleLikeToggle}
                onClick={() => navigate(`/posts/${post.postId}`)}
              />
            );
          })}
        </VStack>
      )}
    </Box>
  );
}

export default Feed;