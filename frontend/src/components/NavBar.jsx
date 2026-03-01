import { Box, Button, VStack, Image } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import logo from '../assets/jamfind logo.svg';


function NavBar() {
  return (
    <Box>
    <Box mb={6} position="sticky" top={0} left={50} px={2.5} py={5}>
    <Image src={logo} alt="Jam-Find" top={10} w="250px" mx="auto"/>
    </Box>
    <Box
      as="nav"
      position="fixed"
      borderTopRadius='15px'
      left={0}
      top={125}
      h="100vh"
      w="220px"
      py={5}
      bg="cyan.800"
      color="fg.muted"
      boxShadow="lg"
    >
      <VStack align="stretch" spacing={3}>
        <Button
          as={RouterLink}
          to="/home"
          variant="solid"
          bg={'cyan.800'}
          w="100%"
          textAlign="center"
          fontSize='larger'
          _hover={{ bg: 'cyan.700' }}
        >
          Discover
        </Button>
        <Button
          as={RouterLink}
          to="/messages"
          variant="solid"
          bg={'cyan.800'}
          w="100%"
          textAlign="center"
          fontSize='larger'
          _hover={{ bg: 'cyan.700' }}

        >
          Messages
        </Button>
        <Button
          as={RouterLink}
          to="/create-post"
          variant="solid"
          bg={'cyan.800'}
          w="100%"
          textAlign="center"
          fontSize='larger'
          _hover={{ bg: 'cyan.700' }}
        >
          Create Post
        </Button>
      </VStack>
    </Box>
    </Box>
  );
}

export default NavBar;