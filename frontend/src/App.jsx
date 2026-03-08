
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import CreatePost from './CreatePost';
import CreateProfile from './CreateProfile';
import UpdateProfile from './UpdateProfile';
import Profile from './Profile';
import Post from './components/Post';
import DiscoveryFeed from './DiscoveryFeed';
import Layout from './Layout';

import { useAuth } from './contexts/AuthContext';
import { useEffect } from 'react';
import { toaster } from "./components/ui/toaster"

function App() {

    const { currentUser, hasProfile, loading, profileError } = useAuth();
  
    // Show error toast if profile fetch failed
    // TODO: we need to figure out a more professional way to handle this, but for now this will
    //  at least alert the user that something went wrong with fetching their profile after login

  useEffect(() => {
    if (profileError) {
      toaster.create({
        title: 'Server Error',
        description: 'Unable to load your profile. Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [profileError]);
    // Show loading state while auth context is initializing
    if (loading) return <div>Loading...</div>;

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Redirect root to login until we write a landing page */}
        <Route
          index
          element={
            (currentUser && hasProfile)
              ? <Navigate to="/feed" replace />
              : <Navigate to="/login" replace />
          }
        />

        <Route
          path="login"
          element={
            (currentUser && hasProfile) ? <Navigate to="/feed" replace /> : <Login />
          }
        />

        <Route
          path="create-profile"
          element={
            (currentUser && !hasProfile && !profileError) ? <CreateProfile /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="register"
          element={
            (currentUser && hasProfile) ? <Navigate to="/feed" replace /> : <Register />
          }
        />

        <Route
          path="update-profile"
          element={
            (currentUser && hasProfile) ? <UpdateProfile /> : <Navigate to="/login" />
          }
        />

        <Route
          path="profile"
          element={
            (currentUser && hasProfile) ? <Profile /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="profile/:userId"
          element={
            (currentUser && hasProfile) ? <Profile /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="create-post"
          element={
            (currentUser && hasProfile) ? <CreatePost /> : <Navigate to="/login" replace />
          }
        />

      <Route
        path="/feed"
        element={
          (currentUser && hasProfile) ? <DiscoveryFeed /> : <Navigate to="/login" replace />
        }
      />

        <Route
          path="posts/:postId"
          element={
            (currentUser && hasProfile) ? <Post /> : <Navigate to="/login" replace />
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
