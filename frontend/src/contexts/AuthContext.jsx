import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import profileService from '../services/profileService';

const AuthContext = createContext();

// This is the hook you'll use in components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// This is the provider that wraps the app and makes the auth object available to the rest of the app
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null); // For handling profile fetch errors

  useEffect(() => {
    // this listens to Firebase auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      setProfileError(null); // Reset profile error on auth state change
      if (user) {
        // User logged in - fetch their profile
        try {
          const userProfile = await profileService.getProfile(user.uid);
          setProfile(userProfile); // Will be null if profile doesn't exist

        } catch (error) {
          // API failure or other error while fetching profile
          console.error('Error fetching profile:', error);
          setProfile(null);
          setProfileError('Error fetching profile. Please try again later.');
        }
      } else {
        // User logged out - clear profile
        setProfile(null);
      }
      
      setLoading(false);
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  // Function to refresh profile (call after creating/updating profile)
  const refreshProfile = async () => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }
    
    try {
      const userProfile = await profileService.getProfile(user.uid);
      setProfile(userProfile);
    } catch (error) {
      console.error('Error refreshing profile:', error);
      setProfileError('Error refreshing profile. Please try again later.');
      throw error;
    }
  };

  const value = {
    currentUser,      // Firebase user object
    profile,          // User's profile from your database (or null)
    loading,          // true while checking auth state
    hasProfile: !!profile,  // Quick boolean check
    profileError,     // Any error that occurred while fetching the profile
    refreshProfile    // Call this after creating a profile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};