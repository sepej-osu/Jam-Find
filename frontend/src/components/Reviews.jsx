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
} from '@chakra-ui/react';
import { LuChevronLeft, LuChevronRight, LuStar } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import reviewService from '../services/reviewService';
import { toaster } from './ui/toaster';

const PAGE_SIZE = 3; // number of reviews to fetch per server request

function Reviews({ profileUserId, canReview, onProfileUpdate }) {
  const navigate = useNavigate();
  const [pages, setPages] = useState([[]]); // cached pages: pages[i] = array of reviews for page i
  const [cursors, setCursors] = useState([null]); // cursors[i] = lastDocId to fetch page i (null = first page)
  const [nextTokens, setNextTokens] = useState([null]); // nextTokens[i] = token returned after fetching page i
  const [currentPage, setCurrentPage] = useState(0); // 0-based page index
  const [hasMore, setHasMore] = useState(false); // true if there's a next page beyond the last fetched
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myReview, setMyReview] = useState(undefined);
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDeleting, setReviewDeleting] = useState(false);

  const fetchPage = async (profileId, lastDocId = null) => {
    setReviewsLoading(true);
    try {
      const data = await reviewService.getReviews(profileId, { limit: PAGE_SIZE, lastDocId });
      return { reviews: data.reviews || [], nextToken: data.nextPageToken ?? null };
    } catch {
      return { reviews: [], nextToken: null };
    } finally {
      setReviewsLoading(false);
    }
  };

  const resetAndFetch = async (profileId) => {
    setCurrentPage(0);
    const { reviews, nextToken } = await fetchPage(profileId, null);
    setPages([reviews]);
    setCursors([null]);
    setNextTokens([nextToken]);
    setHasMore(nextToken !== null);
  };

  useEffect(() => {
    if (!profileUserId) return;

    resetAndFetch(profileUserId);

    // fetch the current user's review separately
    // it's needed for the submission form and may not be in the current page
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

    fetchMyReview();
  }, [profileUserId, canReview]);

  const handleNextPage = async () => {
    const nextPageIndex = currentPage + 1;
    if (pages[nextPageIndex]) {
      // already fetched — use cache
      setCurrentPage(nextPageIndex);
      setHasMore(nextTokens[nextPageIndex] !== null);
    } else {
      const lastDocId = nextTokens[currentPage];
      if (!lastDocId) return;
      const { reviews, nextToken } = await fetchPage(profileUserId, lastDocId);
      setPages((prev) => [...prev, reviews]);
      setCursors((prev) => [...prev, lastDocId]);
      setNextTokens((prev) => [...prev, nextToken]);
      setCurrentPage(nextPageIndex);
      setHasMore(nextToken !== null);
    }
  };

  const handlePrevPage = () => {
    if (currentPage === 0) return;
    const prevPageIndex = currentPage - 1;
    setCurrentPage(prevPageIndex);
    setHasMore(nextTokens[prevPageIndex] !== null || pages[currentPage]?.length > 0);
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0 || reviewSubmitting) return; // basic validation and prevent multiple submissions
    setReviewSubmitting(true);
    try {
      const created = await reviewService.createReview(profileUserId, {
        rating: reviewRating,
        text: reviewText.trim() || null,
      });
      setMyReview(created);
      onProfileUpdate?.((prev) => ({
        ...prev,
        reviewCount: (prev.reviewCount || 0) + 1,
        averageRating:
          prev.reviewCount > 0
            ? Math.round(((prev.averageRating * prev.reviewCount) + reviewRating) / (prev.reviewCount + 1) * 100) / 100
            : reviewRating,
      }));
      // Reset to page 1 to show the new review (API returns newest first)
      await resetAndFetch(profileUserId);
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
      onProfileUpdate?.((prev) => {
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
      await resetAndFetch(profileUserId);
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
      ) : pages[currentPage]?.length === 0 && currentPage === 0 ? (
        <Text color="jam.text">No reviews yet.</Text>
      ) : (
        <>
          <VStack gap={4} align="stretch">
            {(pages[currentPage] || []).map((review) => (
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
          {(currentPage > 0 || hasMore) && (
            <Flex justify="center" gap={2} mt={4}>
              <IconButton
                aria-label="Previous page"
                variant="ghost"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 0 || reviewsLoading}
              >
                <LuChevronLeft />
              </IconButton>
              <Text alignSelf="center" fontSize="sm">Page {currentPage + 1}</Text>
              <IconButton
                aria-label="Next page"
                variant="ghost"
                size="sm"
                onClick={handleNextPage}
                disabled={!hasMore || reviewsLoading}
              >
                <LuChevronRight />
              </IconButton>
            </Flex>
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
