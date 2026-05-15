import { useState, useEffect } from 'react';
import { toaster } from '../components/ui/toaster';
import postService from '../services/postService';

export function useLike(postId, initialLikes, initialLiked) {
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likingInProgress, setLikingInProgress] = useState(false);

  // Sync when initial values arrive asynchronously (e.g. post loaded via fetch)
  useEffect(() => {
    setLikesCount(initialLikes);
    setIsLiked(initialLiked);
  }, [initialLikes, initialLiked]);

  const handleLikeToggle = async () => {
    if (likingInProgress) return;

    try {
      setLikingInProgress(true);
      const response = await postService.toggleLike(postId);
      setLikesCount(response.likes);
      setIsLiked(response.liked);
    } catch (err) {
      console.error('Failed to toggle like:', err);
      toaster.create({
        title: 'Failed to update like',
        description: err.message || 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLikingInProgress(false);
    }
  };

  return { likesCount, isLiked, likingInProgress, handleLikeToggle };
}
