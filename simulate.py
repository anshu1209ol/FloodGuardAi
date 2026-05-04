import time
import requests
import random
import sys

API_URL = "http://127.0.0.1:8000/predict"

def generate_high_risk_data():
    """
    Generates dummy payload that guarantees a HIGH Severity score.
    The maximum values in the dataset normally yield around 0.70-0.72 probability.
    Sending mostly 15s-20s for environmental degradation factors.
    """
    return {
        "MonsoonIntensity": random.uniform(15.0, 20.0),
        "TopographyDrainage": random.uniform(15.0, 20.0),
        "RiverManagement": random.uniform(15.0, 20.0),
        "Deforestation": random.uniform(15.0, 20.0),
        "Urbanization": random.uniform(15.0, 20.0),
        "ClimateChange": random.uniform(15.0, 20.0),
        "DamsQuality": random.uniform(15.0, 20.0),
        "Siltation": random.uniform(15.0, 20.0),
        "AgriculturalPractices": random.uniform(15.0, 20.0),
        "Encroachments": random.uniform(15.0, 20.0),
        "IneffectiveDisasterPreparedness": random.uniform(15.0, 20.0),
        "DrainageSystems": random.uniform(15.0, 20.0),
        "CoastalVulnerability": random.uniform(15.0, 20.0),
        "Landslides": random.uniform(15.0, 20.0),
        "Watersheds": random.uniform(15.0, 20.0),
        "DeterioratingInfrastructure": random.uniform(15.0, 20.0),
        "PopulationScore": random.uniform(15.0, 20.0),
        "WetlandLoss": random.uniform(15.0, 20.0),
        "InadequatePlanning": random.uniform(15.0, 20.0),
        "PoliticalFactors": random.uniform(15.0, 20.0)
    }

def simulate():
    print("Starting Flood Simulation Engine...")
    print("Sending live telemetry to API every 10 seconds.")
    try:
        while True:
            payload = generate_high_risk_data()
            try:
                response = requests.post(API_URL, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    prob = data.get('probability', 0) * 100
                    severity = data.get('severity', 'Unknown')
                    trigger = data.get('trigger_alert', False)
                    print(f"[Live Data Sent] Prob: {prob:.1f}% | Severity: {severity} | Alert Triggered: {trigger}")
                else:
                    print(f"[Error] API returned status code {response.status_code}")
            except requests.exceptions.ConnectionError:
                print("[Connection Error] Ensure the FastAPI server is running on http://127.0.0.1:8000")
            
            time.sleep(10)
    except KeyboardInterrupt:
        print("\nSimulation Stopped by user.")
        sys.exit(0)

if __name__ == "__main__":
    simulate()
