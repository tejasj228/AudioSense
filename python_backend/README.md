# Audio Visualization Python Backend

This Python Flask server generates audio visualizations (waveform, spectrogram, and spectrum analysis) for the AudioSense application.

## Setup

1. Install Python dependencies:
```bash
cd python_backend
pip install -r requirements.txt
```

## Running the Server

Start the Flask server:
```bash
python server.py
```

The server will run on `http://localhost:5000`

## API Endpoints

### POST /api/visualize
Upload an audio file to generate visualizations.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: audio file (field name: 'audio')

**Response:**
```json
{
  "success": true,
  "visualizations": {
    "waveform": {
      "image": "base64_encoded_image",
      "insight": "Analysis insight text",
      "metrics": {...}
    },
    "spectrogram": {
      "image": "base64_encoded_image",
      "insight": "Analysis insight text",
      "metrics": {...}
    },
    "spectrum": {
      "image": "base64_encoded_image",
      "insight": "Analysis insight text",
      "metrics": {...}
    }
  }
}
```

### GET /health
Health check endpoint.

## Features

- **Waveform Analysis**: Displays amplitude over time with dynamic range insights
- **Spectrogram**: Shows frequency content over time with spectral centroid analysis
- **Spectrum Analysis**: FFT-based frequency distribution with bass/mid/treble breakdown

All visualizations are generated with transparent backgrounds to match the AudioSense UI design.
