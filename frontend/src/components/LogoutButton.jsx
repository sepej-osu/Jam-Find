import { Button } from '@chakra-ui/react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { toaster } from './ui/toaster';

function LogoutButton() {


  const handleLogout = async () => {
    
    
    try {
      await signOut(auth);

        toaster.create({
        title: 'Successfully logged out!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error(err);
      toaster.create({
        title: 'Error logging out',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } 
  };

  return (
    <Button
      colorPalette="red"
      variant="solid"
      size="md"
      onClick={handleLogout}
    >Logout
          </Button>
  );
}

export default LogoutButton;
