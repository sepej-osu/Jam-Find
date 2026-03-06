import { auth } from '../firebase';

// Helper function to get the current user's auth token
// Cannot call AuthContext here since this service is used by multiple components and contexts, so we directly use Firebase auth.
async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('No user logged in');
  return user.getIdToken();
}

const postService = {
  getPost: async (postId) => {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/posts/${postId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Error: ${response.status}`);

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch post:', error);
      throw new Error('Failed to fetch post');
    }
  },

  getPosts: async (params = {}) => {
    try {
      const token = await getAuthToken();

      const {
        limit = 10,
        lastDocId = null,
        userId = null,
        postType = null,
        instruments = [],
        instrumentMode = 'any',
        genres = [],
        genreMode = 'any',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        radiusMiles = null,
        userLat = null,
        userLng = null,
        page = null,
      } = params;

      const urlParams = new URLSearchParams({
        limit: limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (lastDocId) urlParams.append('last_doc_id', lastDocId);
      if (page !== null) urlParams.append('page', page.toString());
      if (userId) urlParams.append('user_id', userId);
      if (postType) urlParams.append('post_type', postType);
      instruments.forEach(i => urlParams.append('instruments', i));
      if (instruments.length > 0) urlParams.append('instrument_mode', instrumentMode);
      genres.forEach(g => urlParams.append('genres', g));
      if (genres.length > 0) urlParams.append('genre_mode', genreMode);
      if (radiusMiles !== null) urlParams.append('radius_miles', radiusMiles.toString());
      if (userLat !== null) urlParams.append('user_lat', userLat.toString());
      if (userLng !== null) urlParams.append('user_lng', userLng.toString());

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/posts?${urlParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      throw new Error('Failed to fetch posts');
    }
  },

  createPost: async (postData) => {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        let errorMsg = 'Failed to create post';
        try {
          const errorData = await response.json();
          if (errorData?.detail) {
            errorMsg = errorData.detail;
          }
        } catch (_) {
          // Ignore JSON parsing errors
        }
        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create post:', error);
      throw error;
    }
  },

  updatePost: async (postId, updateData) => {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) throw new Error('Failed to update post');
      return await response.json();
    } catch (error) {
      console.error('Failed to update post:', error);
      throw error;
    }
  },

  toggleLike: async (postId) => {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMessage = 'Failed to toggle like';
        try {
          const errorData = await response.json();
          if (errorData && typeof errorData === 'object' && errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch (e) {
          // If parsing the error response fails, fall back to the default message.
        }
        throw new Error(errorMessage);
      }
      return await response.json();
    } catch (error) {
      console.error('Toggle like error:', error);
      throw error;
    }
  },

  deletePost: async (postId) => {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete post');
      return true;
    } catch (error) {
      console.error('Failed to delete post:', error);
      throw error;
    }
  }
};

export default postService;