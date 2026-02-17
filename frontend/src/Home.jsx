
import { Box, Heading, Text, VStack, Button } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import LogoutButton from './components/LogoutButton';


function Home() {
  const { user, profile } = useAuth();
  return (
    <Box
      maxW="600px"
      mx="auto"
      mt="80px"
      p="40px"
      borderWidth="1px"
      borderRadius="lg"
      boxShadow="md"
      bg="white"
    >
      <VStack spacing={4} textAlign="center">
        <Heading size="lg">Hi, {profile?.firstName}!</Heading>

        <Text fontSize="md" color="gray.600">
          This is your placeholder page.  
          You can build your dashboard or profile here later.
        </Text>

        <Button 
          as={RouterLink} 
          to="/create-post" 
          colorScheme="blue"
          size="lg"
          width="100%"
        >
          Create a Post
        </Button>
        <LogoutButton />
      </VStack>
    </Box>
  );
        
}

export default Home;
