import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Box, Button, Center, Heading, VStack, Text, Field } from '@chakra-ui/react';
import { toaster } from "./components/ui/toaster"
import { Link as ChakraLink } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import InputField from './components/InputField';
import { PasswordInput } from './components/ui/password-input';

const Login = () => {
  const navigate = useNavigate();
  const { hasProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState('false');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading('true');
    
    try {
      await signInWithEmailAndPassword(auth, email, password); // Firebase authentication service
      
      toaster.create({
        title: 'Login successful',
        description: 'You have successfully logged in.',
        status: 'success',
        duration: 4000,
        isClosable: true,
      });

      // Wait a tiny bit for context to load profile
      setTimeout(() => {
        if (hasProfile) {
          navigate('/feed');
        } else {
          navigate('/create-profile');
        }
      }, 800); // set to 800ms to give the context enough time to update after login
      
    } catch (err) {
      toaster.create({
        title: 'Login failed',
        description: err.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading('false');
    }
  };

  return (
    <Center bg="jam.700" px={4}>
      <Box 
        maxW="450px" 
        w="full"
        layerStyle="card"
      >
        <VStack gap={6} mb={6}>
          <Heading size="lg">Welcome to Jam Find</Heading>
          <Text color="jam.text">Login to or sign up for an account</Text>
        </VStack>

        <form onSubmit={handleLogin}>
          <VStack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>Email</Field.Label>
            <InputField
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field.Root>

          <Field.Root required>
            <Field.Label>Password</Field.Label>
            <PasswordInput
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </Field.Root>

            <Button
              type="submit"
              size="lg"
              variant="solid"
              bg="jam.accent"
              fontWeight="semibold"
              _hover={{ bg: "jam.400" }}
              width="100%"
              isLoading={loading === 'true'? 'true' : 'false'}
              loadingText="Logging in..."
            >
              Login
            </Button>
          </VStack>
        </form>

        <Text textAlign="center" mt={6} color="jam.text">
          Don't have an account?{' '}
          <ChakraLink color="jam.textMuted" asChild>
          <RouterLink to="/register">Sign up</RouterLink>
          </ChakraLink>
        </Text>
      </Box>
    </Center>
  );
};

export default Login;