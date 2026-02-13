import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Box,
  Button,
  Center,
  Heading,
  VStack,
  useToast,
  Text
} from '@chakra-ui/react';
import { Link as ChakraLink } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import InputField from './components/InputField';

const Login = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password); // Firebase authentication service
      
      toast({
        title: 'Login successful!',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      // Wait a tiny bit for context to load profile
      setTimeout(() => {
        if (hasProfile) {
          navigate('/home');
        } else {
          navigate('/create-profile');
        }
      }, 800); // set to 800ms to give the context enough time to update after login
      
    } catch (err) {
      toast({
        title: 'Login failed',
        description: err.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center minH="100vh" bg="gray.50" px={4}>
      <Box 
        maxW="450px" 
        w="full"
        p={10} 
        borderWidth="1px" 
        borderRadius="lg" 
        shadow="lg"
        bg="white"
      >
        <VStack spacing={6} mb={6}>
          <Heading size="lg">Welcome Back</Heading>
          <Text color="gray.600">Login to your account</Text>
        </VStack>

        <form onSubmit={handleLogin}>
          <VStack spacing={4} align="stretch">
            <InputField
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <InputField
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              width="100%"
              isLoading={loading}
              loadingText="Logging in..."
            >
              Login
            </Button>
          </VStack>
        </form>

        <Text textAlign="center" mt={6} color="gray.600">
          Don't have an account?{' '}
          <ChakraLink as={RouterLink} to="/register" color="blue.500">
            Sign up
          </ChakraLink>
        </Text>
      </Box>
    </Center>
  );
};

export default Login;