import {
  Box,
  Text,
  Flex,
  Icon,
  Button,
  IconButton,
  Spinner,
  Textarea,
  VStack,
  Avatar,
  Pagination,
  ButtonGroup,
} from '@chakra-ui/react';
import { LuChevronLeft, LuChevronRight, LuStar } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import reviewService from '../services/reviewService';
import { toaster } from './ui/toaster';

const PAGE_SIZE = 3; // number of reviews to show per page

function Reviews({ profileUserId, canReview, onProfileUpdate }) {
  const navigate = useNavigate(); // for navigating to reviewer profiles
  const [reviews, setReviews] = useState([]); // all reviews for this profile
  const [reviewsLoading, setReviewsLoading] = useState(false); // separate loading state for reviews list
  const [reviewsPage, setReviewsPage] = useState(1); // pagination state
  const [myReview, setMyReview] = useState(undefined); // undefined = not yet loaded, null = no review
  const [reviewRating, setReviewRating] = useState(0); // for new review submission
  const [hoverRating, setHoverRating] = useState(0); // for star hover effect
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false); // to prevent multiple submissions
  const [reviewDeleting, setReviewDeleting] = useState(false); // to prevent multiple deletions

  useEffect(() => {
    if (!profileUserId) return;

    const fetchReviews = async () => {
      setReviewsLoading(true);
      setReviewsPage(1); // reset to first page when fetching new reviews
      try {
        const data = await reviewService.getReviews(profileUserId, { limit: 50 }); // fetch more than needed for pagination to minimize future requests
        const sorted = (data.reviews || []).slice().sort( // create a copy before sorting
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt) // sort newest first
        );
        setReviews(sorted);
      } catch {
        // non-critical; silently fail
      } finally {
        setReviewsLoading(false);
      }
    };

    // fetch the current user's review separately
    // it's needed for the submission form and may not be included in the first page of reviews
    const fetchMyReview = async () => {
      if (!canReview) {
        setMyReview(null);
        return;
      }
      try {
        const data = await reviewService.getMyReview(profileUserId);
        setMyReview(data);
      } catch {
        setMyReview(null);
      }
    };

    fetchReviews();
    fetchMyReview();
  }, [profileUserId, canReview]);

  const handleSubmitReview = async () => {
    if (reviewRating === 0 || reviewSubmitting) return; // basic validation and prevent multiple submissions
    setReviewSubmitting(true);
    try {
      const created = await reviewService.createReview(profileUserId, {
        rating: reviewRating,
        text: reviewText.trim() || null,
      });
      setMyReview(created);
      setReviews((prev) =>
        [created, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // add new review to the top of the list
      );
      setReviewsPage(1); // reset to first page to show the new review
      onProfileUpdate?.((prev) => ({
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
    if (!myReview || reviewDeleting) return; // basic validation and prevent multiple deletions
    setReviewDeleting(true);
    try {
      await reviewService.deleteReview(profileUserId, myReview.reviewId);
      setReviews((prev) => prev.filter((r) => r.reviewId !== myReview.reviewId));
      setReviewsPage(1); // reset to first page after deletion
      onProfileUpdate?.((prev) => {
        const newCount = Math.max((prev.reviewCount || 1) - 1, 0);
        return {
          ...prev,
          reviewCount: newCount,
          averageRating:
            newCount === 0
              ? null
              : Math.round(
                  ((prev.averageRating * prev.reviewCount) - myReview.rating) / newCount * 100 // recalculate average rating after removing the review
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

  return (
    <Box>
      <Text fontSize="lg" fontWeight="semibold" mb={1}>Reviews:</Text>

      {/* Reviews list */}
      {reviewsLoading ? (
        <Flex justify="center" py={4}><Spinner size="sm" /></Flex>
      ) : reviews.length === 0 ? (
        <Text color="jam.text">No reviews yet.</Text>
      ) : (
        <>
          <VStack gap={4} align="stretch">
            {reviews.slice((reviewsPage - 1) * PAGE_SIZE, reviewsPage * PAGE_SIZE).map((review) => (
              <Box key={review.reviewId} pl={5} layerStyle="card">
                <Flex gap={3} align="start">
                  <Box
                    as="button"
                    type="button"
                    onClick={() => navigate(`/profile/${review.reviewerId}`)}
                    cursor="pointer"
                  >
                    {review.reviewerProfilePicUrl ? (
                      <Avatar.Root size="sm" shape="rounded">
                        <Avatar.Image src={review.reviewerProfilePicUrl} />
                      </Avatar.Root>
                    ) : (
                      <Avatar.Root size="sm" shape="rounded">
                        <Avatar.Fallback>{review.reviewerFirstName?.[0]}{review.reviewerLastName?.[0]}</Avatar.Fallback>
                      </Avatar.Root>
                    )}
                  </Box>
                  <Box flex="1">
                    <Flex justify="space-between" align="center" mb={1}>
                      <Text
                        color="jam.text"
                        as="button"
                        type="button"
                        fontWeight="semibold"
                        onClick={() => navigate(`/profile/${review.reviewerId}`)}
                        cursor="pointer"
                        _hover={{ textDecoration: 'underline' }}
                      >
                        {review.reviewerFirstName} {review.reviewerLastName}
                      </Text>
                      <Text fontSize="xs" color="jam.textMuted">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                      </Text>
                    </Flex>
                    <Flex mb={1}>
                      {[1,2,3,4,5].map((s) => (
                        <Icon
                          key={s}
                          as={LuStar}
                          boxSize="14px"
                          color={s <= review.rating ? 'jam.400' : 'jam.50'}
                          fill={s <= review.rating ? 'currentColor' : 'none'}
                        />
                      ))}
                    </Flex>
                    {review.text && <Text color="jam.text">{review.text}</Text>}
                  </Box>
                </Flex>
              </Box>
            ))}
          </VStack>
          {reviews.length > PAGE_SIZE && (
            <Pagination.Root
              count={reviews.length}
              pageSize={PAGE_SIZE}
              page={reviewsPage}
              onPageChange={(e) => setReviewsPage(e.page)}
              mt={4}
            >
              <ButtonGroup variant="ghost" size="sm" display="flex" justifyContent="center" width="100%">
                <Pagination.PrevTrigger asChild>
                  <IconButton aria-label="Previous page">
                    <LuChevronLeft />
                  </IconButton>
                </Pagination.PrevTrigger>
                <Pagination.Items
                  render={(page) => (
                    <IconButton variant={{ base: 'ghost', _selected: 'outline' }} aria-label={`Page ${page.value}`}>
                      {page.value}
                    </IconButton>
                  )}
                />
                <Pagination.NextTrigger asChild>
                  <IconButton aria-label="Next page">
                    <LuChevronRight />
                  </IconButton>
                </Pagination.NextTrigger>
              </ButtonGroup>
            </Pagination.Root>
          )}
        </>
      )}

      {/* Submit / existing review (only visible when viewing another user's profile) */}
      {canReview && myReview !== undefined && (
        <Box mt={6} p={4}>
          {myReview ? (
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
                        color={s <= myReview.rating ? 'jam.400' : 'jam.50'}
                        fill={s <= myReview.rating ? 'currentColor' : 'none'}
                      />
                    ))}
                  </Flex>
                  {myReview.text && <Text color="jam.text">{myReview.text}</Text>}
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
                      color={s <= (hoverRating || reviewRating) ? 'jam.400' : 'jam.50'}
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
                <Text fontSize="xs" color="jam.textMuted">{reviewText.length}/300</Text>
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
    </Box>
  );
}

export default Reviews;
