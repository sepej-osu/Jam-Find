/**
 * Haversine formula — returns distance in miles between two lat/lng coordinates.
 * https://en.wikipedia.org/wiki/Haversine_formula
 */
export function getDistanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// This helps convert ISO date strings into "just now", "5m ago", "2h ago", etc. for timestamps
export function getRelativeTime(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  if (diffMins < 1) return 'just now';
  if (diffHours < 1) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ─── Music sample helpers ────────────────────────────────────────────────────
// Shared logic for adding/removing/renaming music samples across
// Register, CreateProfile, and UpdateProfile pages.

import { ACCEPTED_AUDIO_TYPES, checkAudioDuration, safeExt } from '../components/ui/file-upload';
import { toaster } from '../components/ui/toaster';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { v4 as uuidv4 } from 'uuid';

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10 MB

export function createMusicSampleHandlers(setMusicSamples, maxSamples, { onRemoveExisting } = {}) {
  // Handles selecting a new music file, validating it, and adding it to state.
  const handleMusicFileAdd = async (file, currentLength) => {
    if (!file) return;
    if (currentLength >= maxSamples) return; // Check if we've reached max samples
    if (file.size > MAX_AUDIO_SIZE) { // Validate file size
      toaster.create({ title: 'File too large', description: 'Maximum size is 10 MB.', type: 'error', closable: true });
      return;
    }
    // Validate file type against allowed audio MIME types
    const allowed = ACCEPTED_AUDIO_TYPES.split(',');
    if (!allowed.includes(file.type)) {
      toaster.create({ title: 'Unsupported file type', description: 'Please upload an audio file (MP3, etc.).', type: 'error', closable: true });
      return;
    }
    // Validate audio duration (max 10 minutes)
    const valid = await checkAudioDuration(file, 600); // 600 seconds = 10 minutes
    if (valid === null) {
      toaster.create({ title: 'Invalid audio file', description: 'This file could not be read as audio. Please upload a valid audio file.', type: 'error', closable: true });
      return;
    }
    if (valid === false) {
      return;
    }
    const defaultTitle = file.name.replace(/\.[^/.]+$/, ''); // Use filename without extension as default title
    const objectUrl = URL.createObjectURL(file) + `#${file.name}`; // Append filename as hash for easier identification when removing

     // Add new sample as pending until uploaded, with title and object URL for preview
     // This allows for playback in the UI before the file is actually uploaded, and for showing the title which can be edited by the user.
    setMusicSamples(prev => [...prev, { type: 'pending', file, title: defaultTitle, objectUrl }]);
  };
  // Changes the title of a music sample at a given index.
  const handleMusicSampleTitleChange = (index, value) => {
    setMusicSamples(prev => prev.map((s, i) => i === index ? { ...s, title: value } : s));
  };
  // Removes a music sample at a given index, revoking any object URLs and calling onRemoveExisting if it's an existing sample.
  const removeMusicSample = (index, samples) => {
    const sample = samples[index]; // Get the sample being removed to check if it's an existing one and to revoke object URL if needed

    // Call onRemoveExisting callback for existing samples to handle deletion from storage
    // This is to prevent orphaned files in storage when a user removes an existing sample from their profile.
    if (sample?.type === 'existing' && onRemoveExisting){
      onRemoveExisting(sample.url); 
    }
    // Revoke the object URL to free up memory when removing a pending sample
    // We check if the sample has an objectUrl (which only pending samples have) and revoke it to prevent memory leaks.
    // We also split off any hash we added for identification since revokeObjectURL only needs the base URL.
    if (sample?.objectUrl){ 
      URL.revokeObjectURL(sample.objectUrl.split('#')[0]);
    }
    setMusicSamples(prev => prev.filter((_, i) => i !== index)); // Remove the sample from state to update the UI
  };

  // Return the handlers for use in components
  return { handleMusicFileAdd, handleMusicSampleTitleChange, removeMusicSample };
}

// ─── Music sample upload helper ───────────────────────────────────────────────
// Uploads all pending music samples to Firebase Storage and returns the
// final array of { url, title } objects, preserving any existing samples.
// Used by Register, CreateProfile, and UpdateProfile.
export async function uploadMusicSamples(uid, musicSamples) {
  const uploaded = [];
  const uploadedPaths = []; // tracked so callers can clean up on API failure
  for (const sample of musicSamples) {
    if (sample.type === 'pending') {
      const ext = safeExt(sample.file);
      const path = `users/${uid}/music/${uuidv4()}.${ext}`;
      await uploadBytes(storageRef(storage, path), sample.file);
      const url = await getDownloadURL(storageRef(storage, path));
      uploaded.push({ url, title: sample.title });
      uploadedPaths.push(path);
    }
  }
  return {
    // Combine existing samples (type 'existing') with newly uploaded ones (type 'pending') into the final array of samples to send to the API.
    samples: [
      ...musicSamples.filter(s => s.type === 'existing').map(s => ({ url: s.url, title: s.title })),
      ...uploaded,
    ],
    uploadedPaths,
  };
}

// Deletes a list of Firebase Storage paths belonging to the given user.
// Used for cleanup when storage uploads succeed but the subsequent API call fails.
export async function deleteStoragePaths(uid, paths) {
  if (!uid || !paths?.length) return;
  for (const path of paths) {
    if (path?.startsWith(`users/${uid}/`)) {
      try {
        await deleteObject(storageRef(storage, path));
      } catch (err) {
        console.warn('Could not delete file during cleanup:', err);
      }
    }
  }
}

// Validates that all music samples have non-empty titles.
// Shows an error toast and returns false if any are missing; returns true if all are valid.
export function validateMusicSampleTitles(musicSamples) {
  if (musicSamples.some(s => !s.title.trim())) {
    toaster.create({ title: 'Missing title', description: 'Please add a title for each music sample.', type: 'error', closable: true });
    return false;
  }
  return true;
}

// Converts the selectedInstruments form object ({ Guitar: 3, Drums: 5 })
// into the array format expected by the API ([{ name, skillLevel }]).
export function instrumentsFromSelected(selectedInstruments) {
  return Object.entries(selectedInstruments).map(([name, skillLevel]) => ({ name, skillLevel }));
}

// ─── Storage path helper ─────────────────────────────────────────────────────
// Extracts the Firebase Storage object path from a download URL.
// Returns a decoded path like users/uid/profile-picture/filename.jpg.
// Firebase Storage URLs have the format https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
// So we're taking the part after /o/ and decoding any URL-encoded characters.
// Returns null when the value is empty, invalid, or not a Firebase Storage object URL.
export function pathFromStorageUrl(url) {
  if (typeof url !== 'string' || url.trim() === '') {
    return null;
  }
  try {
    const { pathname } = new URL(url);
    const encodedPath = pathname.split('/o/')[1];
    if (!encodedPath) {
      return null;
    }
    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
}
