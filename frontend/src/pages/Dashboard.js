import React, { useState, useEffect } from 'react';
import VendorTable from '../components/VendorTable';
import VendorModal from '../components/VendorModal';
import ConfirmModal from '../components/ConfirmModal';

export default function Dashboard() {
  const [vendors, setVendors] = useState([]);
  const [vendorDetails, setVendorDetails] = useState({
    companyName: '',
    contactPerson: '',
    contactPersonPosition: '',
    email: '',
    phone: ''
  });
  const [isEdit, setIsEdit] = useState(false);
  const [currentVendorId, setCurrentVendorId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch vendors on load
  useEffect(() => {
    fetchVendors();
  }, []);


  //Hiding error or message after few seconds
  useEffect(() => {
    if (message || error) {
      // Set a timer to clear the message and error after 5 seconds
      const timer = setTimeout(() => {
        setMessage(''); // Clear the message
        setError('');   // Clear the error
      }, 3000); // 5000 milliseconds = 5 seconds
  
      // Cleanup function to clear the timer if the component unmounts
      return () => clearTimeout(timer);
    }
  }, [message, error]); // Dependency array includes both message and error

  //Get vendors table
  const fetchVendors = async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_BACKEND_API_URL;
      // const response = await fetch('http://localhost:8000/vendors/all-vendors');
      const response = await fetch(`${API_BASE_URL}/vendors/all-vendors`);
      const data = await response.json(); // Ensure response is parsed as JSON
      
      if (Array.isArray(data)) {
        setVendors(data); // Only set if data is an array
      } else {
        setVendors([]); // If the data is not an array, fallback to empty array
      }
    } catch (error) {
      console.error("Error fetching vendors: ", error);
      setVendors([]); // Set an empty array on error
    }
  };
  
  //Set details fo vendor to edit
  const handleEdit = (vendor) => {
    setVendorDetails(vendor);
    setCurrentVendorId(vendor.id);
    setIsEdit(true);
  };

  //Set details of vendor to delete
  const handleDelete = (vendorId) => {
    setCurrentVendorId(vendorId);
  };

  //Update input values when adding a new vendor
  const handleChange = (e) => {
    const { name, value } = e.target;
    setVendorDetails((prevDetails) => ({
      ...prevDetails,
      [name]: value,
    }));
  };

  // Function to handle when "Add Vendor" button is clicked
  const handleAddNew = () => {
    // Reset the form values when adding a new vendor
    setVendorDetails({
      companyName: '',
      contactPerson: '',
      contactPersonPosition: '',
      email: '',
      phone: ''
    });
    setIsEdit(false); // Make sure it's not in edit mode
  };

  // Function to edit or create new vendor based no isEdit
  const handleSubmit = async () => {
    const method = isEdit ? 'PUT' : 'POST';
    const API_BASE_URL = process.env.REACT_APP_BACKEND_API_URL;
    //const url = isEdit ? `http://localhost:8000/vendors/update-vendor/${currentVendorId}` : 'http://localhost:8000/vendors/add-vendor';
    const url = isEdit ? `${API_BASE_URL}/vendors/update-vendor/${currentVendorId}` : `${API_BASE_URL}/vendors/add-vendor`;
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vendorDetails)
    });

    if (response.status === 200 || response.status === 201) {
      setMessage(isEdit ? 'Vendor updated successfully.' : 'Vendor added successfully.');
      fetchVendors();
    } else {
      setError('Failed to save vendor.');
    }

    setVendorDetails({
      companyName: '',
      contactPerson: '',
      contactPersonPosition: '',
      email: '',
      phone: ''
    });
    setIsEdit(false);
  };

  //Function to delete a vendors
  const handleDeleteConfirm = async (vendorId) => {
    const API_BASE_URL = process.env.REACT_APP_BACKEND_API_URL;
    const response = await fetch(`${API_BASE_URL}/vendors/delete-vendor/${vendorId}`, {
    //const response = await fetch(`http://localhost:8000/vendors/delete-vendor/${vendorId}`, {
      method: 'DELETE',
    });

    if (response.status === 200) {
      setMessage('Vendor deleted successfully.');
      fetchVendors(); // Refresh vendors after deletion
    } else {
      setError('Failed to delete vendor.');
    }
  };

  return (
    <>
      <div className="page-wrapper">
        <div className="page-header d-print-none mb-3">
          <div className="container-xl">
            <div className="row g-2 align-items-center">
              <div className="col">
                <h2 className="page-title">
                  Vendor Information
                </h2>
              </div>
              <div className="col-auto ms-auto d-print-none">
                <button href="#" className="btn btn-yellow" onClick={() => handleAddNew()} data-bs-toggle="modal" data-bs-target="#vendorModal">
                  {/* Download SVG icon from http://tabler-icons.io/i/plus */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
                  Add Vendor
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container-xl">
          
          {message && <div className='alert alert-success'>{message}</div>}
          {error && <div className='alert alert-danger'>{error}</div>}

          <div className='card'>
            <div className='card-header'>
              <div className='card-title'>
                Vendors List
              </div>
            </div>
            <VendorTable vendors={vendors} onEdit={handleEdit} onDelete={handleDelete} />
          </div>
        </div>

        {/* Modals */}
        <VendorModal vendorDetails={vendorDetails} handleChange={handleChange} handleSubmit={handleSubmit} isEdit={isEdit} />
        <ConfirmModal vendorId={currentVendorId} onDeleteConfirm={handleDeleteConfirm} />
      </div>
    </>
  );
}
