import React from 'react';

export default function VendorModal({ vendorDetails, handleChange, handleSubmit, isEdit }) {
  return (
    <div className="modal modal-blur fade" id="vendorModal" tabIndex="-1" role="dialog" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{isEdit ? 'Edit Vendor' : 'Add Vendor'}</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            {/* Modal fields for vendor details */}
            <div className='row'>
              <div className='col-12 mb-3'>
                <label className='form-label required'>Company Name</label>
                <input className='form-control' name='companyName' value={vendorDetails.companyName} onChange={handleChange} />
              </div>
              <div className='col-6 mb-3'>
                <label className='form-label required'>Contact Person</label>
                <input className='form-control' name='contactPerson' value={vendorDetails.contactPerson} onChange={handleChange} />
              </div>
              <div className='col-6 mb-3'>
                <label className='form-label'>Position</label>
                <input className='form-control' name='contactPersonPosition' value={vendorDetails.contactPersonPosition} onChange={handleChange} />
              </div>
              <div className='col-12 mb-3'>
                <label className='form-label required'>Email</label>
                <input className='form-control' name='email' value={vendorDetails.email} onChange={handleChange} />
              </div>
              <div className='col-12 mb-3'>
                <label className='form-label required'>Phone</label>
                <input className='form-control' name='phone' value={vendorDetails.phone} onChange={handleChange} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn me-auto" data-bs-dismiss="modal">Close</button>
            <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={handleSubmit}>
              {isEdit ? 'Update Vendor' : 'Add Vendor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}