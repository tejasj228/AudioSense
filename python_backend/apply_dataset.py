"""
Apply dataset modifications to audio
Reads modified CSV dataset and applies changes to audio file
"""

import librosa
import soundfile as sf
import numpy as np
import pandas as pd
import tempfile
import os

def apply_dataset_to_audio(audio_path, dataset_path):
    """
    Apply dataset modifications to audio
    
    Args:
        audio_path: Path to input audio file
        dataset_path: Path to modified CSV dataset
    
    Returns:
        Tuple of (output_audio_path, output_dataset_path)
    """
    print(f"📊 Loading dataset from {dataset_path}")
    
    # Load the dataset
    df = pd.read_csv(dataset_path)
    
    # Load audio
    print(f"🎵 Loading audio from {audio_path}")
    y, sr = librosa.load(audio_path, sr=None, mono=False)
    
    # Convert to mono if stereo for processing
    if y.ndim > 1:
        y_mono = np.mean(y, axis=0)
    else:
        y_mono = y
    
    # Calculate frame length based on dataset time resolution
    if len(df) > 1:
        time_step = df['duration_sec'].iloc[1] - df['duration_sec'].iloc[0]
    else:
        time_step = len(y_mono) / sr
    
    hop_length = int(time_step * sr)
    
    # Apply RMS energy modifications
    if 'rms_energy' in df.columns:
        print("🔊 Applying loudness modifications...")
        
        from scipy.ndimage import gaussian_filter1d
        
        # Calculate original RMS per frame
        frame_length = 2048
        hop_length_rms = 512
        original_rms = librosa.feature.rms(y=y_mono, frame_length=frame_length, hop_length=hop_length_rms)[0]
        
        # Get target RMS from dataset
        target_rms = df['rms_energy'].values
        
        # Interpolate target RMS to match original RMS frame count
        if len(target_rms) != len(original_rms):
            target_rms = np.interp(
                np.linspace(0, len(target_rms) - 1, len(original_rms)),
                np.arange(len(target_rms)),
                target_rms
            )
        
        # Calculate gain envelope
        original_rms = np.maximum(original_rms, 1e-6)
        gain_envelope = target_rms / original_rms
        
        # Heavily smooth gain to avoid artifacts (increase sigma for smoother result)
        gain_envelope = gaussian_filter1d(gain_envelope, sigma=5)
        
        # Clamp gain to reasonable range
        gain_envelope = np.clip(gain_envelope, 0.1, 3.0)
        
        # Interpolate gain envelope to match audio sample length
        gain_full = np.interp(
            np.arange(len(y_mono)),
            np.linspace(0, len(y_mono), len(gain_envelope)),
            gain_envelope
        )
        
        # Apply gain smoothly
        y_modified = y_mono * gain_full
        
        # Normalize to prevent clipping
        max_val = np.abs(y_modified).max()
        if max_val > 1.0:
            y_modified = y_modified / max_val * 0.95
    else:
        y_modified = y_mono
    
    # Apply ZCR modifications (pitch)
    if 'zcr' in df.columns:
        print("Applying pitch modifications...")
        
        from scipy.ndimage import gaussian_filter1d
        
        # Get original and target ZCR
        original_zcr = librosa.feature.zero_crossing_rate(y=y_mono)[0]
        target_zcr = df['zcr'].values
        
        # Calculate average pitch shift needed
        avg_original_zcr = np.mean(original_zcr)
        avg_target_zcr = np.mean(target_zcr)
        zcr_ratio = avg_target_zcr / (avg_original_zcr + 1e-8)
        
        # Clamp to reasonable range
        zcr_ratio = np.clip(zcr_ratio, 0.5, 2.0)
        
        print(f"   ZCR ratio: {zcr_ratio:.2f}")
        
        # Convert ZCR ratio to pitch shift in semitones
        # Approximate: doubling ZCR ≈ +12 semitones
        pitch_shift_semitones = 12 * np.log2(zcr_ratio)
        pitch_shift_semitones = np.clip(pitch_shift_semitones, -12, 12)
        
        print(f"   Pitch shift: {pitch_shift_semitones:.2f} semitones")
        
        # Apply pitch shift
        y_modified = librosa.effects.pitch_shift(y_modified, sr=sr, n_steps=pitch_shift_semitones)
        
        # Normalize
        max_val = np.abs(y_modified).max()
        if max_val > 1.0:
            y_modified = y_modified / max_val * 0.95
    
    # Apply spectral modifications (brightness, etc.)
    if 'spectral_centroid' in df.columns:
        print("Applying brightness modifications...")
        
        from scipy import signal
        from scipy.ndimage import gaussian_filter1d
        
        # Get original and target spectral centroids
        original_centroid = librosa.feature.spectral_centroid(y=y_mono, sr=sr)[0]
        target_centroid = df['spectral_centroid'].values
        
        # Calculate average brightness change
        avg_original = np.mean(original_centroid)
        avg_target = np.mean(target_centroid)
        brightness_ratio = avg_target / (avg_original + 1e-8)
        
        # Clamp to reasonable range
        brightness_ratio = np.clip(brightness_ratio, 0.7, 1.5)
        
        print(f"   Brightness ratio: {brightness_ratio:.2f}")
        
        # Apply simple high-shelf filter for brightness adjustment
        if brightness_ratio > 1.05:  # Brighter
            # High-shelf boost
            b, a = signal.iirfilter(2, 4000, btype='high', ftype='butter', fs=sr, output='ba')
            gain_db = (brightness_ratio - 1.0) * 6  # Max 3dB boost
            gain_linear = 10 ** (gain_db / 20)
            y_high = signal.filtfilt(b, a, y_modified)
            y_modified = y_modified + y_high * (gain_linear - 1.0) * 0.3
        elif brightness_ratio < 0.95:  # Darker
            # High-shelf cut
            b, a = signal.iirfilter(2, 4000, btype='high', ftype='butter', fs=sr, output='ba')
            gain_db = (1.0 - brightness_ratio) * -6  # Max -3dB cut
            gain_linear = 10 ** (gain_db / 20)
            y_high = signal.filtfilt(b, a, y_modified)
            y_modified = y_modified - y_high * (1.0 - gain_linear) * 0.3
        
        # Normalize
        max_val = np.abs(y_modified).max()
        if max_val > 1.0:
            y_modified = y_modified / max_val * 0.95
    
    # Restore stereo if original was stereo
    if y.ndim > 1:
        # Apply same processing to both channels
        y_output = np.stack([y_modified, y_modified])
    else:
        y_output = y_modified
    
    # Save output audio
    output_audio = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
    output_audio.close()
    
    print(f"💾 Saving modified audio to {output_audio.name}")
    sf.write(output_audio.name, y_output.T if y_output.ndim > 1 else y_output, sr)
    
    # Save output dataset (same as input since we've applied it)
    output_dataset = tempfile.NamedTemporaryFile(delete=False, suffix='.csv')
    output_dataset.close()
    df.to_csv(output_dataset.name, index=False)
    
    print("✅ Dataset modifications applied successfully")
    
    return output_audio.name, output_dataset.name
