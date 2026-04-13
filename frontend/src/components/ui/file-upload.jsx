import { FileUpload as ChakraFileUpload, Button, IconButton } from '@chakra-ui/react';
import { LuUpload, LuX } from 'react-icons/lu';
import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from '../../firebase';

const TYPE_CONFIG = {
  'profile-image': { accept: 'image/*', label: 'image', storagePath: 'profile-picture', resizeWidth: 400, resizeHeight: 800, maxSize: 20 * 1024 * 1024, deleteOnReplace: true }, // 20 MB input cap, resized to max 400x800px
  'post-image': { accept: 'image/*', label: 'image', storagePath: 'post-images', maxSize: 20 * 1024 * 1024 }, // 20 MB input cap
  'music': { accept: 'audio/*', label: 'audio file', storagePath: 'music', maxSize: 10 * 1024 * 1024 }, // 10 MB input cap
};

// TODO: Add a toast for failed uploads with reasons why (file too large, wrong type, etc) and show upload progress for larger files. Possibly add previews for uploads before submitting as well.

const MIME_TO_EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/avif': 'avif',
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg',
  'audio/wav': 'wav', 'audio/webm': 'webm', 'audio/flac': 'flac',
  'audio/aac': 'aac', 'audio/x-m4a': 'm4a',
}; // Common MIME types to extensions mapping for safer extension derivation

// Returns the file extension for recognized MIME types, or null if unsupported.
function safeExt(file) {
  return MIME_TO_EXT[file.type] ?? null;
}

function pathFromDownloadUrl(url) {
  // Firebase download URLs encode the storage path after /o/
  return decodeURIComponent(new URL(url).pathname.split('/o/')[1]); // Returns a decoded path like users/uid/profile-picture/filename.jpg, suitable for use with Firebase Storage refs
}

// Resize an image to fit within maxWidth x maxHeight using the Canvas API, preserving aspect ratio.
// Always outputs JPEG regardless of input format — consistent compression, no transparency needed for profile pics.
function resizeImage(file, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(
        1,
        maxWidth ? maxWidth / img.width : 1,
        maxHeight ? maxHeight / img.height : 1,
      );
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

// Validates file size and MIME type against config. Returns the derived extension string if valid, or null.
function validateFile(file, config) {
  if (config.maxSize && file.size > config.maxSize) {
    console.error(`File exceeds the ${config.maxSize / (1024 * 1024)}MB size limit`);
    return null;
  }
  const ext = safeExt(file);
  if (!ext) {
    console.error(`Unsupported file type: ${file.type}`);
    return null;
  }
  return ext;
}

// Resizes (if configured), uploads to Firebase Storage, and returns { url, path }.
async function performUpload(uid, file, config) {
  let uploadBlob = file;
  let finalExt = safeExt(file);
  if (config.resizeWidth) {
    uploadBlob = await resizeImage(file, config.resizeWidth, config.resizeHeight);
    finalExt = 'jpg'; // resizeImage always outputs JPEG
  }
  const path = `users/${uid}/${config.storagePath}/${uuidv4()}.${finalExt}`;
  await uploadBytes(ref(storage, path), uploadBlob);
  const url = await getDownloadURL(ref(storage, path));
  return { url, path };
}

export const FileUpload = forwardRef(function FileUpload({ type, label, currentUrl, onUpload }, imperativeRef) {
  const config = TYPE_CONFIG[type];
  const [uploading, setUploading] = useState(false);
  // uploadedPath: set only after a successful upload in this session.
  // Cleared when the user removes the file or a new upload replaces it.
  const uploadedPath = useRef(null);
  // priorPath: parsed from currentUrl on first render (the server-side existing file).
  // Consumed (deleted + cleared) when a new upload replaces it.
  const priorPath = useRef(null);
  
  
  // pendingFile: stores a file selected before the user is authenticated (Only used during registration).
  // Call upload(uid) imperatively after auth is established to complete the upload.
  const pendingFileRef = useRef(null);

  // Defers the upload until after account creation. The File object is stored in pendingFileRef.
  // Call upload(uid) once the user is authenticated
  // Then performs the upload and calls onUpload(url) to notify the parent.
  useImperativeHandle(imperativeRef, () => ({
    upload: async (uid) => {
      if (!pendingFileRef.current || !config) return null;
      const file = pendingFileRef.current;
      if (!validateFile(file, config)) return null;
      setUploading(true);
      try {
        const { url, path } = await performUpload(uid, file, config);
        uploadedPath.current = path;
        pendingFileRef.current = null;
        onUpload?.(url);
        return url;
      } catch (err) {
        console.error('Deferred upload failed:', err);
        return null;
      } finally {
        setUploading(false);
      }
    }
  }));

  if (!config) {
    console.error(`Unsupported FileUpload type: ${type}`);
    return null;
  }

  // One-time initialization: parse the pre-existing file path from currentUrl on first render.
  if (currentUrl && priorPath.current === null && uploadedPath.current === null) {
    try {
      priorPath.current = pathFromDownloadUrl(currentUrl);
    } catch {
      // Ignore unparseable URLs
    }
  }

  // Handle file selection or removal
  const handleFileChange = async ({ acceptedFiles }) => {
    const file = acceptedFiles[0]; // Limit only to 1 file
    const user = auth.currentUser; // Get current user for permission checks and path construction
    if (!file) {
      // User removed the selected file.
      if (config.deleteOnReplace && uploadedPath.current) {
        if (user && uploadedPath.current.startsWith(`users/${user.uid}/`)) {
          try {
            await deleteObject(ref(storage, uploadedPath.current));
          } catch (err) {
            console.warn('Could not delete previous file:', err);
          }
        }
        uploadedPath.current = null;
      }
      onUpload?.(null); // Notify parent of file removal with null URL
      return;
    }

    // Validate file size and MIME type; reject early if invalid.
    if (!validateFile(file, config)) return;

    // If no user yet (e.g. during registration), store the file for deferred upload via upload(uid).
    if (!user) {
      pendingFileRef.current = file;
      return;
    }

    // Upload, but delete previous file first if it exists
    setUploading(true);
    try {
      // For types that replace a single file (e.g. profile picture), delete the previous one first.
      if (config.deleteOnReplace) {
        const pathToDelete = uploadedPath.current ?? priorPath.current;
        if (pathToDelete && pathToDelete.startsWith(`users/${user.uid}/`)) {
          try {
            await deleteObject(ref(storage, pathToDelete));
          } catch (err) {
            console.warn('Could not delete previous file:', err);
          }
        }
      }
      uploadedPath.current = null;
      priorPath.current = null;
      const { url, path } = await performUpload(user.uid, file, config);
      uploadedPath.current = path;
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
});

export default FileUpload;