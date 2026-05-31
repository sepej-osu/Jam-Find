from unittest.mock import MagicMock, patch
import pytest
from google.cloud.firestore_v1.base_query import FieldFilter
from routers.profiles import _mark_reviews_deleted, _delete_storage_files, _delete_targeted_reviews

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


def test_delete_targeted_reviews_logic_with_mocks():
    """
    Verifies the logic for identifying and batch-deleting reviews.
    Uses mocks to ensure no real network calls are made.
    """
    # 1. SETUP: Mock the Firestore DB and its components
    mock_db = MagicMock()
    mock_batch = MagicMock()
    mock_db.batch.return_value = mock_batch
    
    # Mock the collection and query
    mock_query = MagicMock()
    mock_db.collection.return_value.where.return_value = mock_query
    
    # Create mock document snapshots to be "returned" by the stream
    mock_doc1 = MagicMock()
    mock_doc1.reference = "ref_to_doc_1"
    mock_doc2 = MagicMock()
    mock_doc2.reference = "ref_to_doc_2"
    
    mock_query.stream.return_value = [mock_doc1, mock_doc2]

    # 2. EXECUTE
    test_user_id = "test_user_999"
    _delete_targeted_reviews(mock_db, test_user_id)

    # 3. VERIFY
    # Ensure it queried the correct collection with the right filter
    mock_db.collection.assert_called_with("reviews")
    where_call = mock_db.collection().where.call_args
    assert where_call is not None
    filter_arg = where_call.kwargs.get("filter")
    assert isinstance(filter_arg, FieldFilter)
    assert filter_arg.field_path == "reviewedUserId"
    assert filter_arg.op_string == "=="
    assert filter_arg.value == test_user_id

    # Verify batch deletions were staged for the references returned
    mock_batch.delete.assert_any_call("ref_to_doc_1")
    mock_batch.delete.assert_any_call("ref_to_doc_2")
    
    # Verify the batch was committed
    mock_batch.commit.assert_called()