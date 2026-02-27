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
      if (startAfter) params.append('startAfter', startAfter);
      if (userId) params.append('userId', userId);

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

  updatePost: async (postId, updateData) => {
    try {
      const user = auth.currentUser;
      if (!user)
        throw new Error('No user logged in');
      const token = await user.getIdToken();

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
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');
      const token = await user.getIdToken();

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to toggle like');
      return await response.json(); // Returns LikeResponse object
    } catch (error) {
      console.error('Toggle like error:', error);
      throw error;
    }
  },

  deletePost: async (postId) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');
      const token = await user.getIdToken();

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