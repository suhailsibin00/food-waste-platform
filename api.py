from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import joblib
import pandas as pd
import os

MODEL_PATH = 'wastage_model.pkl'
COLUMNS_PATH = 'model_columns.pkl'

# Initialize globals
model = None
model_columns = None

class PredictionHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With, Content-type")
        self.end_headers()

    def do_POST(self):
        if self.path == '/predict':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                # Parse JSON payload
                data = json.loads(post_data.decode('utf-8'))
                
                # Default input dict mapped roughly to features
                # We need to create a DataFrame with 1 row matching the training columns
                input_df = pd.DataFrame([data])
                
                # Create dummy variables
                input_encoded = pd.get_dummies(input_df)
                
                # Re-index to ensure all columns from training exist (fill missing with 0)
                input_query = input_encoded.reindex(columns=model_columns, fill_value=0)
                
                # Make prediction
                prediction = model.predict(input_query)
                
                # Respond
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    'status': 'success',
                    'predicted_wastage': float(prediction[0])
                }
                self.wfile.write(json.dumps(response).encode())
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                error_response = {'status': 'error', 'message': str(e)}
                self.wfile.write(json.dumps(error_response).encode())

def run_server(port=8001):
    global model, model_columns
    
    if not os.path.exists(MODEL_PATH) or not os.path.exists(COLUMNS_PATH):
        print("Model files not found. Please run train_api_model.py first.")
        return
        
    print("Loading model...")
    model = joblib.load(MODEL_PATH)
    model_columns = joblib.load(COLUMNS_PATH)
    
    server_address = ('', port)
    httpd = HTTPServer(server_address, PredictionHandler)
    print(f"AI Prediction API running on port {port}...")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
