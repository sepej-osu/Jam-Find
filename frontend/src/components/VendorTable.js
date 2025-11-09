import React from 'react';

export default function VendorTable({ vendors, onEdit, onDelete }) {
  return (
    <table className='table card-table table-vcenter text-nowrap datatable'>
      <thead>
        <tr>
          <th>Company Name</th>
          <th>Contact Person</th>
          <th>Email</th>
          <th>Phone</th>
          <th className="w-1">Actions</th>                
        </tr>
      </thead>
      <tbody>
        {vendors.map((vendor) => (
          <tr key={vendor.id}>
            <td className='text-reset'>{vendor.companyName}</td>
            <td data-label="Title">
              <div>{vendor.contactPerson}</div>
              <div className="text-secondary" data-label="Role">{vendor.contactPersonPosition}</div>
            </td>
            <td>{vendor.email}</td>
            <td>{vendor.phone}</td>
            <td>
              <div className="btn-list flex-nowrap">
                <button className="btn ms-auto" onClick={() => onEdit(vendor)} data-bs-toggle="modal" data-bs-target="#vendorModal">
                  Edit
                </button>
                <div className="dropdown">
                  <button className="btn dropdown-toggle align-text-top" data-bs-toggle="dropdown">
                    Actions
                  </button>
                  <div className="dropdown-menu dropdown-menu-end">
                    <button className="dropdown-item" onClick={() => onDelete(vendor.id)} data-bs-toggle="modal" data-bs-target="#confirmModal">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
