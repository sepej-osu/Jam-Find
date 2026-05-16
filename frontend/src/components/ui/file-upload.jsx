import { FileUpload as ChakraFileUpload, useFileUpload, Button, IconButton, Float } from '@chakra-ui/react';
import { LuUpload, LuX, LuInfo } from 'react-icons/lu';
import { Tooltip } from './tooltip';
import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from '../../firebase';
import { toaster } from './toaster';
import { pathFromStorageUrl } from '../../utils/helpers';

// Record format (MIME type → extensions[]) is required by Chakra UI v3's useFileUpload / ChakraFileUpload.Root.
// Browsers (especially on Linux/Chrome) ignore bare MIME types in the file picker and need the extensions too.
// Zag.js builds the <input accept> attribute by concatenating both the keys and the extension arrays.
const ACCEPTED_IMAGE_RECORD = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif'],
};
export const ACCEPTED_AUDIO_RECORD = {
  'audio/mpeg': ['.mp3'],
  'audio/mp4': ['.mp4', '.m4a'],
  'audio/ogg': ['.ogg'],
  'audio/wav': ['.wav'],
  'audio/webm': ['.webm'],
  'audio/aac': ['.aac'],
  'audio/x-m4a': ['.m4a'],
  'audio/flac': ['.flac'],
};

// Comma-separated MIME type strings derived from the Records above.
// Used for JS MIME validation in helpers.js where the Record format isn't needed.
export const ACCEPTED_AUDIO_TYPES = Object.keys(ACCEPTED_AUDIO_RECORD).join(',');

const TYPE_CONFIG = {
  'profile-image': { acceptRecord: ACCEPTED_IMAGE_RECORD, label: 'image', storagePath: 'profile-picture', resizeWidth: 400, resizeHeight: 800, minWidth: 400, minHeight: 400, maxSize: 20 * 1024 * 1024, deleteOnReplace: true }, // 20 MB input cap, resized to max 400x800px
  'post-image': { acceptRecord: ACCEPTED_IMAGE_RECORD, label: 'image', storagePath: 'post-images', minWidth: 400, minHeight: 400, maxSize: 5 * 1024 * 1024, resizeQuality: 0.95, thumbnailWidth: 150, thumbnailHeight: 110, thumbnailQuality: 0.80, deleteOnReplace: true }, // 5 MB cap
  'post-song': { acceptRecord: ACCEPTED_AUDIO_RECORD, label: 'audio file', storagePath: 'post-songs', maxSize: 10 * 1024 * 1024, maxDurationSeconds: 600 }, // 10 MB input cap, 10-minute duration limit
  'music': { acceptRecord: ACCEPTED_AUDIO_RECORD, label: 'audio file', storagePath: 'music', maxSize: 10 * 1024 * 1024, maxDurationSeconds: 600 }, // 10 MB input cap, 10-minute duration limit
};

// Generates user-friendly tooltip content based on the TYPE_CONFIG
function getTooltipContent(config) {
  const parts = [];
  parts.push(config.label === 'image' ? 'Images only' : 'Audio files only');
  if (config.minWidth && config.minHeight) parts.push(`Min ${config.minWidth}×${config.minHeight}px`);
  if (config.maxDurationSeconds) parts.push(`Max ${config.maxDurationSeconds / 60} min`);
  if (config.maxSize) parts.push(`Max ${config.maxSize / (1024 * 1024)} MB`);
  return parts.join(' · ');
}

export const MUSIC_TOOLTIP_CONTENT = getTooltipContent(TYPE_CONFIG.music);
export const POST_IMAGE_TOOLTIP_CONTENT = getTooltipContent(TYPE_CONFIG['post-image']);

// Checks that an audio file does not exceed the maximum duration (in seconds).
// Returns a Promise resolving to true if valid, false otherwise (with a toast shown).
export function checkAudioDuration(file, maxSeconds) {
  return new Promise(resolve => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file);
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      if (audio.duration > maxSeconds) {
        const maxMin = Math.floor(maxSeconds / 60);
        toaster.create({ title: 'Audio too long', description: `Maximum duration is ${maxMin} minutes.`, type: 'error', closable: true });
        resolve(false);
      } else {
        resolve(true);
      }
    };
    audio.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null); }; // null = unreadable/invalid file
    audio.src = objectUrl;
  });
}

// Returns the canonical file extension (without dot) for a file's MIME type by looking it up
// in the accepted Records. Always takes the first listed extension.
export function safeExt(file) {
  const exts = { ...ACCEPTED_IMAGE_RECORD, ...ACCEPTED_AUDIO_RECORD }[file.type];
  return exts?.[0]?.slice(1) ?? null;
}

// Resize an image to fit within maxWidth x maxHeight using the Canvas API, preserving aspect ratio.
// Always outputs JPEG
function resizeImage(file, maxWidth, maxHeight, quality = 0.95) {
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
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
    img.src = objectUrl;
  });
}

// Validates MIME type against config. Returns the file extension string if valid, or null.
function validateFile(file, config) {
  const allowedTypes = Object.keys(config.acceptRecord);
  if (!allowedTypes.includes(file.type)) {
    toaster.create({ title: 'Wrong file type', description: `${file.type || 'Unknown type'} is not allowed here. Please upload a ${config.label}.`, type: 'error', closable: true });
    return null;
  }
  const ext = safeExt(file);
  if (!ext) {
    toaster.create({ title: 'Unsupported file type', description: `${file.type || 'Unknown type'} is not allowed.`, type: 'error', closable: true });
    return null;
  }
  return ext;
}

// Checks that an image file meets the minimum pixel dimensions specified in config.
// Returns a Promise resolving to true if valid, false otherwise (with a toast shown).
function checkImageDimensions(file, config) {
  if (!config.minWidth && !config.minHeight) return Promise.resolve(true);
  return new Promise(resolve => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (img.width < config.minWidth || img.height < config.minHeight) {
        toaster.create({ title: 'Image too small', description: `Minimum size is ${config.minWidth}×${config.minHeight}px. Yours is ${img.width}×${img.height}px.`, type: 'error', closable: true });
        resolve(false);
      } else {
        resolve(true);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(false); };
    img.src = objectUrl;
  });
}

// Resizes (if configured), uploads to Firebase Storage, and returns { url, path, thumbUrl, thumbPath }.
async function performUpload(uid, file, config) {
  let uploadBlob = file;
  let finalExt = safeExt(file);
  if (config.resizeWidth) {
    uploadBlob = await resizeImage(file, config.resizeWidth, config.resizeHeight, config.resizeQuality);
    finalExt = 'jpg'; // resizeImage always outputs JPEG
  }
  const uuid = uuidv4();
  const path = `users/${uid}/${config.storagePath}/${uuid}.${finalExt}`;
  await uploadBytes(ref(storage, path), uploadBlob);
  const url = await getDownloadURL(ref(storage, path));

  // If thumbnail config is present, generate and upload the thumbnail as well.
  let thumbUrl = null, thumbPath = null;
  if (config.thumbnailWidth) {
    const thumbBlob = await resizeImage(file, config.thumbnailWidth, config.thumbnailHeight, config.thumbnailQuality);
    thumbPath = `users/${uid}/${config.storagePath}/${uuid}_thumb.jpg`;
    await uploadBytes(ref(storage, thumbPath), thumbBlob);
    thumbUrl = await getDownloadURL(ref(storage, thumbPath));
  }

  return { url, path, thumbUrl, thumbPath };
}

// Inner component — keyed by rejectionKey so the useFileUpload hook fully remounts on rejection,
// which resets acceptedFiles and allows the same invalid file to be re-selected.
function FileUploadRoot({ config, label, uploading, onFileChange, onFileReject }) {
  const fileUpload = useFileUpload({
    maxFiles: 1,
    accept: config.acceptRecord,
    onFileChange,
    onFileReject,
  });

  return (
    <ChakraFileUpload.RootProvider value={fileUpload}>
      <ChakraFileUpload.HiddenInput />
      {label && (
        <ChakraFileUpload.Label display="flex" alignItems="center" gap="1">
          {label}
          <Tooltip content={getTooltipContent(config)}>
            <IconButton variant="ghost" size="2xs" aria-label="File requirements">
              <LuInfo />
            </IconButton>
          </Tooltip>
        </ChakraFileUpload.Label>
      )}
      <ChakraFileUpload.Trigger asChild>
        <Button type="button" variant="outline" loading={uploading}>
          <LuUpload /> Upload {config.label}
        </Button>
      </ChakraFileUpload.Trigger>
      {/* Images use chakra thumbnail list; audio uses a filename list */}
      <ChakraFileUpload.ItemGroup>
        {fileUpload.acceptedFiles.map(file => (
          config.label === 'audio file' ? (
            <ChakraFileUpload.Item key={file.name} file={file}>
              <ChakraFileUpload.ItemPreview />
              <ChakraFileUpload.ItemName />
              <ChakraFileUpload.ItemDeleteTrigger asChild>
                <IconButton variant="ghost" size="xs" aria-label="Remove file">
                  <LuX />
                </IconButton>
              </ChakraFileUpload.ItemDeleteTrigger>
            </ChakraFileUpload.Item>
          ) : (
            <ChakraFileUpload.Item key={file.name} file={file} w="auto" boxSize="40" p="2">
              <ChakraFileUpload.ItemPreviewImage width="100%" height="100%" objectFit="cover" />
              <Float placement="top-end">
                <ChakraFileUpload.ItemDeleteTrigger boxSize="4" layerStyle="fill.solid">
                  <LuX />
                </ChakraFileUpload.ItemDeleteTrigger>
              </Float>
            </ChakraFileUpload.Item>
          )
        ))}
      </ChakraFileUpload.ItemGroup>
    </ChakraFileUpload.RootProvider>
  );
}

export const FileUpload = forwardRef(function FileUpload({ type, label, currentUrl, onUpload, onFileSelect, onUploadStart, onUploadEnd, deferred = false }, imperativeRef) {
  const config = TYPE_CONFIG[type];
  const [uploading, setUploading] = useState(false);
  // This rejectionKey is used to trigger the file rejection toast multiple times.
  // For example, if you upload an image that doesn't meet requirements twice in a row.
  const [rejectionKey, setRejectionKey] = useState(0);
  // uploadedPath: set only after a successful upload in this session.
  // Cleared when the user removes the file or a new upload replaces it.
  const uploadedPath = useRef(null);
  // priorPath: parsed from currentUrl on first render (the server-side existing file).
  // Consumed (deleted + cleared) when a new upload replaces it.
  const priorPath = useRef(null);
  
  
  // pendingFile: stores a file selected before the user is authenticated (Only used during registration).
  // Call upload(uid) imperatively after auth is established to complete the upload.
  const pendingFileRef = useRef(null);

  // Defers the upload
  // The File object is stored in pendingFileRef.
  // Call upload(uid) once the user is authenticated or the form is submitted.
  // Then performs the upload and calls onUpload(url) to notify the parent.
  useImperativeHandle(imperativeRef, () => ({
    upload: async (uid) => {
      if (!pendingFileRef.current || !config) return null;
      const file = pendingFileRef.current;
      if (!validateFile(file, config)) { setRejectionKey(k => k + 1); return null; }
      if (!await checkImageDimensions(file, config)) { setRejectionKey(k => k + 1); return null; }
      if (config.maxDurationSeconds && !await checkAudioDuration(file, config.maxDurationSeconds)) { setRejectionKey(k => k + 1); return null; }
      setUploading(true);
      try {
        const { url, path, thumbUrl } = await performUpload(uid, file, config);
        uploadedPath.current = path;
        pendingFileRef.current = null;
        onUpload?.(url, thumbUrl);
        toaster.create({ title: 'Upload successful!', type: 'success', closable: true });
        return url;
      } catch (err) {
        console.error('Deferred upload failed:', err);
        toaster.create({ title: 'Upload failed', description: 'Something went wrong. Please try again.', type: 'error', closable: true });
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
      priorPath.current = pathFromStorageUrl(currentUrl);
    } catch {
      // Ignore unparseable URLs
    }
  }

  // Handle file selection, removal, and Zag-level rejections (wrong type / too large).
  const handleFileChange = async ({ acceptedFiles }) => {
    const file = acceptedFiles[0]; // Limit only to 1 file
    const user = auth.currentUser; // Get current user for permission checks and path construction
    if (!file) {
      // User removed the selected file.
      if (deferred) {
        // In deferred mode, no storage ops — just clear the pending file.
        pendingFileRef.current = null;
        onFileSelect?.(null);
        return;
      }
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
    if (config.maxSize && file.size > config.maxSize) {
      toaster.create({ title: 'File too large', description: `Maximum size is ${config.maxSize / (1024 * 1024)} MB.`, type: 'error', closable: true });
      setRejectionKey(k => k + 1);
      return;
    }
    if (!validateFile(file, config)) { setRejectionKey(k => k + 1); return; }
    if (!await checkImageDimensions(file, config)) { setRejectionKey(k => k + 1); return; }
    if (config.maxDurationSeconds && !await checkAudioDuration(file, config.maxDurationSeconds)) { setRejectionKey(k => k + 1); return; }

    // If no user yet (e.g. during registration) or deferred mode, store the file for later upload via upload(uid).
    if (!user || deferred) {
      pendingFileRef.current = file;
      if (deferred) onFileSelect?.(file);
      return;
    }

    // Capture the path to delete before upload so the ref can't change underneath us.
    // Upload new file -> get download URL -> delete old file (if configured)
    //  -> update state with new URL -> call onUpload with new URL
    setUploading(true); // Disable the input and show loading state during upload
    onUploadStart?.(); // Notify parent that upload has started (to disable form submission)
    try {
      const pathToDelete = config.deleteOnReplace ? (uploadedPath.current ?? priorPath.current) : null;
      const { url, path, thumbUrl } = await performUpload(user.uid, file, config);
      // Upload succeeded, now delete old file if needed
      if (pathToDelete && pathToDelete !== path && pathToDelete.startsWith(`users/${user.uid}/`)) {
        try {
          await deleteObject(ref(storage, pathToDelete));
        } catch (err) {
          console.warn('Could not delete previous file:', err);
        }
      }
      uploadedPath.current = path;
      priorPath.current = null;
      onUpload?.(url, thumbUrl);
      toaster.create({ title: 'Upload successful!', type: 'success', closable: true });
    } catch (err) {
      console.error('Upload failed:', err);
      toaster.create({ title: 'Upload failed', description: 'Something went wrong. Please try again.', type: 'error', closable: true });
    } finally {
      setUploading(false); // Re-enable the input
      onUploadEnd?.(); // Notify parent that upload has ended (to re-enable form submission)
    }
  };

  // Show a generic rejection toast for cases where Zag's internal validation rejects the file before it reaches handleFileChange.
  const handleFileReject = () => {
    toaster.create({ title: 'Unsupported file type', description: `Please upload a ${config.label}.`, type: 'error', closable: true });
    setRejectionKey(k => k + 1);
  };

  return (
    <FileUploadRoot
      key={rejectionKey}
      config={config}
      label={label}
      uploading={uploading}
      onFileChange={handleFileChange}
      onFileReject={handleFileReject}
    />
  );
});

export default FileUpload;