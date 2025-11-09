from sqlalchemy import Column, Integer, String, ForeignKey, Text, Boolean, JSON, BLOB, Date, DateTime
from sqlalchemy.orm import relationship
from .database import Base


class Vendor(Base):
    __tablename__ = 'vendors'
    id = Column(Integer, primary_key=True)
    companyName = Column(String)
    contactPerson = Column(String)
    contactPersonPosition = Column(String)
    email = Column(String)
    phone = Column(String)