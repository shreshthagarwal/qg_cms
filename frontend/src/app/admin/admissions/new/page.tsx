"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Avatar,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Person,
  School,
  Home,
  Phone,
  Email,
  CalendarToday,
  Upload,
  Delete,
  Visibility,
  Edit,
  Check,
  Close,
  Add,
  CreditCard,
  Book,
  Business,
  ContentPaste,
} from "@mui/icons-material";
import { ThemeProvider } from "../../../../components/theme";
import { format, isValid } from "date-fns";

interface FormData {
  // Personal Details
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  emergencyContact: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  panNumber: string;
  panCardUrl: string;
  aadhaarNumber: string;
  aadhaarCardUrl: string;
  photoUrl: string;
  
  // Educational Details
  tenthPercentage: string;
  twelfthPercentage: string;
  tenthMarksheetUrl: string;
  twelfthMarksheetUrl: string;
  currentCollege: string;
  cgpa: string;
  collegeMarksheetUrl: string;
  graduatingYear: string;
  
  // Course Details
  courseName: string;
  role: string;
  durationMonths: string;
  totalFees: string;
  paidFees: string;
  startDate: string;
  endDate: string;
  
  // Account
  password: string;
}

export default function NewAdmissionPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const leadId = searchParams.get("leadId");
  
  const [formData, setFormData] = useState<FormData>({
    // Personal Details
    firstName: "", lastName: "", dob: "", phone: "", emergencyContact: "", email: "",
    addressLine1: "", addressLine2: "", city: "", state: "", pincode: "",
    panNumber: "", panCardUrl: "", aadhaarNumber: "", aadhaarCardUrl: "", photoUrl: "",
    
    // Educational Details
    tenthPercentage: "", twelfthPercentage: "", tenthMarksheetUrl: "", twelfthMarksheetUrl: "",
    currentCollege: "",
    cgpa: "", collegeMarksheetUrl: "", graduatingYear: "",
    
    // Course Details
    courseName: "", role: "", durationMonths: "6", totalFees: "0", paidFees: "0",
    startDate: new Date().toISOString().split('T')[0], endDate: "",
    
    // Account
    password: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [studentCredentials, setStudentCredentials] = useState<{email: string, password: string} | null>(null);
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [googleFormData, setGoogleFormData] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importedColumns, setImportedColumns] = useState<string[]>([]);
  const [showColumnGuide, setShowColumnGuide] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewFormData, setReviewFormData] = useState<FormData | null>(null);

  useEffect(() => {
    if (leadId) {
      const savedLead = sessionStorage.getItem('selectedLead');
      if (savedLead) {
        const lead = JSON.parse(savedLead);
        setFormData(prev => ({
          ...prev,
          email: lead.email,
          firstName: lead.firstName,
          lastName: lead.lastName,
          phone: lead.phone,
        }));
      }
    }
  }, [leadId]);

  useEffect(() => {
    // Calculate end date when duration or start date changes
    if (formData.durationMonths && formData.startDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + parseInt(formData.durationMonths));
      setFormData(prev => ({
        ...prev,
        endDate: endDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.durationMonths, formData.startDate]);

  const handleFileUpload = async (file: File, fieldName: string) => {
    setUploadStatus(prev => ({ ...prev, [fieldName]: "Uploading..." }));
    
    try {
      // Simulate upload (in production, this would be handled by your file hosting)
      setTimeout(() => {
        setFormData(prev => ({ ...prev, [fieldName]: "https://example.com/file-url" }));
        setUploadStatus(prev => ({ ...prev, [fieldName]: `Uploaded: ${file.name}` }));
      }, 1000);
      
      // Keep filename visible, don't clear status
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(prev => ({ ...prev, [fieldName]: "Upload failed" }));
      setTimeout(() => {
        setUploadStatus(prev => ({ ...prev, [fieldName]: "" }));
      }, 3000);
    }
  };

  const handleRemoveFile = (fieldName: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: "" }));
    setUploadStatus(prev => ({ ...prev, [fieldName]: "" }));
  };

  const handleGoogleFormImport = () => {
    if (!googleFormData.trim()) return;
    
    setImportErrors([]);
    const errors: string[] = [];
    
    // Parse tab or comma-separated data
    const delimiter = googleFormData.includes('\t') ? '\t' : ',';
    const values = googleFormData.split(delimiter).map(v => v.trim());
    
    // Personal & Educational Details Only (No Course Details)
    // Column reference guide (WITHOUT Timestamp and Course Details):
    // 0: First Name, 1: Last Name, 2: DOB, 3: Mobile No, 4: Emergency Contact, 5: email, 6: address line 1, 7: address line 2, 8: city, 9: state, 10: pin code
    // 11: pan number, 12: pan url, 13: adhar no, 14: adhar url, 15: profile photo url, 16: percentage in 10th, 17: 10th marksheet url
    // 18: percentage in 12th, 19: 12th marsheet url, 20: college name, 21: college address, 22: college city, 23: college state, 24: cgpa, 25: marksheet url, 26: graduating year
    
    const fieldMappings: Record<number, { key: keyof FormData; label: string; transform?: (v: string) => string }> = {
      0: { key: 'firstName', label: 'First Name' },
      1: { key: 'lastName', label: 'Last Name' },
      2: { key: 'dob', label: 'Date of Birth (YYYY-MM-DD format)', transform: (v) => {
        // Handle various date formats from Google Sheets
        const parts = v.split(/[\s/-]+/);
        if (parts.length === 3) {
          // Try to parse different formats
          const first = parseInt(parts[0]);
          const second = parseInt(parts[1]);
          const third = parseInt(parts[2]);
          
          // Check if it's YYYY-MM-DD (year first)
          if (first >= 1900 && first <= 2100 && second >= 1 && second <= 12 && third >= 1 && third <= 31) {
            const date = new Date(first, second - 1, third);
            return isValid(date) ? format(date, 'yyyy-MM-dd') : v;
          }
          
          // Check if it's MM DD YYYY (month first)
          if (first >= 1 && first <= 12 && second >= 1 && second <= 31 && third >= 1900 && third <= 2100) {
            const date = new Date(third, first - 1, second);
            return isValid(date) ? format(date, 'yyyy-MM-dd') : v;
          }
          
          // Check if it's DD MM YYYY (day first)
          if (first >= 1 && first <= 31 && second >= 1 && second <= 12 && third >= 1900 && third <= 2100) {
            const date = new Date(third, second - 1, first);
            return isValid(date) ? format(date, 'yyyy-MM-dd') : v;
          }
        }
        
        // Fallback to regular date parsing
        const date = new Date(v);
        return isValid(date) ? format(date, 'yyyy-MM-dd') : v;
      }},
      3: { key: 'phone', label: 'Mobile No' },
      4: { key: 'emergencyContact', label: 'Emergency Contact' },
      5: { key: 'email', label: 'Email' },
      6: { key: 'addressLine1', label: 'Address Line 1' },
      7: { key: 'addressLine2', label: 'Address Line 2' },
      8: { key: 'city', label: 'City' },
      9: { key: 'state', label: 'State' },
      10: { key: 'pincode', label: 'Pin Code' },
      11: { key: 'panNumber', label: 'PAN Number' },
      12: { key: 'panCardUrl', label: 'PAN URL' },
      13: { key: 'aadhaarNumber', label: 'Aadhar No' },
      14: { key: 'aadhaarCardUrl', label: 'Aadhar URL' },
      15: { key: 'photoUrl', label: 'Profile Photo URL' },
      16: { key: 'tenthPercentage', label: 'Percentage in 10th' },
      17: { key: 'tenthMarksheetUrl', label: '10th Marksheet URL' },
      18: { key: 'twelfthPercentage', label: 'Percentage in 12th' },
      19: { key: 'twelfthMarksheetUrl', label: '12th Marksheet URL' },
      20: { key: 'currentCollege', label: 'College Name' },
      24: { key: 'cgpa', label: 'CGPA' },
      25: { key: 'collegeMarksheetUrl', label: 'Marksheet URL' },
      26: { key: 'graduatingYear', label: 'Graduating Year' },
    };
    
    const newFormData = { ...formData };
    const mappedColumns: string[] = [];
    
    values.forEach((value, index) => {
      const mapping = fieldMappings[index];
      if (mapping && value) {
        const transformedValue = mapping.transform ? mapping.transform(value) : value;
        (newFormData as any)[mapping.key] = transformedValue;
        mappedColumns.push(`Column ${String.fromCharCode(66 + index)} → ${mapping.label}`);
      } else if (value && !mapping) {
        errors.push(`Column ${String.fromCharCode(66 + index)}: "${value.substring(0, 20)}..." - no field mapped (Course Details should be added manually)`);
      }
    });
    
    setReviewFormData(newFormData);
    setImportedColumns(mappedColumns);
    setImportErrors(errors);
    setShowReviewDialog(true);
  };

  const handleConfirmReview = () => {
    if (reviewFormData) {
      setFormData(reviewFormData);
      setSuccess(`Personal & Educational details imported successfully! ${importedColumns.length} fields mapped. Please review and add Course Details below.`);
      setTimeout(() => setSuccess(''), 5000);
    }
    setShowReviewDialog(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const token = (session?.user as any)?.accessToken;
      
      // Generate random password if not provided
      const finalPassword = formData.password || Math.random().toString(36).slice(-8);
      
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: finalPassword,
        courseName: formData.courseName,
        durationMonths: Number(formData.durationMonths),
        totalFees: Number(formData.totalFees),
        paidFees: Number(formData.paidFees),
        startDate: formData.startDate,
        endDate: formData.endDate,
        
        // Personal Details
        dob: formData.dob ? new Date(formData.dob) : null,
        emergencyContact: formData.emergencyContact,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        panNumber: formData.panNumber,
        panCardUrl: formData.panCardUrl,
        aadhaarNumber: formData.aadhaarNumber,
        aadhaarCardUrl: formData.aadhaarCardUrl,
        photoUrl: formData.photoUrl,
        
        // Educational Details
        tenthPercentage: formData.tenthPercentage ? parseFloat(formData.tenthPercentage) : null,
        twelfthPercentage: formData.twelfthPercentage ? parseFloat(formData.twelfthPercentage) : null,
        tenthMarksheetUrl: formData.tenthMarksheetUrl,
        twelfthMarksheetUrl: formData.twelfthMarksheetUrl,
        currentCollege: formData.currentCollege,
        cgpa: formData.cgpa ? parseFloat(formData.cgpa) : null,
        collegeMarksheetUrl: formData.collegeMarksheetUrl,
        graduatingYear: formData.graduatingYear ? parseInt(formData.graduatingYear) : null,
        
        leadId: leadId || undefined,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStudentCredentials({
          email: formData.email,
          password: finalPassword
        });
        setSuccess("Student enrolled successfully!");
        
        // Handle lead based on email
        try {
          // First, check if a lead with this email exists
          const leadsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads?email=${encodeURIComponent(formData.email)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (leadsRes.ok) {
            const leadsData = await leadsRes.json();
            const existingLead = leadsData.find((lead: any) => lead.email === formData.email);
            
            if (existingLead) {
              // Update existing lead to ENROLLED
              await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/${existingLead.id}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: "ENROLLED" })
              });
              console.log("Updated existing lead to ENROLLED:", existingLead.id);
            } else {
              // Create new lead with ENROLLED status
              await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  firstName: formData.firstName,
                  lastName: formData.lastName,
                  email: formData.email,
                  phone: formData.phone,
                  status: "ENROLLED",
                  source: "Direct Admission",
                  course: formData.courseName,
                })
              });
              console.log("Created new lead with ENROLLED status");
            }
          }
        } catch (err) {
          console.error("Error handling lead:", err);
        }
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to enroll student");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider>
      <Box sx={{ maxWidth: 1200, mx: 'auto', py: 3 }}>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" fontWeight={700} color="#1f2937">
                {leadId ? "Convert Lead to Student" : "New Admission"}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {leadId ? "Complete the admission details for this lead." : "Register a new student in the system."}
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<Close />}
                onClick={() => router.push('/admin/leads')}
              >
                Back to Leads
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Google Form Import Card */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: '#fff8f0', border: '1px solid #e27719' }}>
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar sx={{ bgcolor: '#e27719', color: 'white', mr: 2 }}>
              <ContentPaste />
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6" fontWeight={600} color="#1f2937">
                Import from Google Form
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Copy a row from your Google Sheets responses and paste it here to auto-fill all fields including document URLs
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowColumnGuide(!showColumnGuide)}
              sx={{ ml: 2 }}
            >
              {showColumnGuide ? 'Hide' : 'View'} Column Guide
            </Button>
          </Box>
          
          {/* Column Reference Guide */}
          {showColumnGuide && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5', maxHeight: 300, overflow: 'auto' }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Google Sheets Column Reference (Copy entire row from your responses sheet)
              </Typography>
              <Box component="table" sx={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e27719', color: 'white' }}>
                    <th style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #ddd' }}>Col</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #ddd' }}>Field Name</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #ddd' }}>Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{backgroundColor:'#fff'}}><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>B</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>First Name *</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>John</td></tr>
                  <tr><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>C</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Last Name *</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Doe</td></tr>
                  <tr style={{backgroundColor:'#fff'}}><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>D</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>DOB *</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>1/1/2000</td></tr>
                  <tr><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>E</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Mobile No *</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>9876543210</td></tr>
                  <tr style={{backgroundColor:'#fff'}}><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>F</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Emergency Contact</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>9876543211</td></tr>
                  <tr><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>G</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Email *</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>john@example.com</td></tr>
                  <tr style={{backgroundColor:'#fff'}}><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>H</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Address Line 1</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>123 Main St</td></tr>
                  <tr><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>I</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Address Line 2</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Apt 4B</td></tr>
                  <tr style={{backgroundColor:'#fff'}}><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>J</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>City</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Delhi</td></tr>
                  <tr><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>K</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>State</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Delhi</td></tr>
                  <tr style={{backgroundColor:'#fff'}}><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>L</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Pin Code</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>110001</td></tr>
                  <tr><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>M</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>PAN Number</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>ABCDE1234F</td></tr>
                  <tr style={{backgroundColor:'#e8f5e9'}}><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>N</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>PAN URL</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>drive.google.com/...</td></tr>
                  <tr><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>O</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Aadhar No</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>1234 5678 9012</td></tr>
                  <tr style={{backgroundColor:'#e8f5e9'}}><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>P</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Aadhar URL</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>drive.google.com/...</td></tr>
                  <tr style={{backgroundColor:'#e8f5e9'}}><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Q</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Profile Photo URL</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>drive.google.com/...</td></tr>
                  <tr><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>R</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Percentage in 10th</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>85.5</td></tr>
                  <tr style={{backgroundColor:'#e8f5e9'}}><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>S</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>10th Marksheet URL</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>drive.google.com/...</td></tr>
                  <tr><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>T</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Percentage in 12th</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>88.0</td></tr>
                  <tr style={{backgroundColor:'#e8f5e9'}}><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>U</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>12th Marksheet URL</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>drive.google.com/...</td></tr>
                  <tr><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>V</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>College Name</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>DU</td></tr>
                  <tr style={{backgroundColor:'#fff'}}><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>W</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>College Address</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>North Campus</td></tr>
                  <tr><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>X</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>College City</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Delhi</td></tr>
                  <tr style={{backgroundColor:'#fff'}}><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Y</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>College State</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Delhi</td></tr>
                  <tr><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Z</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>CGPA</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>8.5</td></tr>
                  <tr style={{backgroundColor:'#e8f5e9'}}><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>AA</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Marksheet URL</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>drive.google.com/...</td></tr>
                  <tr><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>AB</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>Graduating Year</td><td style={{padding:'2px 8px',border:'1px solid #ddd'}}>2024</td></tr>
                </tbody>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                * Required fields | Green rows = Google Drive file URLs will be stored directly
              </Typography>
            </Paper>
          )}
          
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Paste tab-separated data from Google Sheets here... (Columns B through AB: Personal & Educational Details only. Course Details will be added manually.)"
            value={googleFormData}
            onChange={(e) => setGoogleFormData(e.target.value)}
            sx={{ mb: 2, bgcolor: 'white' }}
          />
          
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="outlined"
              onClick={() => {
                setGoogleFormData('');
                setImportedColumns([]);
              }}
              disabled={!googleFormData}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              onClick={handleGoogleFormImport}
              disabled={!googleFormData}
              startIcon={<Visibility />}
              sx={{ bgcolor: '#e27719', '&:hover': { bgcolor: '#c45f10' } }}
            >
              Check and Add Details
            </Button>
          </Box>
          
          {importErrors.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight={600}>Some fields couldn't be mapped:</Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {importErrors.map((err, idx) => (
                  <li key={idx}><Typography variant="caption">{err}</Typography></li>
                ))}
              </ul>
            </Alert>
          )}
        </Paper>

        {/* Success Dialog */}
        <Dialog open={!!studentCredentials} onClose={() => setStudentCredentials(null)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: '#e27719', color: 'white' }}>
                <Check />
              </Avatar>
              <Typography variant="h6" fontWeight={600}>
                Student Enrolled Successfully!
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            {studentCredentials && (
              <Paper sx={{ p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                <Typography variant="body1" fontWeight={500} gutterBottom>
                  Student credentials have been generated. Please save these details securely.
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Email:</Typography>
                    <Typography variant="body1" fontWeight={600} sx={{ wordBreak: 'break-all' }}>
                      {studentCredentials.email}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary">Password:</Typography>
                    <Typography variant="body1" fontWeight={600} fontFamily="monospace">
                      {studentCredentials.password}
                    </Typography>
                  </Box>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<ContentPaste />}
                    onClick={() => {
                      navigator.clipboard.writeText(`Email: ${studentCredentials.email}\nPassword: ${studentCredentials.password}`);
                      // You could add a toast notification here
                    }}
                    sx={{ 
                      bgcolor: '#e27719', 
                      '&:hover': { bgcolor: '#c45f10' },
                      py: 1.5,
                      fontSize: '16px',
                      fontWeight: 600,
                      borderRadius: 2
                    }}
                  >
                    Copy Credentials
                  </Button>
                </Box>
              </Paper>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setStudentCredentials(null)}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onClose={() => setShowReviewDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: '#e27719', color: 'white' }}>
                <Visibility />
              </Avatar>
              <Typography variant="h6" fontWeight={600}>
                Review Imported Details
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            {reviewFormData && (
              <>
                {/* Personal Details Summary */}
                <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Personal Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">First Name:</Typography>
                      <Typography variant="body1">{reviewFormData.firstName}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Last Name:</Typography>
                      <Typography variant="body1">{reviewFormData.lastName}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">DOB (YYYY-MM-DD format):</Typography>
                      <Typography variant="body1">{reviewFormData.dob}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Mobile No:</Typography>
                      <Typography variant="body1">{reviewFormData.phone}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Emergency Contact:</Typography>
                      <Typography variant="body1">{reviewFormData.emergencyContact || 'Not provided'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Email:</Typography>
                      <Typography variant="body1">{reviewFormData.email}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Address Line 1:</Typography>
                      <Typography variant="body1">{reviewFormData.addressLine1}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Address Line 2:</Typography>
                      <Typography variant="body1">{reviewFormData.addressLine2 || 'Not provided'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">City:</Typography>
                      <Typography variant="body1">{reviewFormData.city}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">State:</Typography>
                      <Typography variant="body1">{reviewFormData.state}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Pin Code:</Typography>
                      <Typography variant="body1">{reviewFormData.pincode}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">PAN Number:</Typography>
                      <Typography variant="body1">{reviewFormData.panNumber}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">PAN URL:</Typography>
                      <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>{reviewFormData.panCardUrl || 'Not provided'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Aadhar No:</Typography>
                      <Typography variant="body1">{reviewFormData.aadhaarNumber}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Aadhar URL:</Typography>
                      <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>{reviewFormData.aadhaarCardUrl || 'Not provided'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Profile Photo URL:</Typography>
                      <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>{reviewFormData.photoUrl || 'Not provided'}</Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Educational Details Summary */}
                <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Educational Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Percentage in 10th:</Typography>
                      <Typography variant="body1">{reviewFormData.tenthPercentage}%</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">10th Marksheet URL:</Typography>
                      <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>{reviewFormData.tenthMarksheetUrl || 'Not provided'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Percentage in 12th:</Typography>
                      <Typography variant="body1">{reviewFormData.twelfthPercentage}%</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">12th Marksheet URL:</Typography>
                      <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>{reviewFormData.twelfthMarksheetUrl || 'Not provided'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">College Name:</Typography>
                      <Typography variant="body1">{reviewFormData.currentCollege}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">CGPA:</Typography>
                      <Typography variant="body1">{reviewFormData.cgpa}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Marksheet URL:</Typography>
                      <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>{reviewFormData.collegeMarksheetUrl || 'Not provided'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Graduating Year:</Typography>
                      <Typography variant="body1">{reviewFormData.graduatingYear}</Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Course Details Input */}
                <Paper sx={{ p: 2, mb: 2, bgcolor: '#fff3e0' }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Course Details (Required)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        required
                        label="Course Name"
                        value={reviewFormData.courseName}
                        onChange={(e) => setReviewFormData(prev => prev ? {...prev, courseName: e.target.value} : null)}
                        placeholder="e.g., Algorithmic Trading"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Role"
                        value={reviewFormData.role || ''}
                        onChange={(e) => setReviewFormData(prev => prev ? {...prev, role: e.target.value} : null)}
                        placeholder="e.g., Student, Intern"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        required
                        label="Duration (Months)"
                        type="number"
                        value={reviewFormData.durationMonths}
                        onChange={(e) => setReviewFormData(prev => prev ? {...prev, durationMonths: e.target.value} : null)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        required
                        label="Total Fees (₹)"
                        type="number"
                        value={reviewFormData.totalFees}
                        onChange={(e) => setReviewFormData(prev => prev ? {...prev, totalFees: e.target.value} : null)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        required
                        label="Paid Fees (₹)"
                        type="number"
                        value={reviewFormData.paidFees}
                        onChange={(e) => setReviewFormData(prev => prev ? {...prev, paidFees: e.target.value} : null)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        required
                        label="Start Date"
                        type="date"
                        value={reviewFormData.startDate}
                        onChange={(e) => setReviewFormData(prev => prev ? {...prev, startDate: e.target.value} : null)}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          '& .MuiInputBase-input': {
                            color: '#1f2937',
                            fontSize: '16px',
                            padding: '12px 14px',
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            '&:focus': {
                              borderColor: '#e27719',
                              boxShadow: '0 0 0 3px rgba(226, 119, 25, 0.1)',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: '#6b7280',
                            fontSize: '14px',
                            fontWeight: 500,
                            '&.Mui-focused': {
                              color: '#e27719',
                            },
                          },
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: '#d1d5db',
                              borderRadius: '8px',
                            },
                            '&:hover fieldset': {
                              borderColor: '#e27719',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#e27719',
                              borderWidth: '2px',
                            },
                          },
                        }}
                      />
                    </Grid>
                  </Grid>
                </Paper>


                {importErrors.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2" fontWeight={600}>Import warnings:</Typography>
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      {importErrors.map((err, idx) => (
                        <li key={idx}><Typography variant="caption">{err}</Typography></li>
                      ))}
                    </ul>
                  </Alert>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setShowReviewDialog(false)}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmReview}
              variant="contained"
              sx={{ bgcolor: '#e27719', '&:hover': { bgcolor: '#c45f10' } }}
            >
              Confirm and Add Details
            </Button>
          </DialogActions>
        </Dialog>

        {/* Form */}
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <form onSubmit={handleSubmit}>
            
            {/* 1. PERSONAL DETAILS */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" mb={3}>
                <Avatar sx={{ bgcolor: '#e27719', color: 'white', mr: 2, width: 32, height: 32, fontSize: 14, fontWeight: 700 }}>
                  1
                </Avatar>
                <Typography variant="h6" fontWeight={600} color="#1f2937">
                  Personal Details
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    required
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    required
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    required
                    label="Date of Birth"
                    name="dob"
                    type="date"
                    value={formData.dob}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    required
                    label="Mobile No"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="Emergency Contact"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    required
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, lg: 8 }}>
                  <TextField
                    fullWidth
                    label="Address Line 1"
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, lg: 8 }}>
                  <TextField
                    fullWidth
                    label="Address Line 2"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="State"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Pincode"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="PAN Number"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="PAN Card URL (Google Drive)"
                    name="panCardUrl"
                    value={formData.panCardUrl}
                    onChange={handleChange}
                    placeholder="https://drive.google.com/..."
                    helperText={formData.panCardUrl ? 'Link will be stored directly' : 'Paste Google Drive link'}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="Aadhaar Number"
                    name="aadhaarNumber"
                    value={formData.aadhaarNumber}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="Aadhaar Card URL (Google Drive)"
                    name="aadhaarCardUrl"
                    value={formData.aadhaarCardUrl}
                    onChange={handleChange}
                    placeholder="https://drive.google.com/..."
                    helperText={formData.aadhaarCardUrl ? 'Link will be stored directly' : 'Paste Google Drive link'}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="Photo URL (Google Drive)"
                    name="photoUrl"
                    value={formData.photoUrl}
                    onChange={handleChange}
                    placeholder="https://drive.google.com/..."
                    helperText={formData.photoUrl ? 'Link will be stored directly' : 'Paste Google Drive link'}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* 2. EDUCATIONAL DETAILS */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" mb={3}>
                <Avatar sx={{ bgcolor: '#e27719', color: 'white', mr: 2, width: 32, height: 32, fontSize: 14, fontWeight: 700 }}>
                  2
                </Avatar>
                <Typography variant="h6" fontWeight={600} color="#1f2937">
                  Educational Details
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="Percentage in 10th Class"
                    name="tenthPercentage"
                    type="number"
                    value={formData.tenthPercentage}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="10th Marksheet URL (Google Drive)"
                    name="tenthMarksheetUrl"
                    value={formData.tenthMarksheetUrl}
                    onChange={handleChange}
                    placeholder="https://drive.google.com/..."
                    helperText={formData.tenthMarksheetUrl ? 'Link will be stored directly' : 'Paste Google Drive link'}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="Percentage in 12th Class"
                    name="twelfthPercentage"
                    type="number"
                    value={formData.twelfthPercentage}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="12th Marksheet URL (Google Drive)"
                    name="twelfthMarksheetUrl"
                    value={formData.twelfthMarksheetUrl}
                    onChange={handleChange}
                    placeholder="https://drive.google.com/..."
                    helperText={formData.twelfthMarksheetUrl ? 'Link will be stored directly' : 'Paste Google Drive link'}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="Current College Name"
                    name="currentCollege"
                    value={formData.currentCollege}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="CGPA"
                    name="cgpa"
                    type="number"
                    value={formData.cgpa}
                    onChange={handleChange}
                    inputProps={{ step: "0.01" }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="College Marksheet URL (Google Drive)"
                    name="collegeMarksheetUrl"
                    value={formData.collegeMarksheetUrl}
                    onChange={handleChange}
                    placeholder="https://drive.google.com/..."
                    helperText={formData.collegeMarksheetUrl ? 'Link will be stored directly' : 'Paste Google Drive link'}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="Graduating Year"
                    name="graduatingYear"
                    type="number"
                    value={formData.graduatingYear}
                    onChange={handleChange}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* 3. COURSE DETAILS */}
            <Box mb={4}>
              <Box display="flex" alignItems="center" mb={3}>
                <Avatar sx={{ bgcolor: '#e27719', color: 'white', mr: 2, width: 32, height: 32, fontSize: 14, fontWeight: 700 }}>
                  3
                </Avatar>
                <Typography variant="h6" fontWeight={600} color="#1f2937">
                  Course Details
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    required
                    label="Course Name"
                    name="courseName"
                    value={formData.courseName}
                    onChange={handleChange}
                    placeholder="e.g. Algorithmic Trading"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="Role"
                    name="role"
                    value={formData.role || ''}
                    onChange={handleChange}
                    placeholder="e.g., Student, Intern, Trainee"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    required
                    label="Duration (Months)"
                    name="durationMonths"
                    type="number"
                    value={formData.durationMonths}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    required
                    label="Starting Date"
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="Ending Date (Calculated)"
                    name="endDate"
                    type="date"
                    value={formData.endDate}
                    InputProps={{ readOnly: true }}
                    sx={{ bgcolor: '#f5f5f5' }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    required
                    label="Total Course Fees (₹)"
                    name="totalFees"
                    type="number"
                    value={formData.totalFees}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    required
                    label="Course Fees Paid (₹)"
                    name="paidFees"
                    type="number"
                    value={formData.paidFees}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <TextField
                    fullWidth
                    label="Password (Auto-generated if empty)"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Leave empty for auto-generation"
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Form Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 3, borderTop: '1px solid #e5e7eb' }}>
              <Button 
                variant="outlined" 
                onClick={() => router.back()}
                size="large"
              >
                Cancel
              </Button>
              <Button 
                variant="contained" 
                type="submit" 
                disabled={loading}
                size="large"
                sx={{ 
                  bgcolor: '#e27719',
                  '&:hover': { bgcolor: '#c45f10' }
                }}
              >
                {loading ? "Processing..." : "Confirm Admission"}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}
