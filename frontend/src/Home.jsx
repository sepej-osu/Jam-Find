
import { Box, Heading, Text, VStack, Button, Flex } from '@chakra-ui/react';
import { useAuth } from './contexts/AuthContext';
import { Link as RouterLink } from 'react-router-dom';
import LogoutButton from './components/LogoutButton';
import { useNavigate } from 'react-router-dom';


function Home() {
  const { user, profile, refreshProfile } = useAuth();

  return (

    <Flex>
      <Box flex="1" pt={12} >
    <Box
      maxW="600px"
      mx="auto"
      p={10}
      borderWidth="1px"
      borderRadius="lg"
      shadow="lg"
      bg="white"
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
