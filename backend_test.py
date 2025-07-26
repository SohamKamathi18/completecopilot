#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for X-AI RadPortal
Tests all FastAPI endpoints with proper authentication and data flow
"""

import requests
import sys
import json
import base64
import io
from datetime import datetime
from pathlib import Path

class RadPortalAPITester:
    def __init__(self, base_url="https://1b4ee4c9-9fc9-4c9f-a5f1-dcf2a608661e.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'users': [],
            'patients': [],
            'reports': []
        }

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        if details:
            print(f"   Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)
        
        if files:
            # Remove Content-Type for multipart requests
            test_headers.pop('Content-Type', None)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=test_headers)
                else:
                    response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True, f"Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                error_detail = ""
                try:
                    error_data = response.json()
                    error_detail = error_data.get('detail', str(error_data))
                except:
                    error_detail = response.text[:200]
                
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Error: {error_detail}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_register_user(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "email": f"test_radiologist_{timestamp}@hospital.com",
            "password": "TestPass123!",
            "full_name": f"Dr. Test Radiologist {timestamp}",
            "role": "radiologist"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.created_resources['users'].append(response['user'])
            print(f"   Registered user: {user_data['email']}")
            print(f"   User ID: {self.user_id}")
        
        return success

    def test_login_user(self):
        """Test user login with existing user"""
        if not self.created_resources['users']:
            return False
        
        user = self.created_resources['users'][0]
        login_data = {
            "email": user['email'],
            "password": "TestPass123!"  # We know this from registration
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            # Update token (should be same as registration)
            self.token = response['access_token']
            print(f"   Logged in as: {user['email']}")
        
        return success

    def test_create_patient(self):
        """Test patient creation"""
        timestamp = datetime.now().strftime('%H%M%S')
        patient_data = {
            "patient_id": f"P{timestamp}",
            "name": f"Test Patient {timestamp}",
            "age": 45,
            "gender": "Male",
            "clinical_notes": "Patient presents with chest pain and shortness of breath"
        }
        
        success, response = self.run_test(
            "Create Patient",
            "POST",
            "patients",
            200,
            data=patient_data
        )
        
        if success:
            self.created_resources['patients'].append(response)
            print(f"   Created patient: {patient_data['patient_id']}")
        
        return success

    def test_get_patient_history(self):
        """Test getting patient history"""
        if not self.created_resources['patients']:
            return False
        
        patient = self.created_resources['patients'][0]
        patient_id = patient['patient_id']
        
        success, response = self.run_test(
            "Get Patient History",
            "GET",
            f"patients/{patient_id}",
            200
        )
        
        if success:
            print(f"   Retrieved history for patient: {patient_id}")
            print(f"   Reports count: {len(response.get('reports', []))}")
        
        return success

    def create_test_image(self):
        """Create a simple test image in base64 format"""
        # Create a simple 100x100 black image
        from PIL import Image
        import io
        
        img = Image.new('RGB', (100, 100), color='black')
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='JPEG')
        img_buffer.seek(0)
        
        return img_buffer

    def test_create_report(self):
        """Test report creation with image upload"""
        if not self.created_resources['patients']:
            return False
        
        patient = self.created_resources['patients'][0]
        
        # Create test image
        try:
            img_buffer = self.create_test_image()
            
            # Prepare multipart form data
            form_data = {
                'patient_id': patient['patient_id'],
                'clinical_notes': 'Test clinical notes for X-ray analysis'
            }
            
            files = {
                'image': ('test_xray.jpg', img_buffer, 'image/jpeg')
            }
            
            success, response = self.run_test(
                "Create Report with Image",
                "POST",
                "reports",
                200,
                data=form_data,
                files=files
            )
            
            if success:
                self.created_resources['reports'].append(response)
                print(f"   Created report ID: {response.get('id')}")
                print(f"   Patient token: {response.get('patient_token')}")
                print(f"   AI report length: {len(response.get('ai_generated_report', ''))}")
            
            return success
            
        except Exception as e:
            self.log_test("Create Report with Image", False, f"Image creation error: {str(e)}")
            return False

    def test_get_report(self):
        """Test getting report details"""
        if not self.created_resources['reports']:
            return False
        
        report = self.created_resources['reports'][0]
        report_id = report['id']
        
        success, response = self.run_test(
            "Get Report Details",
            "GET",
            f"reports/{report_id}",
            200
        )
        
        if success:
            print(f"   Retrieved report: {report_id}")
            print(f"   Status: {response.get('status')}")
            print(f"   Has image data: {'image_data' in response}")
        
        return success

    def test_update_report(self):
        """Test updating report content"""
        if not self.created_resources['reports']:
            return False
        
        report = self.created_resources['reports'][0]
        report_id = report['id']
        
        update_data = {
            "final_report": "Updated report content with radiologist review and findings.",
            "status": "finalized"
        }
        
        success, response = self.run_test(
            "Update Report",
            "PUT",
            f"reports/{report_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   Updated report: {report_id}")
            print(f"   New status: {response.get('status')}")
        
        return success

    def test_export_report_pdf(self):
        """Test PDF export functionality"""
        if not self.created_resources['reports']:
            return False
        
        report = self.created_resources['reports'][0]
        report_id = report['id']
        
        # Test PDF export
        url = f"{self.base_url}/reports/{report_id}/export?format=pdf"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        print(f"\n🔍 Testing Export Report as PDF...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url, headers=headers)
            success = response.status_code == 200
            
            if success:
                content_type = response.headers.get('content-type', '')
                is_pdf = 'application/pdf' in content_type
                self.log_test("Export Report as PDF", is_pdf, f"Content-Type: {content_type}, Size: {len(response.content)} bytes")
                return is_pdf
            else:
                self.log_test("Export Report as PDF", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Export Report as PDF", False, f"Exception: {str(e)}")
            return False

    def test_public_view_report(self):
        """Test public report viewing via token"""
        if not self.created_resources['reports']:
            return False
        
        report = self.created_resources['reports'][0]
        patient_token = report['patient_token']
        
        success, response = self.run_test(
            "Public View Report",
            "GET",
            f"public/view/{patient_token}",
            200
        )
        
        if success:
            print(f"   Accessed report via token: {patient_token}")
            print(f"   Has patient data: {'patient' in response}")
            print(f"   Has report data: {'report' in response}")
        
        return success

    def test_public_chat(self):
        """Test AI chatbot functionality"""
        if not self.created_resources['reports']:
            return False
        
        report = self.created_resources['reports'][0]
        patient_token = report['patient_token']
        
        chat_data = {
            "query": "What does this X-ray report show? Are there any concerning findings?"
        }
        
        success, response = self.run_test(
            "Public Chat with AI",
            "POST",
            f"public/chat/{patient_token}",
            200,
            data=chat_data
        )
        
        if success:
            print(f"   AI response length: {len(response.get('response', ''))}")
            print(f"   Response preview: {response.get('response', '')[:100]}...")
        
        return success

    def test_pdf_upload(self):
        """Test PDF upload and text extraction"""
        # Create a simple test PDF content (mock)
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF"
        
        files = {
            'pdf_file': ('test_report.pdf', io.BytesIO(pdf_content), 'application/pdf')
        }
        
        success, response = self.run_test(
            "Upload PDF Report",
            "POST",
            "reports/upload-pdf",
            200,
            files=files
        )
        
        if success:
            print(f"   Uploaded PDF report ID: {response.get('report_id')}")
            print(f"   Extracted text length: {len(response.get('extracted_text', ''))}")
        
        return success

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting X-AI RadPortal API Testing Suite")
        print("=" * 60)
        
        # Test sequence
        tests = [
            ("Health Check", self.test_health_check),
            ("User Registration", self.test_register_user),
            ("User Login", self.test_login_user),
            ("Create Patient", self.test_create_patient),
            ("Get Patient History", self.test_get_patient_history),
            ("Create Report", self.test_create_report),
            ("Get Report", self.test_get_report),
            ("Update Report", self.test_update_report),
            ("Export Report PDF", self.test_export_report_pdf),
            ("Public View Report", self.test_public_view_report),
            ("Public Chat AI", self.test_public_chat),
            ("Upload PDF", self.test_pdf_upload),
        ]
        
        for test_name, test_func in tests:
            try:
                test_func()
            except Exception as e:
                self.log_test(test_name, False, f"Unexpected error: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.created_resources['reports']:
            print(f"\n📋 Created Resources:")
            print(f"Users: {len(self.created_resources['users'])}")
            print(f"Patients: {len(self.created_resources['patients'])}")
            print(f"Reports: {len(self.created_resources['reports'])}")
            
            if self.created_resources['reports']:
                report = self.created_resources['reports'][0]
                print(f"\n🔗 Patient Access URL:")
                print(f"https://1b4ee4c9-9fc9-4c9f-a5f1-dcf2a608661e.preview.emergentagent.com/patient/{report['patient_token']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    print("X-AI RadPortal Backend API Testing")
    print("Testing against: https://1b4ee4c9-9fc9-4c9f-a5f1-dcf2a608661e.preview.emergentagent.com/api")
    
    tester = RadPortalAPITester()
    success = tester.run_all_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())