import librosa
import soundfile as sf
import numpy as np
from scipy import signal
import tempfile
import os

def process_audio_file(audio_path, params):
    """
    Process audio file with the given parameters
    
    Parameters:
    - loudness: dB adjustment (-20 to +20)
    - bass: dB adjustment (-12 to +12)
    - treble: dB adjustment (-12 to +12)
    - pitch: semitones adjustment (-12 to +12)
    - timeRange: [start, end] in seconds
    - preview: boolean (if True, only export the time range)
    """
    print(f"🎵 Loading audio: {audio_path}")
    
    # Load audio
    y, sr = librosa.load(audio_path, sr=None, mono=False)
    
    # Handle stereo/mono
    if len(y.shape) == 1:
        y = y.reshape(1, -1)
        is_mono = True
    else:
        is_mono = False
    
    print(f"✅ Audio loaded: {y.shape[1] / sr:.2f}s at {sr}Hz")
    
    # Extract parameters
    loudness = params.get('loudness', 0)
    bass = params.get('bass', 0)
    treble = params.get('treble', 0)
    pitch_shift = params.get('pitch', 0)
    time_range = params.get('timeRange', [0, y.shape[1] / sr])
    is_preview = params.get('preview', False)
    
    # Convert time range to samples
    start_sample = int(time_range[0] * sr)
    end_sample = int(time_range[1] * sr)
    
    # Extract time range if preview or if range is specified
    if is_preview or (start_sample > 0 or end_sample < y.shape[1]):
        print(f"✂️ Extracting time range: {time_range[0]:.2f}s to {time_range[1]:.2f}s")
        y = y[:, start_sample:end_sample]
    
    # Apply audio effects to each channel
    processed_channels = []
    for ch_idx in range(y.shape[0]):
        channel = y[ch_idx, :]
        
        # Apply pitch shift
        if pitch_shift != 0:
            print(f"🎼 Applying pitch shift: {pitch_shift} semitones (channel {ch_idx + 1})")
            channel = librosa.effects.pitch_shift(channel, sr=sr, n_steps=pitch_shift)
        
        # Apply loudness adjustment
        if loudness != 0:
            print(f"🔊 Applying loudness: {loudness:+.1f} dB (channel {ch_idx + 1})")
            gain = 10 ** (loudness / 20)
            channel = channel * gain
        
        # Apply bass boost/cut (low shelf filter)
        if bass != 0:
            print(f"🎸 Applying bass: {bass:+.1f} dB (channel {ch_idx + 1})")
            channel = apply_bass_filter(channel, sr, bass)
        
        # Apply treble boost/cut (high shelf filter)
        if treble != 0:
            print(f"✨ Applying treble: {treble:+.1f} dB (channel {ch_idx + 1})")
            channel = apply_treble_filter(channel, sr, treble)
        
        processed_channels.append(channel)
    
    # Combine channels
    if len(processed_channels) == 1:
        y_processed = processed_channels[0]
    else:
        y_processed = np.array(processed_channels)
    
    # Normalize to prevent clipping
    max_val = np.max(np.abs(y_processed))
    if max_val > 0.95:
        print(f"⚠️ Normalizing audio to prevent clipping (max: {max_val:.3f})")
        y_processed = y_processed * (0.95 / max_val)
    
    # Save to temporary file
    output_path = tempfile.mktemp(suffix='.wav')
    print(f"💾 Saving processed audio to: {output_path}")
    
    if is_mono:
        sf.write(output_path, y_processed, sr)
    else:
        sf.write(output_path, y_processed.T, sr)
    
    print("✅ Audio processing complete!")
    return output_path


def apply_bass_filter(y, sr, gain_db):
    """Apply bass shelf filter (boosts/cuts frequencies below 250 Hz)"""
    # Design a low shelf filter
    cutoff = 250  # Hz
    gain = 10 ** (gain_db / 20)
    
    # Convert to normalized frequency
    nyquist = sr / 2
    normalized_cutoff = cutoff / nyquist
    
    # Design second-order low shelf filter
    Q = 0.707  # Quality factor
    
    # Calculate filter coefficients
    w0 = 2 * np.pi * normalized_cutoff
    A = np.sqrt(gain)
    alpha = np.sin(w0) / (2 * Q)
    
    # Low shelf filter coefficients
    b0 = A * ((A + 1) - (A - 1) * np.cos(w0) + 2 * np.sqrt(A) * alpha)
    b1 = 2 * A * ((A - 1) - (A + 1) * np.cos(w0))
    b2 = A * ((A + 1) - (A - 1) * np.cos(w0) - 2 * np.sqrt(A) * alpha)
    a0 = (A + 1) + (A - 1) * np.cos(w0) + 2 * np.sqrt(A) * alpha
    a1 = -2 * ((A - 1) + (A + 1) * np.cos(w0))
    a2 = (A + 1) + (A - 1) * np.cos(w0) - 2 * np.sqrt(A) * alpha
    
    # Normalize
    b = np.array([b0, b1, b2]) / a0
    a = np.array([1, a1 / a0, a2 / a0])
    
    # Apply filter
    return signal.lfilter(b, a, y)


def apply_treble_filter(y, sr, gain_db):
    """Apply treble shelf filter (boosts/cuts frequencies above 4000 Hz)"""
    # Design a high shelf filter
    cutoff = 4000  # Hz
    gain = 10 ** (gain_db / 20)
    
    # Convert to normalized frequency
    nyquist = sr / 2
    normalized_cutoff = cutoff / nyquist
    
    # Design second-order high shelf filter
    Q = 0.707  # Quality factor
    
    # Calculate filter coefficients
    w0 = 2 * np.pi * normalized_cutoff
    A = np.sqrt(gain)
    alpha = np.sin(w0) / (2 * Q)
    
    # High shelf filter coefficients
    b0 = A * ((A + 1) + (A - 1) * np.cos(w0) + 2 * np.sqrt(A) * alpha)
    b1 = -2 * A * ((A - 1) + (A + 1) * np.cos(w0))
    b2 = A * ((A + 1) + (A - 1) * np.cos(w0) - 2 * np.sqrt(A) * alpha)
    a0 = (A + 1) - (A - 1) * np.cos(w0) + 2 * np.sqrt(A) * alpha
    a1 = 2 * ((A - 1) - (A + 1) * np.cos(w0))
    a2 = (A + 1) - (A - 1) * np.cos(w0) - 2 * np.sqrt(A) * alpha
    
    # Normalize
    b = np.array([b0, b1, b2]) / a0
    a = np.array([1, a1 / a0, a2 / a0])
    
    # Apply filter
    return signal.lfilter(b, a, y)
