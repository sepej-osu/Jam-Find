import { Box, Button, VStack, Image } from '@chakra-ui/react';
import { NavLink, useLocation } from 'react-router-dom';
import { FaCompass, FaCommentAlt, FaPlusCircle } from 'react-icons/fa';

const navButtonStyles = {
  variant: "solid",
  bg: "jam.800",
  color: "jam.50",
  w: "100%",
  fontSize: "larger",
  justifyContent: "flex-start",
  paddingLeft: "40px",
  rounded: "none",
  _hover: { bg: "jam.accent", color: "jam.bg" },
  _currentPage: { bg: "jam.accent", color: "jam.bg", fontWeight: "bold" },
};

function NavButton({ to, children }) {
  const { pathname } = useLocation();
  const isActive = pathname === to;
  return (
    <Button asChild aria-current={isActive ? "page" : undefined} {...navButtonStyles}>
      <NavLink to={to}>{children}</NavLink>
    </Button>
  );
}

function NavBar() {
  return (

    // The NavBar is a vertical sidebar on the left side of the screen. It contains 
    // the logo at the top and navigation buttons below it. The buttons use React 
    // Router's NavLink component to navigate to different pages without reloading the page. 
    // To add more pages, just add a NavButton with the appropriate "to" prop and icon.
 
    <Box pt={0} display="flex" flexDirection="column" h="100%">
      <Box
        as="nav"
        borderTopLeftRadius={45}
        overflow="hidden"
        flex="1"
        w="220px"
        py={5}
        bg="jam.800"
        color="jam.50"
      >
        <VStack>
          <NavButton to="/feed"><FaCompass /> Discover</NavButton>
          <NavButton to="/messages"><FaCommentAlt /> Messages</NavButton>
          <NavButton to="/create-post"><FaPlusCircle /> Create Post</NavButton>
        </VStack>
      </Box>
    </Box>
  );
}

export default NavBar;