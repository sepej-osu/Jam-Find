
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import Home from './Home';
import CreatePost from './CreatePost';
import CreateProfile from './CreateProfile';
import { useAuth } from './contexts/AuthContext';
import { useEffect } from 'react';
import { useToast } from '@chakra-ui/react';

function App() {

    const { currentUser, hasProfile, loading, profileError } = useAuth();
    const toast = useToast();
  
    // Show error toast if profile fetch failed
    // TODO: we need to figure out a more professional way to handle this, but for now this will
    //  at least alert the user that something went wrong with fetching their profile after login

  useEffect(() => {
    if (profileError) {
      toast({
        title: 'Server Error',
        description: 'Unable to load your profile. Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [profileError, toast]);
    // Show loading state while auth context is initializing
    if (loading) return <div>Loading...</div>;

  return (
    <Routes>

      // Redirect root to login until we write a landing page
      <Route path="/" element={
        (currentUser && hasProfile) ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} />

      <Route
        path="/login"
        element={
          (currentUser && hasProfile) ? <Navigate to="/home" replace /> : <Login />
        }
      />
      
    <Route
        path="/create-profile"
        element={
          (currentUser && !hasProfile && !profileError) ? <CreateProfile /> : <Navigate to="/login" replace />
        }
      />

      <Route path="/register" element={
        (currentUser && hasProfile) ? <Navigate to="/home" replace /> : <Register />
      } 
      />

      // Temporary Home/Protected Page for registered users
      <Route
        path="/home"
        element={
          (currentUser && hasProfile) ? <Home /> : <Navigate to="/login" replace />
        }
      />

      <Route
        path="/create-post"
        element={
          (currentUser && hasProfile) ? <CreatePost /> : <Navigate to="/login" replace />
        }
      />

    </Routes>
  );
}

export default App;
