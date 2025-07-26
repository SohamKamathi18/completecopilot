import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Set up axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Auth Context
const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (email, password, fullName) => {
    try {
      const response = await axios.post(`${API}/auth/register`, {
        email,
        password,
        full_name: fullName,
        role: 'radiologist'
      });
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const Login = ({ onToggle }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = React.useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">X-AI RadPortal</h1>
          <p className="text-gray-600 mt-2">Advanced Radiology AI Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="radiologist@hospital.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200 font-medium disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onToggle}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Don't have an account? Register here
          </button>
        </div>
      </div>
    </div>
  );
};

// Register Component
const Register = ({ onToggle }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = React.useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await register(email, password, fullName);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Join RadPortal</h1>
          <p className="text-gray-600 mt-2">Create your radiologist account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Dr. John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="radiologist@hospital.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200 font-medium disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onToggle}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Already have an account? Sign in here
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('new-report');
  const [reports, setReports] = useState([]);
  const { user, logout } = React.useContext(AuthContext);

  // New Report Form State
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!selectedFile || !patientId) {
      alert('Please provide patient ID and select an image');
      return;
    }

    setUploading(true);

    try {
      // Create patient first
      await axios.post(`${API}/patients`, {
        patient_id: patientId,
        name: patientName,
        age: parseInt(patientAge),
        gender: patientGender,
        clinical_notes: clinicalNotes
      });

      // Upload image and create report
      const formData = new FormData();
      formData.append('patient_id', patientId);
      formData.append('clinical_notes', clinicalNotes);
      formData.append('image', selectedFile);

      const response = await axios.post(`${API}/reports`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setCurrentReport(response.data);
      setActiveTab('report-view');
      
      // Clear form
      setPatientId('');
      setPatientName('');
      setPatientAge('');
      setPatientGender('');
      setClinicalNotes('');
      setSelectedFile(null);
    } catch (error) {
      alert('Error creating report: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  const loadReports = async () => {
    try {
      // This would be a dedicated endpoint to get all reports for the radiologist
      // For now, we'll show a placeholder
      setReports([]);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const NavButton = ({ id, label, icon, active, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">X-AI RadPortal</h1>
          <p className="text-sm text-gray-600">Welcome, {user?.full_name}</p>
        </div>

        <nav className="mt-6 px-4 space-y-2">
          <NavButton
            id="new-report"
            label="New Report"
            icon="📝"
            active={activeTab === 'new-report'}
            onClick={setActiveTab}
          />
          <NavButton
            id="report-view"
            label="Current Report"
            icon="📊"
            active={activeTab === 'report-view'}
            onClick={setActiveTab}
          />
          <NavButton
            id="pdf-upload"
            label="Upload PDF"
            icon="📄"
            active={activeTab === 'pdf-upload'}
            onClick={setActiveTab}
          />
        </nav>

        <div className="absolute bottom-6 left-4 right-4">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'new-report' && (
          <div className="h-full overflow-y-auto p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Report</h2>

            <form onSubmit={handleSubmitReport} className="max-w-4xl space-y-6">
              {/* Patient Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Patient ID *
                    </label>
                    <input
                      type="text"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="P001234"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Patient Name
                    </label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="45"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender
                    </label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clinical Notes
                  </label>
                  <textarea
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Patient presents with chest pain and shortness of breath..."
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">X-Ray Image</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept="image/*,.dcm"
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
                      📤
                    </div>
                    <p className="text-lg font-medium text-gray-900">
                      {selectedFile ? selectedFile.name : 'Click to upload X-ray image'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supports DICOM, JPG, PNG files
                    </p>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-200 font-medium disabled:opacity-50"
              >
                {uploading ? 'Processing X-ray with AI...' : 'Generate AI Report'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'report-view' && currentReport && (
          <ReportViewer report={currentReport} />
        )}

        {activeTab === 'pdf-upload' && (
          <PDFUploadComponent />
        )}

        {activeTab === 'report-view' && !currentReport && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 text-gray-400 mx-auto mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900">No Report Selected</h3>
              <p className="text-gray-600 mt-2">Create a new report to view analysis results</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Report Viewer Component
const ReportViewer = ({ report }) => {
  const [reportText, setReportText] = useState(report.final_report);
  const [saving, setSaving] = useState(false);
  const [showSegmentation, setShowSegmentation] = useState(false);

  const saveReport = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/reports/${report.id}`, {
        final_report: reportText
      });
      alert('Report saved successfully!');
    } catch (error) {
      alert('Error saving report: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const finalizeReport = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/reports/${report.id}`, {
        final_report: reportText,
        status: 'finalized'
      });
      alert('Report finalized successfully!');
    } catch (error) {
      alert('Error finalizing report: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const exportPDF = async () => {
    try {
      const response = await axios.get(`${API}/reports/${report.id}/export?format=pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${report.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error exporting PDF: ' + error.message);
    }
  };

  return (
    <div className="h-full flex">
      {/* Left Panel - Image and Segmentation */}
      <div className="w-1/2 bg-white border-r">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">X-Ray Analysis</h3>
          <div className="mt-2">
            <button
              onClick={() => setShowSegmentation(!showSegmentation)}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
            >
              {showSegmentation ? 'Hide' : 'Show'} Segmentation
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {report.image_data && (
            <div className="relative">
              <img
                src={`data:image/jpeg;base64,${report.image_data}`}
                alt="X-ray"
                className="w-full h-auto rounded-lg shadow"
              />
              {showSegmentation && (
                <div className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-lg">
                  <div className="p-4 bg-white bg-opacity-90 rounded m-4">
                    <h4 className="font-semibold text-sm">AI Detected Pathologies:</h4>
                    {Object.entries(report.pathology_results || {}).map(([pathology, data]) => (
                      data.detected && (
                        <div key={pathology} className="text-xs mt-1">
                          <span className="font-medium">{pathology}:</span> {(data.probability * 100).toFixed(1)}%
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Report Editor */}
      <div className="w-1/2 flex flex-col">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Report Editor</h3>
          <div className="mt-2 space-x-2">
            <button
              onClick={saveReport}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={finalizeReport}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Finalize Report
            </button>
            <button
              onClick={exportPDF}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Export PDF
            </button>
          </div>
        </div>

        <div className="flex-1 p-6">
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            className="w-full h-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Edit the AI-generated report..."
          />
        </div>

        {/* Patient Token Display */}
        <div className="p-6 border-t bg-gray-50">
          <h4 className="font-semibold text-sm text-gray-700 mb-2">Patient Access Link:</h4>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={`${window.location.origin}/patient/${report.patient_token}`}
              readOnly
              className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded bg-gray-50"
            />
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/patient/${report.patient_token}`)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// PDF Upload Component
const PDFUploadComponent = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Please select a PDF file');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('pdf_file', selectedFile);

      const response = await axios.post(`${API}/reports/upload-pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setResult(response.data);
    } catch (error) {
      alert('Error uploading PDF: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload PDF Report</h2>

      <div className="max-w-2xl">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Radiology Report</h3>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              onChange={handleFileSelect}
              accept=".pdf"
              className="hidden"
              id="pdf-upload"
            />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              <div className="mx-auto w-12 h-12 text-gray-400 mb-4">📄</div>
              <p className="text-lg font-medium text-gray-900">
                {selectedFile ? selectedFile.name : 'Click to upload PDF report'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Only PDF files are supported
              </p>
            </label>
          </div>

          {selectedFile && (
            <div className="mt-6">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-200 font-medium disabled:opacity-50"
              >
                {uploading ? 'Extracting text...' : 'Upload and Extract Text'}
              </button>
            </div>
          )}
        </div>

        {result && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Extraction Results</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Report ID: {result.report_id}</p>
              <div className="text-sm">
                <strong>Extracted Text:</strong>
                <pre className="mt-2 whitespace-pre-wrap text-gray-700">{result.extracted_text}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Patient Dashboard Component (accessible via direct URL)
const PatientDashboard = ({ token }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [token]);

  const loadReportData = async () => {
    try {
      const response = await axios.get(`${API}/public/view/${token}`);
      setReportData(response.data);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage = { role: 'user', content: currentMessage };
    setChatMessages(prev => [...prev, userMessage]);
    setChatLoading(true);
    
    try {
      const response = await axios.post(`${API}/public/chat/${token}`, {
        query: currentMessage
      });
      
      const aiMessage = { role: 'assistant', content: response.data.response };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
      setCurrentMessage('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your report...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 text-red-500 mx-auto mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900">Report Not Found</h2>
          <p className="text-gray-600 mt-2">Invalid or expired access link</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Your X-Ray Report</h1>
          {reportData.patient && (
            <p className="text-gray-600 mt-1">
              Patient: {reportData.patient.name} (ID: {reportData.patient.patient_id})
            </p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Report Content */}
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Report Summary</h2>
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-gray-700 text-sm">
                  {reportData.report.final_report}
                </pre>
              </div>
            </div>

            {/* X-Ray Image */}
            {reportData.report.image_data && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">X-Ray Image</h2>
                <img
                  src={`data:image/jpeg;base64,${reportData.report.image_data}`}
                  alt="X-ray"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Chat Interface */}
          <div>
            <div className="bg-white rounded-lg shadow p-6 h-96 flex flex-col">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ask About Your Report</h2>
              
              <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-gray-500 text-sm text-center">
                    Ask me anything about your X-ray report!
                  </div>
                )}
                
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-100 text-blue-900 ml-8'
                        : 'bg-gray-100 text-gray-900 mr-8'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                ))}
                
                {chatLoading && (
                  <div className="bg-gray-100 text-gray-900 mr-8 p-3 rounded-lg">
                    <div className="animate-pulse">Thinking...</div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Ask about your report..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={chatLoading || !currentMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>

            {/* Download Section */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Download Report</h2>
              <button
                onClick={async () => {
                  try {
                    const response = await axios.get(`${API}/reports/${reportData.report.id}/export?format=pdf`, {
                      responseType: 'blob'
                    });
                    
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `my_xray_report.pdf`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  } catch (error) {
                    alert('Error downloading report: ' + error.message);
                  }
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                Download PDF Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [showRegister, setShowRegister] = useState(false);
  const [patientToken, setPatientToken] = useState(null);

  // Check if this is a patient dashboard URL
  useEffect(() => {
    const path = window.location.pathname;
    const patientMatch = path.match(/^\/patient\/(.+)$/);
    if (patientMatch) {
      setPatientToken(patientMatch[1]);
    }
  }, []);

  // If patient token is found, show patient dashboard
  if (patientToken) {
    return <PatientDashboard token={patientToken} />;
  }

  return (
    <AuthProvider>
      <AuthContext.Consumer>
        {({ user }) => {
          if (!user) {
            return showRegister ? (
              <Register onToggle={() => setShowRegister(false)} />
            ) : (
              <Login onToggle={() => setShowRegister(true)} />
            );
          }

          return <Dashboard />;
        }}
      </AuthContext.Consumer>
    </AuthProvider>
  );
}

export default App;