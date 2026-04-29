
import {
  Box,
  Heading,
  Text,
  Image,
  Grid,
  GridItem,
  Button,
  Flex,
  Badge,
  Icon,
  VStack,
  Wrap,
  WrapItem,
  Spinner,
  Alert,
  Textarea,
  Separator,
  Avatar,
} from '@chakra-ui/react';
import InstrumentCard from './components/ui/InstrumentCard';
import ReactPlayer from 'react-player';
import { FaMapMarkerAlt, FaCommentAlt } from 'react-icons/fa';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { CgProfile } from 'react-icons/cg';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import profileService from './services/profileService';
import reviewService from './services/reviewService';
import conversationService from './services/conversationService';
import { toaster } from './components/ui/toaster';
import { GENRE_DISPLAY_NAMES, GENDER_DISPLAY_NAMES } from './utils/displayNameMappings';
import { getDistanceMiles } from './utils/helpers';

function Profile() {
  const { userId } = useParams();
  const { currentUser, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [playerVolume, setPlayerVolume] = useState(() => {
    const saved = localStorage.getItem('playerVolume');
    return saved !== null ? parseFloat(saved) : 1;
  });
  const playerContainerRef = useRef(null);

  useEffect(() => {
    const container = playerContainerRef.current;
    if (!container) return;
    const handleVolumeChange = () => {
      const audio = container.querySelector('audio');
      if (audio) {
        localStorage.setItem('playerVolume', audio.volume);
        setPlayerVolume(audio.volume);
      }
    };
    container.addEventListener('volumechange', handleVolumeChange, true);
    return () => container.removeEventListener('volumechange', handleVolumeChange, true);
  });

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myReview, setMyReview] = useState(undefined); // undefined = not yet loaded, null = no review
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDeleting, setReviewDeleting] = useState(false);

  // Use the userId from URL params, or fall back to current user's ID
  const profileUserId = userId || currentUser?.uid;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await profileService.getProfile(profileUserId);
        setProfile(data);
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (profileUserId) {
      fetchProfile();
    }
  }, [profileUserId]);

  useEffect(() => {
    if (!profileUserId) return;

    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const data = await reviewService.getReviews(profileUserId, { limit: 10 });
        setReviews(data.reviews || []);
      } catch {
        // non-critical; silently fail
      } finally {
        setReviewsLoading(false);
      }
    };

    const fetchMyReview = async () => {
      if (!canMessageUser) {
        setMyReview(null);
        return;
      }
      try {
        const data = await reviewService.getMyReview(profileUserId);
        setMyReview(data); // ReviewResponse or null
      } catch {
        setMyReview(null);
      }
    };

    fetchReviews();
    fetchMyReview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUserId]);

  const canMessageUser = !!currentUser?.uid && !!profileUserId && currentUser.uid !== profileUserId;

  const handleSubmitReview = async () => {
    if (reviewRating === 0 || reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      const created = await reviewService.createReview(profileUserId, {
        rating: reviewRating,
        text: reviewText.trim() || null,
      });
      setMyReview(created);
      setReviews((prev) => [created, ...prev]);
      setProfile((prev) => ({
        ...prev,
        reviewCount: (prev.reviewCount || 0) + 1,
        averageRating:
          prev.reviewCount > 0
            ? Math.round(((prev.averageRating * prev.reviewCount) + reviewRating) / (prev.reviewCount + 1) * 100) / 100
            : reviewRating,
      }));
    } catch (err) {
      toaster.create({
        title: 'Could not submit review',
        description: err.message || 'Please try again',
        type: 'error',
        duration: 4000,
      });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!myReview || reviewDeleting) return;
    setReviewDeleting(true);
    try {
      await reviewService.deleteReview(profileUserId, myReview.reviewId);
      setReviews((prev) => prev.filter((r) => r.reviewId !== myReview.reviewId));
      setProfile((prev) => {
        const newCount = Math.max((prev.reviewCount || 1) - 1, 0);
        return {
          ...prev,
          reviewCount: newCount,
          averageRating:
            newCount === 0
              ? null
              : Math.round(
                  ((prev.averageRating * prev.reviewCount) - myReview.rating) / newCount * 100
                ) / 100,
        };
      });
      setMyReview(null);
      setReviewRating(0);
      setReviewText('');
    } catch (err) {
      toaster.create({
        title: 'Could not delete review',
        description: err.message || 'Please try again',
        type: 'error',
        duration: 4000,
      });
    } finally {
      setReviewDeleting(false);
    }
  };

  const handleMessageUser = async () => {
    if (!canMessageUser || messageLoading) return;

    try {
      setMessageLoading(true);
      const conversation = await conversationService.createConversation(profileUserId);
      navigate(`/messages/${conversation.conversationId}`);
    } catch (err) {
      toaster.create({
        title: 'Unable to start conversation',
        description: err.message || 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setMessageLoading(false);
    }
  };

  const userLat = currentUserProfile?.location?.lat ?? null;
  const userLng = currentUserProfile?.location?.lng ?? null;

  const distanceMiles =
    userLat !== null && userLng !== null &&
    profile?.location?.lat != null && profile?.location?.lng != null
      ? getDistanceMiles(userLat, userLng, profile.location.lat, profile.location.lng)
      : null;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
        <Spinner size="xl" color="blue.500" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box maxW="600px" mx="auto" mt="80px" p="40px">
        <Alert.Root status="error" borderRadius="md">
          <Alert.Indicator />
          {error}
        </Alert.Root>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box maxW="600px" mx="auto" mt="80px" p="40px">
        <Alert.Root status="info" borderRadius="md">
          <Alert.Indicator />
          Profile not found
        </Alert.Root>
      </Box>
    );
  }
  
  return (
    <Grid
      templateColumns="repeat(5, 1fr)"
      gap={0}
      mx="auto"
      layerStyle="card"
    >
      <GridItem colSpan={3} textAlign="left">
        <Box mb={4}>
          <Flex align="center" justify="space-between" pr={4}>
            <Box>
              <Heading size="2xl">{profile?.firstName} {profile?.lastName}</Heading>
              {profile?.reviewCount > 0 && (
                <Flex align="center" gap={1} mt={1}>
                  <Flex>
                    {[1,2,3,4,5].map((s) => (
                      <Icon
                        key={s}
                        as={LuStar}
                        boxSize="14px"
                        color={s <= Math.round(profile.averageRating) ? 'yellow.400' : 'gray.300'}
                        fill={s <= Math.round(profile.averageRating) ? 'currentColor' : 'none'}
                      />
                    ))}
                  </Flex>
                  <Text fontSize="sm" color="gray.600">
                    {profile.averageRating?.toFixed(1)} ({profile.reviewCount} {profile.reviewCount === 1 ? 'review' : 'reviews'})
                  </Text>
                </Flex>
              )}
            </Box>
            {canMessageUser && (
              <Button
                size="sm"
                variant="jam"
                onClick={handleMessageUser}
                loading={messageLoading}
              >
                <Icon as={FaCommentAlt} />
                Message
              </Button>
            )}
          </Flex>
          <Text fontSize="sm" color="gray.600" mt={1}>
            {profile?.gender ? GENDER_DISPLAY_NAMES[profile.gender] + ' · ' : 'No gender set · '}
            <Icon as={FaMapMarkerAlt} color="red.600" display="inline" mb="-1px" mr="1" />
            {profile?.location?.formattedAddress || 'No location set'}
            {distanceMiles !== null && (
              <>
                {profile?.location?.formattedAddress && <Text as="span" mx={1}>·</Text>}
                <Text as="span">{distanceMiles < 5 ? 'within 5 mi' : `~${Math.round(distanceMiles)} mi away`}</Text>
              </>
            )}
          </Text>
        </Box>
        <GridItem colSpan={4} textAlign="left" pr={4}>
          <Box mb={4}>
            <Text fontSize="lg" fontWeight="semibold" mb={1}>Bio:</Text>
            <Text fontSize="lg" color="gray.900">{profile?.bio}</Text>
          </Box>
        </GridItem>
        <Box mb={4} pr={4}>
          <Text fontSize="lg" fontWeight="semibold" mb={1}>Instruments Played:</Text>
          <Wrap gap={3}>
            {profile?.instruments?.length > 0 ? (
              profile.instruments.map((instrument, index) => (
                <WrapItem key={index} flex="1" minW="200px">
                  <InstrumentCard instrument={instrument} w="100%" />
                </WrapItem>
              ))
            ) : (
              <Text fontSize="md" color="gray.600">No instruments listed</Text>
            )}
          </Wrap>
        </Box>
        <Box mb={4}>
          <Text fontSize="lg" fontWeight="semibold" mb={1}>Genres Played:</Text>
          <Flex gap={2} flexWrap="wrap">
            {profile?.genres?.length > 0 ? (
              profile.genres.map((genre, index) => (
                <Badge key={index} variant="jam">
                  {GENRE_DISPLAY_NAMES[genre] ?? genre}
                </Badge>
              ))
            ) : (
              <Text fontSize="md" color="gray.600">No genres listed</Text>
            )}
          </Flex>
        </Box>
      </GridItem>
      <GridItem rowSpan={2} colSpan={2} pt={1}>
        {profile?.profilePicUrl ? (
          <Box
            p={0}
            borderRadius="md"
            bg="white"
            boxShadow="sm"
            height="400px"
            width="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
          >
            <Image
              borderRadius="md"
              src={profile.profilePicUrl}
              alt={`${profile?.firstName}'s profile picture`}
              w="100%"
              h="100%"
              objectFit="contain"
            />
          </Box>
        ) : (
          <Box
            p={0}
            borderWidth="1px"
            borderRadius="md"
            bg="white"
            boxShadow="sm"
            height="400px"
            width="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Icon as={CgProfile} boxSize="150px" color="gray.300" aria-label="Profile Picture" />
          </Box>
        )}
      </GridItem>
      <GridItem colSpan={3} pr={4}>
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={2}>Music Samples:</Text>
          {profile?.musicSamples?.length > 0 ? (
            <Box>
              {profile.musicSamples[sampleIndex]?.title && (
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  {profile.musicSamples[sampleIndex].title}
                </Text>
              )}
              <div ref={playerContainerRef}>
              <ReactPlayer
                key={sampleIndex}
                src={profile.musicSamples[sampleIndex]?.url}
                controls
                width="100%"
                height="60px"
                volume={playerVolume}
                style={{ background: 'var(--chakra-colors-jam-bg)' }}
              />
              </div>
              {profile.musicSamples.length > 1 && (
                <Flex justify="center" align="center" gap={4} mt={2}>
                  <IconButton
                    size="xs"
                    variant="jam"
                    onClick={() => setSampleIndex(i => (i - 1 + profile.musicSamples.length) % profile.musicSamples.length)}
                  >
                    <LuChevronLeft />
                  </IconButton>
                  <Text fontSize="md" color="jam.accent" fontWeight="semibold">
                    {sampleIndex + 1} / {profile.musicSamples.length}
                  </Text>
                  <IconButton
                    size="xs"
                    variant="jam"
                    onClick={() => setSampleIndex(i => (i + 1) % profile.musicSamples.length)}
                  >
                    <LuChevronRight />
                  </IconButton>
                </Flex>
              )}
            </Box>
          ) : (
            <Text fontSize="md" color="gray.600">No music samples uploaded</Text>
          )}
        </Box>
      </GridItem>

      {/* ---- Reviews Section ---- */}
      <GridItem colSpan={5} mt={6}>
        <Separator mb={4} />
        <Heading size="md" mb={4}>Reviews</Heading>

        {/* Submit / existing review (only visible when viewing another user's profile) */}
        {canMessageUser && myReview !== undefined && (
          <Box mb={6} p={4} borderWidth="1px" borderRadius="md" bg="gray.50">
            {myReview ? (
              // User already left a review — show it with a delete option
              <Box>
                <Flex justify="space-between" align="start">
                  <Box>
                    <Text fontWeight="semibold" mb={1}>Your review</Text>
                    <Flex mb={1}>
                      {[1,2,3,4,5].map((s) => (
                        <Icon
                          key={s}
                          as={LuStar}
                          boxSize="18px"
                          color={s <= myReview.rating ? 'yellow.400' : 'gray.300'}
                          fill={s <= myReview.rating ? 'currentColor' : 'none'}
                        />
                      ))}
                    </Flex>
                    {myReview.text && <Text color="gray.700">{myReview.text}</Text>}
                  </Box>
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    onClick={handleDeleteReview}
                    loading={reviewDeleting}
                  >
                    Delete
                  </Button>
                </Flex>
              </Box>
            ) : (
              // No review yet — show the submission form
              <Box>
                <Text fontWeight="semibold" mb={2}>Leave a review</Text>
                <Flex gap={1} mb={3}>
                  {[1,2,3,4,5].map((s) => (
                    <Box
                      key={s}
                      as="button"
                      type="button"
                      onClick={() => setReviewRating(s)}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`Rate ${s} star${s > 1 ? 's' : ''}`}
                    >
                      <Icon
                        as={LuStar}
                        boxSize="24px"
                        color={s <= (hoverRating || reviewRating) ? 'yellow.400' : 'gray.300'}
                        fill={s <= (hoverRating || reviewRating) ? 'currentColor' : 'none'}
                        transition="color 0.1s"
                      />
                    </Box>
                  ))}
                </Flex>
                <Textarea
                  placeholder="Share your experience (optional, max 300 characters)"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value.slice(0, 300))}
                  rows={3}
                  mb={2}
                />
                <Flex justify="space-between" align="center">
                  <Text fontSize="xs" color="gray.500">{reviewText.length}/300</Text>
                  <Button
                    size="sm"
                    variant="jam"
                    onClick={handleSubmitReview}
                    disabled={reviewRating === 0}
                    loading={reviewSubmitting}
                  >
                    Submit Review
                  </Button>
                </Flex>
              </Box>
            )}
          </Box>
        )}

        {/* Reviews list */}
        {reviewsLoading ? (
          <Flex justify="center" py={4}><Spinner size="sm" /></Flex>
        ) : reviews.length === 0 ? (
          <Text color="gray.500">No reviews yet.</Text>
        ) : (
          <VStack gap={4} align="stretch">
            {reviews.map((review) => (
              <Box key={review.reviewId} p={4} borderWidth="1px" borderRadius="md">
                <Flex gap={3} align="start">
                  {review.reviewerProfilePicUrl ? (
                    <Avatar.Root size="sm">
                      <Avatar.Image src={review.reviewerProfilePicUrl} />
                    </Avatar.Root>
                  ) : (
                    <Avatar.Root size="sm">
                      <Avatar.Fallback>{review.reviewerFirstName?.[0]}{review.reviewerLastName?.[0]}</Avatar.Fallback>
                    </Avatar.Root>
                  )}
                  <Box flex="1">
                    <Flex justify="space-between" align="center" mb={1}>
                      <Text fontWeight="semibold">
                        {review.reviewerFirstName} {review.reviewerLastName}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                      </Text>
                    </Flex>
                    <Flex mb={1}>
                      {[1,2,3,4,5].map((s) => (
                        <Icon
                          key={s}
                          as={LuStar}
                          boxSize="14px"
                          color={s <= review.rating ? 'yellow.400' : 'gray.300'}
                          fill={s <= review.rating ? 'currentColor' : 'none'}
                        />
                      ))}
                    </Flex>
                    {review.text && <Text color="gray.700">{review.text}</Text>}
                  </Box>
                </Flex>
              </Box>
            ))}
          </VStack>
        )}
      </GridItem>
    </Grid>
  );
}

export default Profile;
