from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Vendor as VendorModel
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(tags=['Vendor CRUD'], prefix='/vendors')

# Pydantic model for vendor details
class Vendor(BaseModel):
    companyName: str
    contactPerson: str
    contactPersonPosition: str
    email: str  
    phone: str

# POST Request to add a new vendor
@router.post('/add-vendor', status_code=status.HTTP_201_CREATED)
async def add_vendor(vendor: Vendor, db: Session = Depends(get_db)):
    try:
        new_vendor = VendorModel(
            companyName=vendor.companyName,
            contactPerson=vendor.contactPerson,
            contactPersonPosition=vendor.contactPersonPosition,
            email=vendor.email,
            phone=vendor.phone
        )
        db.add(new_vendor)
        db.commit()
        db.refresh(new_vendor)
        return {"Message": "Vendor added successfully."}
    
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding vendor: {str(e)}"
        )

# GET Request to retrieve all vendors
@router.get('/all-vendors', status_code=status.HTTP_200_OK)
async def get_all_vendors(db: Session = Depends(get_db)):
    try:
        vendors = db.query(VendorModel).all()
        print(vendors)
        return vendors
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching vendors: {str(e)}"
        )

# PUT Request to update vendor details
@router.put('/update-vendor/{vendor_id}', status_code=status.HTTP_200_OK)
async def update_vendor(vendor_id: int, updated_vendor: Vendor, db: Session = Depends(get_db)):
    try:
        vendor = db.query(VendorModel).filter(VendorModel.id == vendor_id).first()
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
        
        vendor.companyName = updated_vendor.companyName
        vendor.contactPerson = updated_vendor.contactPerson
        vendor.contactPersonPosition = updated_vendor.contactPersonPosition
        vendor.email = updated_vendor.email
        vendor.phone = updated_vendor.phone

        db.commit()
        db.refresh(vendor)
        return {"Message": "Vendor updated successfully.", "Vendor ID": vendor.id}
    
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating vendor: {str(e)}"
        )

# DELETE Request to delete a vendor by ID
@router.delete('/delete-vendor/{vendor_id}', status_code=status.HTTP_200_OK)
async def delete_vendor(vendor_id: int, db: Session = Depends(get_db)):
    try:
        vendor = db.query(VendorModel).filter(VendorModel.id == vendor_id).first()
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
        
        db.delete(vendor)
        db.commit()
        return {"Message": "Vendor deleted successfully.", "Vendor ID": vendor_id}
    
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting vendor: {str(e)}"
        )