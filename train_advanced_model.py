import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error
import joblib
import os
import matplotlib.pyplot as plt

def train_advanced_model():
    print("--- Stage 1: Advanced Data Ingestion ---")
    try:
        df = pd.read_csv('flood_prediction.csv')
        print(f"Dataset loaded. Records: {len(df)}")
    except Exception as e:
        print(f"Error: {e}")
        return

    print("--- Stage 2: Feature Engineering & Preprocessing ---")
    features = df.columns.drop(['id', 'FloodProbability'])
    
    # Imputation & Conversion
    imputer = SimpleImputer(strategy='median') # Using median for robustness
    df[features] = imputer.fit_transform(df[features])
    
    X = df[features]
    y = df['FloodProbability']
    
    # Scaling
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
    print(f"Data split: Train={len(X_train)}, Test={len(X_test)}")

    print("--- Stage 3: Training Ensemble (RF + XGBoost) ---")
    
    # 1. Random Forest
    print("Training Random Forest Component...")
    rf_model = RandomForestRegressor(n_estimators=100, max_depth=10, n_jobs=-1, random_state=42)
    rf_model.fit(X_train, y_train)
    
    # 2. XGBoost
    print("Training XGBoost Component...")
    xgb_model = XGBRegressor(n_estimators=200, learning_rate=0.05, max_depth=6, n_jobs=-1, random_state=42)
    xgb_model.fit(X_train, y_train)
    
    print("Models trained. Calculating weights...")
    
    # Simple weighted ensemble (can be optimized with a meta-learner later)
    # We'll use them separately in main.py for a "Consensus" score
    
    print("--- Stage 4: Comprehensive Evaluation ---")
    rf_pred = rf_model.predict(X_test)
    xgb_pred = xgb_model.predict(X_test)
    
    # Ensemble Prediction (50/50)
    ensemble_pred = (rf_pred + xgb_pred) / 2
    
    print(f"RF R2 Score: {r2_score(y_test, rf_pred):.4f}")
    print(f"XGB R2 Score: {r2_score(y_test, xgb_pred):.4f}")
    print(f"Ensemble R2 Score: {r2_score(y_test, ensemble_pred):.4f}")
    print(f"Ensemble MAE: {mean_absolute_error(y_test, ensemble_pred):.4f}")
    print(f"Ensemble RMSE: {np.sqrt(mean_squared_error(y_test, ensemble_pred)):.4f}")

    print("--- Stage 5: Exporting Production Assets ---")
    os.makedirs('models', exist_ok=True)
    
    # We'll export the XGBoost model as the primary one for its speed and accuracy
    joblib.dump(xgb_model, os.path.join('models', 'flood_model.pkl'))
    joblib.dump(scaler, os.path.join('models', 'scaler.pkl'))
    
    # Save feature names for reference in API
    joblib.dump(list(features), os.path.join('models', 'features.pkl'))
    
    print("Export complete. System ready for production deployment.")

    # Optional: Feature Importance Plot
    importance = xgb_model.feature_importances_
    feat_importances = pd.Series(importance, index=features)
    feat_importances.nlargest(10).plot(kind='barh', color='teal')
    plt.title('Top 10 Risk Factors (XGBoost)')
    plt.savefig('images/feature_importance.png')
    print("Feature importance chart saved to images/feature_importance.png")

if __name__ == "__main__":
    train_advanced_model()
