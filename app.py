import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import joblib
import pandas as pd

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app) # Enable CORS just in case

MODEL_PATH = 'wastage_model.pkl'
COLUMNS_PATH = 'model_columns.pkl'

# Load model and columns globally if they exist
model = None
model_columns = None

if os.path.exists(MODEL_PATH) and os.path.exists(COLUMNS_PATH):
    print("Loading ML model...")
    model = joblib.load(MODEL_PATH)
    model_columns = joblib.load(COLUMNS_PATH)
else:
    print("Warning: Model files not found. Predictions will fail.")

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/predict', methods=['POST'])
def predict_wastage():
    if model is None or model_columns is None:
        return jsonify({'status': 'error', 'message': 'ML Model not trained or loaded. Please run train_api_model.py'}), 500
        
    try:
        data = request.json
        # Convert dictionary to DataFrame
        input_df = pd.DataFrame([data])
        
        # One-hot encode exactly as training did
        input_encoded = pd.get_dummies(input_df)
        
        # Align with the training features (pad missing columns with 0)
        input_query = input_encoded.reindex(columns=model_columns, fill_value=0)
        
        # Predict
        prediction = model.predict(input_query)
        
        return jsonify({
            'status': 'success',
            'predicted_wastage': float(prediction[0])
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    # Local development server or production port
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)
