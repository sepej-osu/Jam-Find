from unittest.mock import MagicMock, patch
import pytest
from routers.profiles import _mark_reviews_deleted, _delete_storage_files

# tests generated using Google Gemini AI

# test batch processing logic for marking reviews as deleted
@pytest.mark.parametrize(
    "doc_count, expected_commits",
    [
        (1, 1),
        (499, 1),
        (500, 1),
        (501, 2),
    ],
)
def test_batch_processing_boundaries(doc_count, expected_commits):
    mock_db = MagicMock()
    mock_batch = MagicMock()
    mock_db.batch.return_value = mock_batch

    fake_documents = [MagicMock() for _ in range(doc_count)]
    mock_db.collection.return_value.where.return_value.stream.return_value = fake_documents

    _mark_reviews_deleted(mock_db, "test_user_123")

    assert mock_batch.commit.call_count == expected_commits
    assert mock_batch.update.call_count == doc_count


# test storage deletion logic

@pytest.mark.parametrize(
"mock_filenames, expected_delete_count",
[
    ([], 0),                                             # Case 1: 0 files found -> 0 deleted
    (["avatar.jpg"], 1),                                 # Case 2: 1 file found -> 1 deleted
    (["track1.mp3", "track2.mp3", "banner.png"], 3),     # Case 3: 3 files found -> 3 deleted
],
)

@patch("routers.profiles.storage.bucket")
def test_storage_deletion_execution_and_payload(mock_bucket_func, mock_filenames, expected_delete_count):
    # 1. Arrange: Create a mock bucket instance
    mock_bucket_instance = MagicMock()
    mock_bucket_func.return_value = mock_bucket_instance
    
    # Create actual mock Blob objects using the filenames parameter
    fake_blobs = []
    for name in mock_filenames:
        mock_blob = MagicMock()
        mock_blob.name = f"users/target_user_123/{name}"
        fake_blobs.append(mock_blob)
        
    # Instruct list_blobs to return our list of fake files
    mock_bucket_instance.list_blobs.return_value = fake_blobs
    
    # 2. Act: Run the cleanup utility
    _delete_storage_files("target_user_123")
    
    # 3. Assert: VERIFY THE DELETION DATA
    if expected_delete_count > 0:
        # Verify that bucket.delete_blobs() was called with the EXACT list of files we found
        mock_bucket_instance.delete_blobs.assert_called_once_with(fake_blobs)
        
        # Verify the count matching our parameter
        assert len(mock_bucket_instance.delete_blobs.call_args[0][0]) == expected_delete_count
    else:
        # Verify that if 0 files were found, delete_blobs was NEVER called
        mock_bucket_instance.delete_blobs.assert_not_called()