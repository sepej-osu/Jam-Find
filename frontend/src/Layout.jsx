import { Outlet } from 'react-router-dom';
import {Flex, Text } from "@chakra-ui/react"  
import NavBar from './components/NavBar';

const Layout = () => {
    return (
        <>
        <div>
            <header>
                <Flex align={"center"}>

                
                    <NavBar />
                </Flex>
            </header>
            <main>
                <Outlet />
            </main>
            <footer>
            </footer>
        </div>
        </>
    );
}

export default Layout;