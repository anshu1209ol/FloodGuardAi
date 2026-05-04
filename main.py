from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import os
import smtplib
from email.message import EmailMessage

app = FastAPI(title="Flood Prediction API")

# Setup CORS to allow the frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Load model and scaler once on startup
MODEL_PATH = os.path.join("models", "flood_model.pkl")
SCALER_PATH = os.path.join("models", "scaler.pkl")

# These will be initialized in the startup event
model = None
scaler = None
latest_prediction = None

@app.on_event("startup")
def load_assets():
    global model, scaler
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        print("Model and Scaler loaded successfully.")
    else:
        print("Warning: Model or Scaler not found in /models/ folder.")

def send_email_alert(probability: float, severity: str):
    """
    Sends an automated Flood Warning email when the severity is HIGH.
    Note: Replace with real credentials in production.
    """
    try:
        # Example dummy config for SMTP
        sender_email = "alert@floodsystem.local"
        receiver_email = "admin@floodsystem.local"
        
        msg = EmailMessage()
        msg.set_content(f"CRITICAL FLOOD WARNING: Severity is {severity} with a probability of {(probability*100):.1f}%. Immediate action required!")
        msg["Subject"] = "🚨 FLOOD WARNING ALERT"
        msg["From"] = sender_email
        msg["To"] = receiver_email

        # In a real scenario, you would connect to a real SMTP server like so:
        # with smtplib.SMTP("smtp.example.com", 587) as server:
        #     server.login("user", "password")
        #     server.send_message(msg)
        
        print(f"📧 [EMAIL SENT to {receiver_email}] Subject: {msg['Subject']}")
    except Exception as e:
        print(f"Failed to send email alert: {e}")

# Define Request Schema
class FloodFeatures(BaseModel):
    MonsoonIntensity: float
    TopographyDrainage: float
    RiverManagement: float
    Deforestation: float
    Urbanization: float
    ClimateChange: float
    DamsQuality: float
    Siltation: float
    AgriculturalPractices: float
    Encroachments: float
    IneffectiveDisasterPreparedness: float
    DrainageSystems: float
    CoastalVulnerability: float
    Landslides: float
    Watersheds: float
    DeterioratingInfrastructure: float
    PopulationScore: float
    WetlandLoss: float
    InadequatePlanning: float
    PoliticalFactors: float

def calculate_severity(probability: float):
    """
    Categorize the risk:
    Low < 0.4
    Moderate 0.4 - 0.7
    High > 0.7
    Returns severity, alert_color, and trigger_alert boolean
    """
    if probability < 0.4:
        return "Low", "green", False
    elif probability <= 0.7:
        return "Moderate", "yellow", False
    else:
        return "High", "red", True

@app.post("/predict")
def predict_flood(features: FloodFeatures, background_tasks: BackgroundTasks):
    global latest_prediction
    if model is None or scaler is None:
        return {"error": "Model or scaler not loaded."}
        
    try:
        # Convert input to dictionary
        feature_dict = features.dict()
        
        # Verify feature count
        if len(feature_dict) != 20:
            return {"error": f"Mismatched feature count. Expected 20, got {len(feature_dict)}"}
            
        # Convert input to DataFrame to maintain column names if required
        input_data = pd.DataFrame([feature_dict])
        
        # Scale the input
        scaled_features = scaler.transform(input_data)
        
        # Predict probability
        probability = float(model.predict(scaled_features)[0])
        
        # Determine severity
        severity, alert_color, trigger_alert = calculate_severity(probability)
        
        result = {
            "probability": probability,
            "severity": severity,
            "alert_color": alert_color,
            "trigger_alert": trigger_alert
        }
        
        # Save globally for dashboard to fetch
        latest_prediction = result
        
        # Send Email Alert in background if High Risk
        if trigger_alert:
            background_tasks.add_task(send_email_alert, probability, severity)
        
        return result
    except ValueError as e:
        return {"error": f"Invalid input values: {str(e)}"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/latest")
def get_latest_prediction():
    if latest_prediction is None:
        return {"status": "No predictions made yet."}
    return latest_prediction

@app.get("/")
def read_root():
    return {"message": "Flood Prediction API is running. Send POST requests to /predict."}
