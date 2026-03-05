import { Outlet } from 'react-router-dom';
import { Flex, Box, Text } from '@chakra-ui/react';
import NavBar from './components/NavBar';

// This layout component is used to wrap all pages in our app, so we can have
// a consistent navbar and footer across all pages without repeating code.
// The main component is set to 100% height of the viewport, so the footer will 
// always be at the bottom of the page even if there isn't much content.

const Layout = () => {
    return (
        <div>
            <Flex>
                <NavBar />

            <Box as="main" flex="1" pl ={12} pr={12} pt={12} pb={12} minH="100vh">
                    <Outlet />
            </Box>
            </Flex>
            <footer>
                <Text textAlign="center"  color="gray.500">
                    &copy; 2026 Jam-Find.
                </Text>
            </footer>
        </div>
    );
};

export default Layout;