
import { Box, Heading, Text, VStack, Button, Flex } from '@chakra-ui/react';
import { useAuth } from './contexts/AuthContext';
import { Link as RouterLink } from 'react-router-dom';
import LogoutButton from './components/LogoutButton';
import { useNavigate } from 'react-router-dom';
import NavBar from './components/NavBar';

function Home() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  return (

    <Flex>
      <NavBar />
      <Box flex="1" >
    <Box
      maxW="600px"
      mx="auto"
      mt="80px"
      p="40px"
      borderWidth="1px"
      borderRadius="lg"
      boxShadow="md"
      bg="white"
      left={10}
    >
      <VStack gap={4} textAlign="center">
        <Heading size="lg">Hi, {profile?.firstName}!</Heading>

        <Text fontSize="md" color="gray.600">
          This is your placeholder page.  
          You can build your dashboard or profile here later.
        </Text>

        <Button colorPalette="teal" size="lg" width="100%" asChild><RouterLink to="/update-profile">Update Profile
                  </RouterLink></Button>

        <Button colorPalette="blue" size="lg" width="100%" asChild><RouterLink to="/create-post">Create a Post
                  </RouterLink></Button>
        <LogoutButton />
      </VStack>
    </Box>
    </Box>
    </Flex>
  );
        
}

export default Home;
