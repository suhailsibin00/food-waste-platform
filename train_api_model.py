import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

def build_model():
    print("Building fresh predictive model...")
    # Assume data is in Downloads or relative
    data_path = r'C:\Users\ELCOT\Downloads\food_wastage_data.csv'
    
    if not os.path.exists(data_path):
        print(f"Error: Could not find training data at {data_path}")
        return None
        
    df = pd.read_csv(data_path)
    df_encoded = pd.get_dummies(df, drop_first=True)
    
    X = df_encoded.drop('Wastage Food Amount', axis=1)
    y = df_encoded['Wastage Food Amount']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Save the model and training columns so we can structure queries correctly
    joblib.dump(model, 'wastage_model.pkl')
    joblib.dump(list(X.columns), 'model_columns.pkl')
    print("Model built and saved successfully.")
    return model, list(X.columns)

if __name__ == '__main__':
    build_model()
