import { auth } from '../firebase';

const reviewService = {
  createReview: async (userId, { rating, text }) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');
    const token = await user.getIdToken();

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/v1/profiles/${userId}/reviews`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating, text: text || null }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Error: ${response.status}`);
    }
    return response.json();
  },

  getReviews: async (userId, { limit = 10, lastDocId } = {}) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');
    const token = await user.getIdToken();

    const params = new URLSearchParams({ limit });
    if (lastDocId) params.set('last_doc_id', lastDocId);

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/v1/profiles/${userId}/reviews?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Error: ${response.status}`);
    }
    return response.json(); // { reviews, nextPageToken }
  },

  getMyReview: async (userId) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');
    const token = await user.getIdToken();

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/v1/profiles/${userId}/reviews/my`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Error: ${response.status}`);
    }
    return response.json(); // ReviewResponse or null
  },

  deleteReview: async (userId, reviewId) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');
    const token = await user.getIdToken();

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/v1/profiles/${userId}/reviews/${reviewId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Error: ${response.status}`);
    }
  },
};

export default reviewService;
