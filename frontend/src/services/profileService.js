import { auth } from '../firebase';

// This service handles all profile-related API calls, including fetching, updating, and deleting profiles.
// It uses the Firebase Auth token which is initially obtained in the AuthContext to authenticate requests to the backend API.
// The idea is that we should have a single service for all profile-related operations


const profileService = {
  getProfile: async (userId) => {
    try {
      // Here we use the Firebase Auth token to authenticate the request to the backend API
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }
      const token = await user.getIdToken();

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/profiles/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // If the profile doesn't exist.
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
      console.error('Failed to fetch profile:', error);
      throw  new Error('Failed to fetch profile');
    }
  },

  updateProfile: async (userId, data) => {
    // TODO: Implement the update profile logic using the API endpoint for updating profiles.
  },

  deleteProfile: async (userId) => {
    // TODO: Implement the delete profile logic using the API endpoint for deleting profiles.
  }
};

export default profileService;