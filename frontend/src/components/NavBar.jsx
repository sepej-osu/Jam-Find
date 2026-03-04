import { Box, Button, VStack, Image } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import logo from '../assets/jamfind logo.svg';
import { FaBinoculars, FaEnvelope, FaPlusCircle } from 'react-icons/fa';


function NavBar() {
  return (

    // The NavBar is a vertical sidebar on the left side of the screen. It contains 
    // the logo at the top and navigation buttons below it. The buttons use React 
    // Router's Link component to navigate to different pages without reloading the page. 
    // To add more pages, just add Button components with the appropriate "to" prop and icon.
 
    <Box>
      <Box mb={6} position="relative" top={30} left={0} w="220px" px={2.5} py={5} bg="white">
        <Image src={logo} alt="Jam-Find" top={10} w="250px" mx="auto" />
      </Box>
      <Box
        position="relative"
        as="nav"
        borderTopRadius={45}
        overflow="hidden"
        left={0}
        top={10}
        minHeight="100%"
        w="220px"
        py={10}
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
            fontSize="larger"
            _hover={{ bg: 'cyan.700' }}
          
          >
            <FaBinoculars /> Discover
          </Button>
          <Button
            as={RouterLink}
            to="/messages"
            variant="solid"
            bg={'cyan.800'}
            w="100%"
            textAlign="center"
            fontSize="larger"
            _hover={{ bg: 'cyan.700' }}
          >
            <FaEnvelope /> Messages
          </Button>
          <Button
            as={RouterLink}
            to="/create-post"
            variant="solid"
            bg={'cyan.800'}
            w="100%"
            textAlign="center"
            fontSize="larger"
            _hover={{ bg: 'cyan.700' }}
          >
            <FaPlusCircle /> Create Post
          </Button>
        </VStack>
      </Box>
    </Box>
  );
}

export default NavBar;