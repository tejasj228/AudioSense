from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import tempfile
import base64
import json

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": "*"}})

@app.route('/api/visualize', methods=['POST'])
def visualize_audio():
    """
    Endpoint to receive audio file and return visualizations
    """
    try:
        print("📥 Received request to /api/visualize")
        
        # Check if file is present
        if 'audio' not in request.files:
            print("❌ No audio file in request")
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        print(f"📁 File received: {audio_file.filename}")
        
        if audio_file.filename == '':
            print("❌ Empty filename")
            return jsonify({'error': 'No file selected'}), 400
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.filename)[1]) as tmp_file:
            audio_file.save(tmp_file.name)
            tmp_path = tmp_file.name
            print(f"💾 Saved to: {tmp_path}")
        
        try:
            print("🎨 Starting visualization generation...")
            
            # Import here to catch any import errors
            from analyze_audio import analyze_audio_file
            
            # Generate visualizations
            results = analyze_audio_file(tmp_path)
            print("✅ Visualizations generated successfully")
            
            # Clean up temp file
            os.unlink(tmp_path)
            
            # Check if all visualizations were generated successfully
            if not results['waveform'] or not results['spectrogram'] or not results['spectrum']:
                print("⚠️ Some visualizations failed to generate")
                return jsonify({'error': 'Failed to generate one or more visualizations'}), 500
            
            print("🎉 Returning success response")
            return jsonify({
                'success': True,
                'visualizations': results
            })
        
        except Exception as e:
            # Clean up temp file in case of error
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            print(f"💥 Error during processing: {e}")
            import traceback
            traceback.print_exc()
            raise e
    
    except Exception as e:
        print(f"❌ Error in visualize_audio: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/process-audio', methods=['POST'])
def process_audio():
    """
    Endpoint to apply audio modifications and return processed audio
    """
    try:
        print("🎵 Received request to /api/process-audio")
        
        # Check if file is present
        if 'audio' not in request.files:
            print("❌ No audio file in request")
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        print(f"📁 File received: {audio_file.filename}")
        
        # Get processing parameters
        params_json = request.form.get('params', '{}')
        params = json.loads(params_json)
        print(f"⚙️ Parameters: {params}")
        
        if audio_file.filename == '':
            print("❌ Empty filename")
            return jsonify({'error': 'No file selected'}), 400
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.filename)[1]) as tmp_file:
            audio_file.save(tmp_file.name)
            tmp_path = tmp_file.name
            print(f"💾 Saved to: {tmp_path}")
        
        try:
            print("🎨 Starting audio processing...")
            
            # Import here to catch any import errors
            from process_audio import process_audio_file
            
            # Process audio with parameters
            output_path = process_audio_file(tmp_path, params)
            print("✅ Audio processed successfully")
            
            # Clean up input temp file
            os.unlink(tmp_path)
            
            # Return the processed audio file
            return send_file(
                output_path,
                mimetype='audio/wav',
                as_attachment=True,
                download_name='processed_audio.wav'
            )
        
        except Exception as e:
            # Clean up temp file in case of error
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            print(f"💥 Error during processing: {e}")
            import traceback
            traceback.print_exc()
            raise e
    
    except Exception as e:
        print(f"❌ Error in process_audio: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/apply-dataset', methods=['POST'])
def apply_dataset_modifications():
    """
    Endpoint to apply dataset modifications to audio
    Receives: audio file + modified CSV dataset
    Returns: processed audio + updated CSV
    """
    try:
        print("📊 Received request to /api/apply-dataset")
        
        # Check if file is present
        if 'audio' not in request.files:
            print("❌ No audio file in request")
            return jsonify({'error': 'No audio file provided'}), 400
        
        if 'dataset' not in request.files:
            print("❌ No dataset file in request")
            return jsonify({'error': 'No dataset file provided'}), 400
        
        audio_file = request.files['audio']
        dataset_file = request.files['dataset']
        print(f"📁 Audio: {audio_file.filename}, Dataset: {dataset_file.filename}")
        
        # Save to temporary files
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.filename)[1]) as tmp_audio:
            audio_file.save(tmp_audio.name)
            audio_path = tmp_audio.name
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv', mode='w') as tmp_dataset:
            dataset_content = dataset_file.read().decode('utf-8')
            tmp_dataset.write(dataset_content)
            dataset_path = tmp_dataset.name
        
        try:
            print("🎨 Applying dataset modifications to audio...")
            
            from apply_dataset import apply_dataset_to_audio
            
            # Apply dataset modifications
            output_audio_path, output_dataset_path = apply_dataset_to_audio(audio_path, dataset_path)
            print("✅ Dataset applied successfully")
            
            # Clean up input temp files
            os.unlink(audio_path)
            os.unlink(dataset_path)
            
            # Return the processed audio file
            return send_file(
                output_audio_path,
                mimetype='audio/wav',
                as_attachment=True,
                download_name='modified_audio.wav'
            )
        
        except Exception as e:
            # Clean up temp files in case of error
            if os.path.exists(audio_path):
                os.unlink(audio_path)
            if os.path.exists(dataset_path):
                os.unlink(dataset_path)
            print(f"💥 Error during processing: {e}")
            import traceback
            traceback.print_exc()
            raise e
    
    except Exception as e:
        print(f"❌ Error in apply_dataset_modifications: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'audio-visualization'})

if __name__ == '__main__':
    print("🎵 Audio Visualization Server Starting...")
    print("📊 Endpoints available:")
    print("   - POST /api/visualize (upload audio for analysis)")
    print("   - POST /api/process-audio (process audio with modifications)")
    print("   - GET /health (health check)")
    print("\n🚀 Server running on http://localhost:5000")
    print("🔍 Debug mode: ON - detailed error logging enabled\n")
    app.run(host='0.0.0.0', port=5001, debug=True, use_reloader=False)
