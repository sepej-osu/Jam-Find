import { Outlet } from 'react-router-dom';
import { Flex, Box } from '@chakra-ui/react';
import NavBar from './components/NavBar';

const Layout = () => {
    return (
        <div>
            <Flex>
                <NavBar />

            <Box as="main" flex="1" pl="220px" pt={12} pb={12} >
                    <Outlet />
            </Box>
            </Flex>
            <footer></footer>
        </div>
    );
};

export default Layout;