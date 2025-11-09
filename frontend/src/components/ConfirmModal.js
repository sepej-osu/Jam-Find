import React from 'react';

export default function ConfirmModal({ vendorId, onDeleteConfirm }) {
  return (
    <div className="modal modal-blur fade" id="confirmModal" tabIndex="-1" role="dialog" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Confirm Deletion</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p>Are you sure you want to delete this vendor?</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn me-auto" data-bs-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-danger" data-bs-dismiss="modal" onClick={() => onDeleteConfirm(vendorId)}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
