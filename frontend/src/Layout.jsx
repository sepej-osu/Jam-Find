import { Outlet, NavLink } from 'react-router-dom';
import { Grid, GridItem, Box, Text, Separator } from '@chakra-ui/react';
import NavBar from './components/NavBar';
import ProfileMenu from './components/ProfileMenu';
import JamLogo from './assets/JamLogo.jsx';

// This layout component is used to wrap all pages in our app, so we can have
// a consistent navbar and footer across all pages without repeating code.
// Grid layout: NavBar spans the full height on the left, Header sits top-right,
// and the main content fills the remaining space below the header.

const Layout = () => {
    return (
        <Box minH="100vh" display="flex" justifyContent="center" alignItems="flex-start" bg="jam.bg">
            <Box w="100%" maxW="1200px" display="flex" flexDirection="column" minH="100vh">
                <Grid
                    templateRows="auto 1fr"
                    templateColumns="220px 1fr"
                    flex="1"
                    minH="100vh"
                >
                    <GridItem colSpan={2} h="105px" display="flex" justifyContent="space-between" alignItems="center" py={4}>
                        <NavLink to="/feed">
                            <JamLogo 
                                color="jam.950" 
                                w="250px" 
                                h="auto" 
                                mx="auto" 
                                display="block" 
                            />
                        </NavLink>
                        <ProfileMenu />
                    </GridItem>
                    <GridItem rowSpan={2} colSpan={1} h="100%">
                        <NavBar borderTopLeftRadius={45} />
                    </GridItem>
                    
                    <GridItem colSpan={1}>
                        <Box
                            as="main"
                            padding={5}
                            borderWidth="0px" 
                            borderTopRightRadius="45px"
                            bg="jam.700"
                        >
                            <Outlet />
                        </Box>
                    </GridItem>
                </Grid>
                <footer>
                    <Separator my={4} py={0} size="md" />
                    <Text textAlign="center" color="jam.text" pb={4}>
                        &copy; 2026 Jam-Find
                    </Text>
                </footer>
            </Box>
        </Box>
    );
};

export default Layout;