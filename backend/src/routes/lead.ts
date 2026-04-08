import { Router } from 'express';
import getDb from '../database';

const router = Router();

// Endpoint for external website to submit a lead
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;

    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getDb();
    const lead = await db.createLead({
      firstname: firstName,
      lastname: lastName,
      email,
      phone,
      message,
      status: 'NEW'
    });

    res.status(201).json({ message: 'Lead submitted successfully', lead });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint to view all leads
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const leads = await db.findAllLeads();
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint to mark lead as contacted
router.post('/:id/contacted', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    // Update lead status to CONTACTED
    const lead = await db.updateLeadStatus(id, 'CONTACTED');
    
    res.json({ message: 'Lead marked as contacted', lead });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint to convert lead to student
router.post('/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      password, courseName, role, durationMonths, totalFees, paidFees, 
      startDate, endDate,
      // Personal Details
      dob, emergencyContact, addressLine1, addressLine2, 
      city, state, pincode, panNumber, panCardUrl, 
      aadhaarNumber, aadhaarCardUrl, photoUrl,
      // Educational Details
      tenthPercentage, twelfthPercentage, tenthMarksheetUrl, 
      twelfthMarksheetUrl, currentCollege, collegeAddress, 
      collegeCity, collegeState, cgpa, collegeMarksheetUrl, 
      graduatingYear 
    } = req.body;
    
    const db = getDb();
    
    // First get the lead details
    const lead = await db.findLeadById(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Convert empty strings to null for optional fields
    const cleanPhone = lead.phone || null;
    const cleanEmergencyContact = emergencyContact || null;
    
    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Calculate end date if not provided
    const calculatedEndDate = endDate || new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + durationMonths));
    
    // Create user first
    const newUser = await db.createUser({
      email: lead.email,
      password: hashedPassword,
      firstname: lead.firstname,
      lastname: lead.lastname,
      phone: cleanPhone,
      role: 'STUDENT'
    });
    
    // Create student profile with correct field names
    const studentProfile = await db.createStudentProfile({
      userid: newUser.id,        // Use correct field name: userid
      coursename: courseName,      // Use correct field name: coursename
      durationmonths: durationMonths, // Use correct field name: durationmonths
      totalfees: totalFees,        // Use correct field name: totalfees
      paidfees: paidFees,          // Use correct field name: paidfees
      startdate: new Date(startDate),  // Use correct field name: startdate
      enddate: calculatedEndDate,      // Use correct field name: enddate
      
      // Personal Details
      firstname: lead.firstname,         // Use correct field name: firstname
      lastname: lead.lastname,           // Use correct field name: lastname
      dob: dob ? new Date(dob) : null,
      phone: lead.phone,               // Use phone from lead
      emergencycontact: cleanEmergencyContact, // Use correct field name: emergencycontact
      addressline1: addressLine1,     // Use correct field name: addressline1
      addressline2: addressLine2,     // Use correct field name: addressline2
      city: city,
      state: state,
      pincode: pincode,
      pannumber: panNumber,           // Use correct field name: pannumber
      aadhaarnumber: aadhaarNumber,    // Use correct field name: aadhaarnumber
      pancardurl: panCardUrl,          // Use correct field name: pancardurl
      aadhaarcardurl: aadhaarCardUrl,   // Use correct field name: aadhaarcardurl
      photourl: photoUrl,              // Use correct field name: photourl
      
      // Educational Details
      tenthpercentage: tenthPercentage,   // Use correct field name: tenthpercentage
      twelfthpercentage: twelfthPercentage, // Use correct field name: twelfthpercentage
      tenthmarksheeturl: tenthMarksheetUrl,   // Use correct field name: tenthmarksheeturl
      twelfthmarksheeturl: twelfthMarksheetUrl, // Use correct field name: twelfthmarksheeturl
      currentcollege: currentCollege,     // Use correct field name: currentcollege
      cgpa,
      collegemarksheeturl: collegeMarksheetUrl, // Use correct field name: collegemarksheeturl
      graduatingyear: graduatingYear,    // Use correct field name: graduatingyear
      
      // Course Details
      role: role || 'Student'
    });
    
    // Update lead status to CONVERTED
    const updatedLead = await db.updateLeadStatus(id, 'CONVERTED');
    
    res.status(201).json({ 
      message: 'Lead converted to student successfully', 
      lead: updatedLead, 
      student: { ...newUser, studentProfile } 
    });
  } catch (error) {
    console.error('Error converting lead to student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint to mark lead as unsuccessful
router.post('/:id/unsuccessful', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    // Update lead status to UNSUCCESSFUL and move to archive
    const lead = await db.updateLeadStatus(id, 'UNSUCCESSFUL');
    
    res.json({ message: 'Lead marked as unsuccessful', lead });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint to get archived leads
router.get('/archived', async (req, res) => {
  try {
    const db = getDb();
    const archivedLeads = await db.findArchivedLeads();
    res.json(archivedLeads);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
