import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Grid, GridItem, Box, Text, Separator } from '@chakra-ui/react';
import NavBar from './components/NavBar';
import ProfileMenu from './components/ProfileMenu';
import JamLogo from './assets/JamLogo.jsx';

// This layout component is used to wrap all pages in our app, so we can have
// a consistent navbar and footer across all pages without repeating code.
// Grid layout: NavBar spans the full height on the left, Header sits top-right,
// and the main content fills the remaining space below the header.
// Login uses a simplified single-column layout without the sidebar.

const Layout = () => {
    const location = useLocation();
    const isLogin = location.pathname === '/login';
    const isRegister = location.pathname === '/register';

    return (
        <Box minH="100vh" display="flex" justifyContent="center" alignItems="flex-start" bg="jam.bg">
            <Box w="100%" maxW="1200px" display="flex" flexDirection="column" minH="100vh">
                {isLogin || isRegister ? (
                    <Grid
                        templateRows="auto 1fr auto"
                        templateColumns="1fr"
                        flex="1"
                    >
                        <GridItem colSpan={1} h="105px" display="flex" justifyContent="center" alignItems="center" py={4}>
                            <NavLink to="/login">
                                <JamLogo
                                    color="jam.950"
                                    w="250px"
                                    h="auto"
                                    mx="auto"
                                    display="block"
                                />
                            </NavLink>
                        </GridItem>

                        <GridItem colSpan={1}>
                            <Box
                                as="main"
                                padding={5}
                                paddingTop={50}
                                borderWidth="0px"
                                borderTopLeftRadius="45px"
                                borderTopRightRadius="45px"
                                bg="jam.700"
                                h="100%"
                            >
                                <Outlet />
                            </Box>
                        </GridItem>

                        <GridItem colSpan={1} bg="jam.700">
                            <Text textAlign="center" color="jam.50" pb={4}>
                                &copy; 2026 Jam-Find
                            </Text>
                        </GridItem>
                    </Grid>
                ) : (
                    <Grid
                        templateRows="auto 1fr auto"
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
                                h="100%"
                                borderWidth="0px" 
                                borderTopRightRadius="45px"
                                bg="jam.700"
                            >
                                <Outlet />
                            </Box>
                        </GridItem>

                        <GridItem colSpan={1} bg="jam.700" h="100%">
                            <footer>
                                <Text textAlign="center" color="jam.50" pb={4}>
                                    &copy; 2026 Jam-Find
                                </Text>
                            </footer>
                        </GridItem>
                        <GridItem colSpan={1} bg="jam.800">
                        </GridItem>
                    </Grid>
                )}
            </Box>
        </Box>
    );
};

export default Layout;