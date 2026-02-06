import { Button, useToast } from '@chakra-ui/react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

function LogoutButton() {

  const toast = useToast();
  const handleLogout = async () => {
    
    
    try {
      await signOut(auth);

        toast({
        title: 'Successfully logged out!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error(err);
      toast({
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
      colorScheme="red"
      variant="solid"
      size="md"
      onClick={handleLogout}
    >
      Logout
    </Button>
  );
}

export default LogoutButton;
