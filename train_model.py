import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os

def train_model():
    print("--- Step 1: Loading Data ---")
    try:
        # Load the 'Flood Prediction Dataset'
        df = pd.read_csv('flood_prediction.csv')
        print(f"Data loaded successfully. Shape: {df.shape}")
    except Exception as e:
        print(f"Error loading data: {e}")
        return

    print("--- Step 2: Data Preprocessing ---")
    # Handling missing values
    # We impute the mean for any missing features just in case
    imputer = SimpleImputer(strategy='mean')
    
    # We select all features except the identifier ('id') and target ('FloodProbability')
    # Ensuring data types are correct: converting to numeric if not already
    features_to_impute = df.columns.drop(['id', 'FloodProbability'])
    
    for col in features_to_impute:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        
    df[features_to_impute] = imputer.fit_transform(df[features_to_impute])
    print("Handled missing values.")

    # Separation of features and target
    X = df[features_to_impute]
    y = pd.to_numeric(df['FloodProbability'], errors='coerce')
    
    # Using StandardScaler to normalize all features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    print("Features normalized using StandardScaler.")

    print("--- Step 3: Model Training ---")
    # Split the data 80/20 for training and testing
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
    print("Data split 80/20 successfully.")

    # Train a RandomForestRegressor
    print("Training RandomForestRegressor...")
    model = RandomForestRegressor(n_estimators=100, n_jobs=-1, random_state=42)
    model.fit(X_train, y_train)
    print("Training completed.")

    print("--- Step 4: Evaluation ---")
    # Make predictions on test set
    y_pred = model.predict(X_test)
    
    # Calculate R2 Score and Mean Absolute Error
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    
    print(f"Evaluation Results:")
    print(f"R^2 Score: {r2:.4f}")
    print(f"Mean Absolute Error (MAE): {mae:.4f}")

    print("--- Step 5: Exporting Models ---")
    # Create the /models directory if it doesn't exist
    os.makedirs('models', exist_ok=True)
    
    # Save the trained model and scaler
    model_path = os.path.join('models', 'flood_model.pkl')
    scaler_path = os.path.join('models', 'scaler.pkl')
    
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    
    print(f"Successfully exported model to {model_path} and scaler to {scaler_path}.")

if __name__ == "__main__":
    train_model()
