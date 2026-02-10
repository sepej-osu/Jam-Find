
import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import LogoutButton from './components/LogoutButton';
import { v4 as uuidv4 } from 'uuid';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from './firebase';

function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const user = auth.currentUser;

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };
    const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first!");
      return;
    }
    if (!user) {
      alert("You must be logged in to upload a profile picture.");
      return;
    }
    setUploading(true);
    try {
      // 1. Generate a unique ID for the filename
      const uniqueId = uuidv4();
      // 2. Get the original file extension
      const fileExtension = selectedFile.name.split('.').pop();
      if (!fileExtension) {
        alert("Could not determine file extension.");
        setUploading(false);
        return;
      }
      // 3. Create the obfuscated filename
      const obfuscatedFilename = `${uniqueId}.${fileExtension}`;
      // 4. Create a storage reference with the obfuscated filename
      // The path still includes the user.uid for security rules matching
      const profilePicRef = ref(storage, `users/${user.uid}/${obfuscatedFilename}`);
      // Upload the file
      await uploadBytes(profilePicRef, selectedFile);
      // Get the download URL
      const url = await getDownloadURL(profilePicRef);
      setProfileImageUrl(url);
      alert("Profile picture uploaded successfully!");
      // Important: You would typically save this `url` and `obfuscatedFilename`
      // to the user's document in Firestore (or another database)
      // so you can retrieve and display it later.
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      alert("Failed to upload profile picture.");
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }

  };
  return (
    <Box
      maxW="600px"
      mx="auto"
      mt="80px"
      p="40px"
      borderWidth="1px"
      borderRadius="lg"
      boxShadow="md"
      bg="white"
    >
      <VStack spacing={4} textAlign="center">
        <Heading size="lg">You’re logged in!</Heading>

        <Text fontSize="md" color="gray.600">
          This is your placeholder page.  
          You can build your dashboard or profile here later.
        </Text>

        <LogoutButton   />

        <div>
          <h1>User Profile</h1>
          {user ? (
            <>
              {profileImageUrl && (
                <div>
                  <img src={profileImageUrl} alt="Profile" style={{ width: 100, height: 100, borderRadius: '50%' }} />
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleFileChange} />
              <button onClick={handleUpload} disabled={!selectedFile || uploading}>
                {uploading ? "Uploading..." : "Upload Profile Picture"}
              </button>
            </>
          ) : (
            <p>Please log in to manage your profile.</p>
          )}
        </div>

      </VStack>
    </Box>
  );
}

export default Home;
