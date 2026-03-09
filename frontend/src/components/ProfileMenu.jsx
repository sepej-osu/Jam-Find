import { Avatar, Box, Menu, Portal } from '@chakra-ui/react';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { toaster } from './ui/toaster';

function ProfileMenu() {
  const { profile, currentUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);

  const handleMouseEnter = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 100);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toaster.create({ title: 'Successfully logged out!', status: 'success', duration: 3000 });
    } catch (err) {
      console.error(err);
      toaster.create({ title: 'Error logging out', description: err.message, status: 'error', duration: 5000 });
    }
  };

  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : '';

  return (
    <Box display="flex" justifyContent="flex-end" alignItems="flex-start" textAlign="center" pt={4} pb={2}>
      <Menu.Root
        open={open}
        onOpenChange={(details) => setOpen(details.open)}
        positioning={{ placement: "bottom-end" }}
      >
        <Menu.Trigger asChild>
          <Box
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            display="flex"
            justifyContent="flex-end"
            alignItems="center"
            gap={3}
            cursor="pointer"
            px={0}
            py={0}
            my={2}
            w="100%"
          >
            <Box textAlign="center" fontWeight="semibold" color="jam.text" display={{ base: 'none', md: 'block' }} fontSize="lg">
              {fullName}
            </Box>
            <Avatar.Root size="2xl" shape="rounded" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${currentUser?.uid}`); }}>
              <Avatar.Fallback name={fullName} />
              <Avatar.Image src={profile?.profilePicUrl} />
            </Avatar.Root>
          </Box>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <Menu.Content>
              <Menu.Item value="edit-profile" onClick={() => navigate('/update-profile')}>
                Edit Profile
              </Menu.Item>
              <Menu.Item value="logout" onClick={handleLogout} color="red.500">
                Logout
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </Box>
  );
}

export default ProfileMenu;
