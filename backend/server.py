from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.hash import bcrypt
import base64
import io
from PIL import Image
import json
import google.generativeai as genai
import numpy as np
import cv2
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import tempfile

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configure Gemini API
genai.configure(api_key="AIzaSyAyau1W1wJ8opBbQ0QyqITQs4iRpgN-3lI")

# JWT Settings
JWT_SECRET = "your-secret-key-here"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app without a prefix
app = FastAPI(title="X-AI RadPortal API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ChexNet Labels for mock implementation
CHEXNET_LABELS = [
    'Atelectasis', 'Cardiomegaly', 'Effusion', 'Infiltration', 'Mass',
    'Nodule', 'Pneumonia', 'Pneumothorax', 'Consolidation', 'Edema',
    'Emphysema', 'Fibrosis', 'Pleural_Thickening', 'Hernia'
]

# Anatomical regions for mock segmentation
ANATOMICAL_REGIONS = {
    'upper_left_lung': {'coords': (0, 0, 0.45, 0.6), 'label': 'Upper Left Lung'},
    'lower_left_lung': {'coords': (0, 0.4, 0.45, 1.0), 'label': 'Lower Left Lung'},
    'upper_right_lung': {'coords': (0.55, 0, 1.0, 0.6), 'label': 'Upper Right Lung'},
    'lower_right_lung': {'coords': (0.55, 0.4, 1.0, 1.0), 'label': 'Lower Right Lung'},
    'heart': {'coords': (0.35, 0.3, 0.65, 0.8), 'label': 'Cardiac Region'},
    'mediastinum': {'coords': (0.4, 0.1, 0.6, 0.9), 'label': 'Mediastinum'}
}

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    full_name: str
    role: str = "radiologist"  # "radiologist" or "patient"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "radiologist"

class UserLogin(BaseModel):
    email: str
    password: str

class Patient(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    name: str
    age: int
    gender: str
    clinical_notes: Optional[str] = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PatientCreate(BaseModel):
    patient_id: str
    name: str
    age: int
    gender: str
    clinical_notes: Optional[str] = ""

class Report(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    radiologist_id: str
    image_data: Optional[str] = None  # Base64 encoded image
    ai_generated_report: str = ""
    final_report: str = ""
    pathology_results: Dict[str, Any] = {}
    segmentation_data: Dict[str, Any] = {}
    status: str = "draft"  # "draft", "finalized"
    patient_token: Optional[str] = None  # For patient access
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ReportCreate(BaseModel):
    patient_id: str
    clinical_notes: Optional[str] = ""

class ReportUpdate(BaseModel):
    final_report: Optional[str] = None
    status: Optional[str] = None

class ChatMessage(BaseModel):
    query: str

class ChatResponse(BaseModel):
    response: str

# Helper Functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

async def get_current_user(user_id: str = Depends(verify_token)):
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

# Mock AI Functions
def mock_biomedclip_analysis(image_base64: str) -> str:
    """Mock BiomedCLIP analysis - generates a realistic radiology report"""
    findings = [
        "Chest X-ray demonstrates clear lung fields bilaterally",
        "Heart size appears within normal limits",
        "No acute cardiopulmonary abnormalities identified",
        "Costophrenic angles are sharp",
        "No pleural effusion or pneumothorax detected",
        "Bone structures appear intact"
    ]
    
    # Randomly select 3-4 findings for variation
    import random
    selected_findings = random.sample(findings, random.randint(3, 4))
    
    report = "## AI-Generated Radiology Report\n\n"
    report += "**FINDINGS:**\n"
    for finding in selected_findings:
        report += f"• {finding}\n"
    
    report += "\n**IMPRESSION:**\n"
    report += "• No acute cardiopulmonary abnormalities on this chest radiograph\n"
    report += "• Recommend clinical correlation\n"
    
    return report

def mock_chexnet_analysis(image_base64: str) -> Dict[str, Any]:
    """Mock ChexNet pathology detection"""
    import random
    
    results = {}
    for label in CHEXNET_LABELS:
        probability = random.uniform(0.05, 0.95)
        results[label] = {
            'probability': probability,
            'detected': probability > 0.5
        }
    
    return results

def mock_segmentation_generation(pathology_results: Dict[str, Any]) -> Dict[str, Any]:
    """Mock segmentation map generation"""
    segmentation_maps = {}
    
    for pathology, data in pathology_results.items():
        if data['detected']:
            # Create a simple mock segmentation map (just coordinates for now)
            segmentation_maps[pathology] = {
                'regions': [
                    {
                        'region_id': 1,
                        'anatomical_location': random.choice(list(ANATOMICAL_REGIONS.values()))['label'],
                        'confidence': data['probability'],
                        'bbox': [100, 100, 200, 200]  # Mock bounding box
                    }
                ]
            }
    
    return segmentation_maps

async def gemini_chat(context: str, question: str) -> str:
    """Use Gemini API for Q&A"""
    try:
        model = genai.GenerativeModel('gemini-pro')
        
        system_instruction = "You are an experienced radiologist. Analyze the provided X-ray report and answer questions based solely on the information within the report, providing clear and concise medical insights. Always include appropriate medical disclaimers."
        
        prompt = f"Context: {context}\n\nQuestion: {question}\n\nPlease provide a clear, professional answer based on the medical context provided."
        
        response = model.generate_content(prompt)
        return response.text
        
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return f"I apologize, but I'm unable to process your question at the moment. Please consult with a qualified radiologist for medical advice. Error: {str(e)}"

# API Routes

# Authentication Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    password_hash = bcrypt.hash(user_data.password)
    
    # Create user
    user = User(
        email=user_data.email,
        password_hash=password_hash,
        full_name=user_data.full_name,
        role=user_data.role
    )
    
    await db.users.insert_one(user.dict())
    
    # Create token
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not bcrypt.verify(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"]
        }
    }

# Patient Routes
@api_router.post("/patients", response_model=Patient)
async def create_patient(patient_data: PatientCreate, current_user: User = Depends(get_current_user)):
    patient = Patient(**patient_data.dict())
    await db.patients.insert_one(patient.dict())
    return patient

@api_router.get("/patients/{patient_id}")
async def get_patient_history(patient_id: str, current_user: User = Depends(get_current_user)):
    patient = await db.patients.find_one({"patient_id": patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get patient's report history
    reports = await db.reports.find({"patient_id": patient_id}).to_list(100)
    
    return {
        "patient": Patient(**patient),
        "reports": [Report(**report) for report in reports]
    }

# Report Routes
@api_router.post("/reports")
async def create_report(
    patient_id: str = Form(...),
    clinical_notes: str = Form(""),
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Validate image
    if not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read and process image
    image_data = await image.read()
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    
    # Generate AI analysis
    ai_report = mock_biomedclip_analysis(image_base64)
    pathology_results = mock_chexnet_analysis(image_base64)
    segmentation_data = mock_segmentation_generation(pathology_results)
    
    # Create report
    report = Report(
        patient_id=patient_id,
        radiologist_id=current_user.id,
        image_data=image_base64,
        ai_generated_report=ai_report,
        final_report=ai_report,  # Initially same as AI report
        pathology_results=pathology_results,
        segmentation_data=segmentation_data,
        patient_token=str(uuid.uuid4())  # Generate token for patient access
    )
    
    await db.reports.insert_one(report.dict())
    return report

@api_router.get("/reports/{report_id}")
async def get_report(report_id: str, current_user: User = Depends(get_current_user)):
    report = await db.reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return Report(**report)

@api_router.put("/reports/{report_id}")
async def update_report(
    report_id: str,
    report_update: ReportUpdate,
    current_user: User = Depends(get_current_user)
):
    update_data = report_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.reports.update_one(
        {"id": report_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    updated_report = await db.reports.find_one({"id": report_id})
    return Report(**updated_report)

@api_router.get("/reports/{report_id}/export")
async def export_report(report_id: str, format: str = "pdf", current_user: User = Depends(get_current_user)):
    report = await db.reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if format == "pdf":
        # Create PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            c = canvas.Canvas(tmp_file.name, pagesize=letter)
            
            # Title
            c.setFont("Helvetica-Bold", 16)
            c.drawString(50, 750, "X-Ray Analysis Report")
            
            # Report content
            c.setFont("Helvetica", 12)
            y_position = 700
            
            # Split report text and add to PDF
            lines = report["final_report"].split('\n')
            for line in lines:
                if y_position < 50:
                    c.showPage()
                    y_position = 750
                c.drawString(50, y_position, line[:80])  # Limit line length
                y_position -= 20
            
            c.save()
            
            return FileResponse(
                tmp_file.name,
                media_type='application/pdf',
                filename=f'report_{report_id}.pdf'
            )
    
    elif format == "json":
        return Report(**report)

# Patient Dashboard Routes (Public access with token)
@api_router.get("/public/view/{token}")
async def get_report_by_token(token: str):
    report = await db.reports.find_one({"patient_token": token})
    if not report:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    
    # Get patient info
    patient = await db.patients.find_one({"patient_id": report["patient_id"]})
    
    return {
        "report": Report(**report),
        "patient": Patient(**patient) if patient else None
    }

@api_router.post("/public/chat/{token}")
async def chat_with_report(token: str, message: ChatMessage):
    report = await db.reports.find_one({"patient_token": token})
    if not report:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    
    # Use Gemini API for Q&A
    response = await gemini_chat(report["final_report"], message.query)
    
    return ChatResponse(response=response)

# PDF Upload and Text Extraction Route
@api_router.post("/reports/upload-pdf")
async def upload_pdf_report(
    pdf_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if not pdf_file.content_type == 'application/pdf':
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    # Read PDF content
    pdf_content = await pdf_file.read()
    
    # For now, we'll create a simple text extraction
    # In a real implementation, you'd use a library like PyPDF2 or pdfplumber
    extracted_text = f"Extracted text from {pdf_file.filename}\n\nThis is a mock implementation. In production, actual PDF text extraction would be performed here."
    
    # Store the extracted report
    report = Report(
        patient_id="UPLOAD-" + str(uuid.uuid4())[:8],
        radiologist_id=current_user.id,
        ai_generated_report=extracted_text,
        final_report=extracted_text,
        status="finalized",
        patient_token=str(uuid.uuid4())
    )
    
    await db.reports.insert_one(report.dict())
    
    return {
        "report_id": report.id,
        "extracted_text": extracted_text,
        "message": "PDF uploaded and text extracted successfully"
    }

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()