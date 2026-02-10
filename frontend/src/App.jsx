import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

import Login from './Login';
import Register from './Register';
import Home from './Home';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Routes>

      // Redirect root to login until we write a landing page
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/login"
        element={
          user ? <Navigate to="/home" replace /> : <Login />
        }
      />

      <Route path="/register" element={
        user ? <Navigate to="/home" replace /> : <Register />
      } 
      />


      // Temporary Home/Protected Page for registered users
      <Route
        path="/home"
        element={
          // We need to create a backend API route to check if the user has completed their profile and redirect them to CreateProfile.
          user ? <Home /> : <Navigate to="/login" replace />
        }
      />

    </Routes>
  );
}

export default App;
