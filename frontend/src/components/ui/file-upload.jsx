import { FileUpload as ChakraFileUpload, Button, IconButton } from '@chakra-ui/react';
import { LuUpload, LuX } from 'react-icons/lu';
import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from '../../firebase';

const TYPE_CONFIG = {
  'profile-image': { accept: 'image/*', label: 'image', storagePath: 'profile-picture', resizeWidth: 400, maxSize: 20 * 1024 * 1024 }, // 20 MB input cap, resized to max width of 400px
  'post-image': { accept: 'image/*', label: 'image', storagePath: 'post-images', maxSize: 20 * 1024 * 1024 }, // 20 MB input cap
  'music': { accept: 'audio/*', label: 'audio file', storagePath: 'music', maxSize: 10 * 1024 * 1024 }, // 10 MB input cap
};

// TODO: Add a toast for failed uploads with reasons why (file too large, wrong type, etc) and show upload progress for larger files. Possibly add previews for uploads before submitting as well.

function pathFromDownloadUrl(url) {
  // Firebase download URLs encode the storage path after /o/
  return decodeURIComponent(new URL(url).pathname.split('/o/')[1]); // This will give us something like 'users%2Fuid%2Fprofile-picture%2Ffilename.jpg, which we can use to delete the file later
}

// Resize an image file to maxWidth using the Canvas API.
// Always outputs JPEG regardless of input format — consistent compression, no transparency needed for profile pics.
function resizeImage(file, maxWidth) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', 0.95);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
    img.src = objectUrl;
  });
}

export function FileUpload({ type, label, currentUrl, onUpload }) {
  const [uploading, setUploading] = useState(false);
  const config = TYPE_CONFIG[type];

  // Track the storage path of the current file. Prefer the exact path we uploaded
  // (most reliable) and fall back to parsing currentUrl on first render.
  const storagePath = useRef(null);
  if (currentUrl && storagePath.current === null) {
    try {
      storagePath.current = pathFromDownloadUrl(currentUrl);
    } catch {
      // Ignore unparseable URLs
    }
  }

  const handleFileChange = async ({ acceptedFiles }) => {
    const file = acceptedFiles[0]; // Limit only to 1 file
    if (!file) return;

    if (config.maxSize && file.size > config.maxSize) {
      const limitMB = config.maxSize / (1024 * 1024);
      console.error(`File exceeds the ${limitMB}MB size limit`);
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setUploading(true);
    try {
      if (storagePath.current) {
        try {
          await deleteObject(ref(storage, storagePath.current)); // Delete previous file if it exists
        } catch (err) {
          console.warn('Could not delete previous file:', err);
        }
      }
      let uploadBlob = file;
      let ext = file.name.split('.').pop();
      if (config.resizeWidth) {
        uploadBlob = await resizeImage(file, config.resizeWidth);
        ext = 'jpg'; // resizeImage always outputs JPEG
      }
      const filename = `${uuidv4()}.${ext}`;
      const newPath = `users/${user.uid}/${config.storagePath}/${filename}`;
      await uploadBytes(ref(storage, newPath), uploadBlob);
      const url = await getDownloadURL(ref(storage, newPath));
      storagePath.current = newPath;
      onUpload?.(url);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ChakraFileUpload.Root
      maxFiles={1}
      accept={config.accept}
      onFileChange={handleFileChange}
    >
      <ChakraFileUpload.HiddenInput />
      {label && <ChakraFileUpload.Label>{label}</ChakraFileUpload.Label>}
      <ChakraFileUpload.Trigger asChild>
        <Button variant="outline" loading={uploading}>
          <LuUpload /> Upload {config.label}
        </Button>
      </ChakraFileUpload.Trigger>
      <ChakraFileUpload.ItemGroup>
        <ChakraFileUpload.Context>
          {({ acceptedFiles }) =>
            acceptedFiles.map(file => (
              <ChakraFileUpload.Item key={file.name} file={file}>
                <ChakraFileUpload.ItemPreview />
                <ChakraFileUpload.ItemName />
                <ChakraFileUpload.ItemDeleteTrigger asChild>
                  <IconButton variant="ghost" size="xs" aria-label="Remove file">
                    <LuX />
                  </IconButton>
                </ChakraFileUpload.ItemDeleteTrigger>
              </ChakraFileUpload.Item>
            ))
          }
        </ChakraFileUpload.Context>
      </ChakraFileUpload.ItemGroup>
    </ChakraFileUpload.Root>
  );
}

export default FileUpload;