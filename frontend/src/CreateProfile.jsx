import { useState } from 'react';
import { auth } from './firebase';

function CreateProfile() {
  const [formData, setFormData] = useState({
    bio: '',
    gender: '',
    experienceYears: '',
    location: {
      placeId: '',
      formattedAddress: '',
      lat: 0,
      lng: 0
    },
    profilePicUrl: '',
    instruments: [],
    genres: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      // Get Firebase ID token
      const token = await user.getIdToken();

      // Make API request
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: user.uid,
          email: user.email,
          bio: formData.bio,
          gender: formData.gender || null,
          experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : null,
          location: (formData.location.placeId && formData.location.formattedAddress) ? formData.location : null,
          profilePicUrl: formData.profilePicUrl || null,
          instruments: formData.instruments,
          genres: formData.genres
        })
      });

      let data = null;

      if (!response.ok) {
        let errorMsg = 'Failed to create profile';
        try {
          const errorData = await response.json();
          if (errorData && typeof errorData === 'object' && errorData.detail) {
            errorMsg = errorData.detail;
          }
        } catch (_){
          // Ignore JSON parsing errors
        }
        throw new Error(errorMsg);
      }

      try {
        data = await response.json();
      }
      catch (_){
        data = null;
      }

      setSuccess('Profile created successfully!');
      console.log('Profile created:', data);
      
      // Reset form
      setFormData({
        bio: '',
        gender: '',
        experienceYears: '',
        location: {
          placeId: '',
          formattedAddress: '',
          lat: 0,
          lng: 0
        },
        profilePicUrl: '',
        instruments: [],
        genres: []
      });
    } catch (err) {
      setError(err.message);
      console.error('Error creating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2>Create Your Profile</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Bio:</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            maxLength={500}
            rows={4}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
          <small style={{ color: '#666' }}>{formData.bio.length}/500 characters</small>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Gender (Optional):</label>
          <input
            type="text"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            placeholder="e.g., Male, Female, Non-binary, Prefer not to say"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Years of Experience:</label>
          <input
            type="number"
            name="experienceYears"
            value={formData.experienceYears}
            onChange={handleChange}
            min="0"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Location (City, State):</label>
          <input
            type="text"
            name="formattedAddress"
            value={formData.location.formattedAddress}
            onChange={(e) => setFormData({
              ...formData,
              location: { ...formData.location, formattedAddress: e.target.value }
            })}
            placeholder="e.g., Portland, OR"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
          <small style={{ color: '#666' }}>Note: Coordinates will be added with geocoding later</small>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Profile Picture URL:</label>
          <input
            type="url"
            name="profilePicUrl"
            value={formData.profilePicUrl}
            onChange={handleChange}
            placeholder="https://example.com/photo.jpg"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Genres (comma-separated):</label>
          <input
            type="text"
            name="genres"
            value={formData.genres.join(', ')}
            onChange={(e) => setFormData({
              ...formData,
              genres: e.target.value.split(',').map(g => g.trim()).filter(g => g)
            })}
            placeholder="Jazz, Rock, Blues"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Instruments (name:level, comma-separated):</label>
          <input
            type="text"
            name="instruments"
            placeholder="Guitar:8, Piano:5, Drums:6"
            onChange={(e) => {
              const instruments = e.target.value.split(',').map(i => {
                const [name, level] = i.trim().split(':');
                if (name && level) {
                  return { name: name.trim(), experienceLevel: parseInt(level) || 5 };
                }
                return null;
              }).filter(i => i !== null);
              setFormData({ ...formData, instruments });
            }}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
          <small style={{ color: '#666' }}>Format: InstrumentName:Level (1-10)</small>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            cursor: loading ? 'not-allowed' : 'pointer',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          {loading ? 'Creating...' : 'Create Profile'}
        </button>
      </form>

      {error && (
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: '#d4edda', 
          color: '#155724',
          borderRadius: '4px'
        }}>
          {success}
        </div>
      )}
    </div>
  );
}

export default CreateProfile;
