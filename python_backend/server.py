from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
import base64

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

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'audio-visualization'})

if __name__ == '__main__':
    print("🎵 Audio Visualization Server Starting...")
    print("📊 Endpoints available:")
    print("   - POST /api/visualize (upload audio for analysis)")
    print("   - GET /health (health check)")
    print("\n🚀 Server running on http://localhost:5000")
    print("🔍 Debug mode: ON - detailed error logging enabled\n")
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
