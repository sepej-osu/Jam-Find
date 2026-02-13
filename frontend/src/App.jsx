import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

import Login from './Login';
import Register from './Register';
import Home from './Home';
import CreatePost from './CreatePost';

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
          user ? <Home /> : <Navigate to="/login" replace />
        }
      />

      <Route
        path="/create-post"
        element={
          user ? <CreatePost /> : <Navigate to="/login" replace />
        }
      />

    </Routes>
  );
}

export default App;
