import { auth } from '../firebase';

// This service handles all post-related API calls, including fetching, updating, and deleting posts.
// It uses the Firebase Auth token which is initially obtained in the AuthContext to authenticate requests to the backend API.
// The idea is that we should have a single service for all post-related operations


const postService = {
  getPost: async (postId) => {
    try {
      // Here we use the Firebase Auth token to authenticate the request to the backend API
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }
      const token = await user.getIdToken();

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/posts/${postId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // If the post doesn't exist.
      if (response.status === 404) {
        return null; 
      }
      
      // If there's another error, throw it.
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // TODO: We need to eventually handle errors more strategically, but for now we'll just log them and rethrow.
      console.error('Failed to fetch post:', error);
      throw new Error('Failed to fetch post');
    }
  },

  getPosts: async (limit = 10, startAfter = null, userId = null) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }
      const token = await user.getIdToken();

      const params = new URLSearchParams({ limit: limit.toString() });
      if (startAfter) params.append('start_after', startAfter);
      if (userId) params.append('user_id', userId);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/posts?${params}`, {
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

  getFeed: async (radiusMilesOrOpts = 25, limitMaybe = 50) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }
      const token = await user.getIdToken();

      let radiusMiles = 25;
      let limit = 50;

      if (typeof radiusMilesOrOpts === 'object' && radiusMilesOrOpts !== null) {
        radiusMiles = Number(radiusMilesOrOpts.radiusMiles != null ? radiusMilesOrOpts.radiusMiles : (radiusMilesOrOpts.radius_miles != null ? radiusMilesOrOpts.radius_miles : 25));
        limit = Number(radiusMilesOrOpts.limit != null ? radiusMilesOrOpts.limit : 50);
      } else {
        radiusMiles = Number(radiusMilesOrOpts != null ? radiusMilesOrOpts : 25);
        limit = Number(limitMaybe != null ? limitMaybe : 50);
      }

      const params = new URLSearchParams({
        radius_miles: String(radiusMiles),
        limit: String(limit)
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/posts/feed?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMsg = 'Failed to fetch feed';
        try {
          const errorData = await response.json();
          if (errorData && errorData.detail) {
            errorMsg = errorData.detail;
          }
        } catch (_) {
        }
        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch feed:', error);
      throw error;
    }
  },

  createPost: async (postData) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }
      const token = await user.getIdToken();

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

  updatePost: async (postId, data) => {
    // TODO: Implement the update post logic using the API endpoint for updating posts.
  },

  deletePost: async (postId) => {
    // TODO: Implement the delete post logic using the API endpoint for deleting posts.
  },

  toggleLike: async (postId) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }
      const token = await user.getIdToken();

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMsg = 'Failed to toggle like';
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
      console.error('Failed to toggle like:', error);
      throw error;
    }
  }
};

export default postService;