import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import time

print("--- Step 1: Data Acquisition & Environment Setup ---")
# Load the dataset
try:
    df = pd.read_csv('flood_prediction.csv')
    print(f"Dataset loaded successfully. Shape: {df.shape}")
except Exception as e:
    print(f"Error loading file: {e}")
    exit()

# Basic Check
print("\n--- The Check: .head() and .info() ---")
print(df.head())
print(df.info())

print("\n--- Step 2: Data Pre-Processing ---")
# Handle Nulls
imputer = SimpleImputer(strategy='mean')
# We impute all columns except id and FloodProbability
features_to_impute = df.columns.drop(['id', 'FloodProbability'])
df[features_to_impute] = imputer.fit_transform(df[features_to_impute])
print("Null values handled (if any).")

# Feature Selection
X = df[features_to_impute]
y = df['FloodProbability']

# Scaling
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
print("Data scaled using StandardScaler.")

print("\n--- Step 3: Model Architecture & Training ---")
# The Split (80/20)
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
print(f"Data split into 80% train ({len(X_train)}) and 20% test ({len(X_test)}).")

# The Choice: RandomForestRegressor
# Using n_jobs=-1 to utilize all cores and speed up training
model = RandomForestRegressor(n_estimators=100, n_jobs=-1, random_state=42, verbose=1)

print("Starting training (this may take a few minutes)...")
start_time = time.time()
model.fit(X_train, y_train)
end_time = time.time()
print(f"Training completed in {end_time - start_time:.2f} seconds.")

print("\n--- Step 4: Evaluation & Brain Storage ---")
# The Test
y_pred = model.predict(X_test)

# Metrics
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"Mean Absolute Error (MAE): {mae:.4f}")
print(f"R2 Score: {r2:.4f}")

if r2 > 0.85:
    print("Pass: R2 Score is above 0.85.")
else:
    print("Fail: R2 Score is below 0.85 (Check features or hyperparams).")

# The Export
import os
os.makedirs('models', exist_ok=True)
joblib.dump(model, os.path.join('models', 'flood_model.pkl'))
joblib.dump(scaler, os.path.join('models', 'scaler.pkl'))
print("Model and Scaler exported as flood_model.pkl and scaler.pkl into /models folder.")
