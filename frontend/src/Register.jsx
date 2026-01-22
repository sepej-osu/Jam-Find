import { useState } from 'react';
import { auth } from './firebase';
import { createUserWithEmailAndPassword, getAuth, validatePassword } from 'firebase/auth';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
const [password_confirm, setPassword_confirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== password_confirm) {
        alert('Passwords do not match!');
        return;
    }
    setError('');
    setSuccess('');

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setSuccess(`Account created successfully! User: ${userCredential.user.email}`);
      setEmail('');
      setPassword('');
      setPassword_confirm('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="8"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Confirm Password:</label>
          <input
            type="password"
            value={password_confirm}
            onChange={(e) => setPassword_confirm(e.target.value)}
            required
            minLength="8"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
          {password_confirm && password !== password_confirm && (
    <p style={{ color: 'red', fontSize: '14px', marginTop: '5px' }}>
      Passwords do not match
    </p>
  )}
        </div>

        <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Register
        </button>
      </form>

      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      {success && <p style={{ color: 'green', marginTop: '10px' }}>{success}</p>}
    </div>
  );
}

export default Register;