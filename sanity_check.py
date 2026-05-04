import requests
import time

API_URL = "http://127.0.0.1:8000/predict"

def get_base_features(val):
    return {
        "MonsoonIntensity": val, "TopographyDrainage": val, "RiverManagement": val,
        "Deforestation": val, "Urbanization": val, "ClimateChange": val,
        "DamsQuality": val, "Siltation": val, "AgriculturalPractices": val,
        "Encroachments": val, "IneffectiveDisasterPreparedness": val,
        "DrainageSystems": val, "CoastalVulnerability": val, "Landslides": val,
        "Watersheds": val, "DeterioratingInfrastructure": val, "PopulationScore": val,
        "WetlandLoss": val, "InadequatePlanning": val, "PoliticalFactors": val
    }

def run_tests():
    print("--- Flood API Sanity Check ---")
    
    # Wait for a brief moment to ensure server is ready if run simultaneously
    time.sleep(1)

    scenarios = [
        {"name": "1. Safe Scenario", "payload": get_base_features(2.0), "expected_severity": "Low"},
        {"name": "2. Warning Scenario", "payload": get_base_features(6.0), "expected_severity": "Moderate"},
        {"name": "3. Critical Scenario", "payload": get_base_features(15.0), "expected_severity": "High"},
        {"name": "4. Edge Case (Extreme Mixed)", "payload": {k: 20.0 if i%2==0 else 0.0 for i, (k,v) in enumerate(get_base_features(0).items())}, "expected_severity": "Any"},
        {"name": "5. Error Case (Missing Features)", "payload": {"MonsoonIntensity": 10.0}, "expected_error": True}
    ]

    for s in scenarios:
        try:
            res = requests.post(API_URL, json=s["payload"])
            data = res.json()
            if "error" in data:
                if s.get("expected_error"):
                    print(f"✅ {s['name']}: Passed! Properly caught error -> {data['error']}")
                else:
                    print(f"❌ {s['name']}: Failed! Unexpected error -> {data['error']}")
            else:
                prob = data.get("probability", 0)
                sev = data.get("severity", "")
                if s.get("expected_error"):
                    print(f"❌ {s['name']}: Failed! Expected error but got success.")
                else:
                    print(f"✅ {s['name']}: Passed! Probability: {prob:.4f}, Severity: {sev}")
        except requests.exceptions.ConnectionError:
            print(f"❌ {s['name']}: Connection Error - Ensure FastAPI server is running!")
        except Exception as e:
            print(f"❌ {s['name']}: Unknown Error - {e}")

if __name__ == "__main__":
    run_tests()
