import librosa
import librosa.display
import matplotlib.pyplot as plt
import numpy as np
from scipy import signal
import io
import base64
from matplotlib.figure import Figure

def generate_waveform(audio_path):
    """Generate waveform visualization and insights"""
    try:
        # Load audio
        y, sr = librosa.load(audio_path, sr=None)
        duration = librosa.get_duration(y=y, sr=sr)
        
        # Create figure with transparent background
        fig = Figure(figsize=(12, 4), facecolor='none')
        ax = fig.add_subplot(111)
        ax.set_facecolor('none')
        
        # Plot waveform
        time = np.linspace(0, duration, len(y))
        ax.plot(time, y, color='#00f2fe', linewidth=0.5, alpha=0.8)
        ax.fill_between(time, y, alpha=0.3, color='#4facfe')
        
        # Styling
        ax.set_xlabel('Time (s)', color='white', fontsize=10)
        ax.set_ylabel('Amplitude', color='white', fontsize=10)
        ax.tick_params(colors='white', labelsize=8)
        ax.grid(True, alpha=0.2, color='white')
        ax.spines['bottom'].set_color('white')
        ax.spines['top'].set_color('none')
        ax.spines['right'].set_color('none')
        ax.spines['left'].set_color('white')
        
        fig.tight_layout()
        
        # Convert to base64
        buf = io.BytesIO()
        fig.savefig(buf, format='png', transparent=True, dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        
        # Generate insights
        peak_amplitude = np.max(np.abs(y))
        rms = np.sqrt(np.mean(y**2))
        dynamic_range = 20 * np.log10(peak_amplitude / (rms + 1e-10))
        
        insight = f"Peak amplitude: {peak_amplitude:.3f}. RMS energy: {rms:.3f}. "
        if dynamic_range > 20:
            insight += "High dynamic range detected - audio has significant variation between quiet and loud sections."
        elif dynamic_range < 10:
            insight += "Low dynamic range - audio is heavily compressed or consistently loud."
        else:
            insight += "Moderate dynamic range - balanced loudness variation."
        
        return {
            'image': img_base64,
            'insight': insight,
            'metrics': {
                'peak_amplitude': float(peak_amplitude),
                'rms': float(rms),
                'dynamic_range_db': float(dynamic_range)
            }
        }
    except Exception as e:
        print(f"Error generating waveform: {e}")
        return None

def generate_spectrogram(audio_path):
    """Generate spectrogram visualization and insights"""
    try:
        # Load audio
        y, sr = librosa.load(audio_path, sr=None)
        
        # Create figure with transparent background
        fig = Figure(figsize=(12, 5), facecolor='none')
        ax = fig.add_subplot(111)
        ax.set_facecolor('none')
        
        # Compute spectrogram
        D = librosa.amplitude_to_db(np.abs(librosa.stft(y)), ref=np.max)
        
        # Plot spectrogram
        img = librosa.display.specshow(D, sr=sr, x_axis='time', y_axis='hz', 
                                       ax=ax, cmap='viridis', alpha=0.9)
        
        # Styling
        ax.set_xlabel('Time (s)', color='white', fontsize=10)
        ax.set_ylabel('Frequency (Hz)', color='white', fontsize=10)
        ax.tick_params(colors='white', labelsize=8)
        ax.spines['bottom'].set_color('white')
        ax.spines['top'].set_color('none')
        ax.spines['right'].set_color('none')
        ax.spines['left'].set_color('white')
        
        # Add colorbar
        cbar = fig.colorbar(img, ax=ax, format='%+2.0f dB')
        cbar.ax.tick_params(colors='white', labelsize=8)
        cbar.outline.set_edgecolor('white')
        
        fig.tight_layout()
        
        # Convert to base64
        buf = io.BytesIO()
        fig.savefig(buf, format='png', transparent=True, dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        
        # Generate insights
        # Analyze frequency distribution
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        avg_centroid = np.mean(spectral_centroid)
        
        spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
        avg_bandwidth = np.mean(spectral_bandwidth)
        
        insight = f"Average spectral centroid: {avg_centroid:.0f} Hz. "
        if avg_centroid > 3000:
            insight += "High-frequency content dominates - bright, airy sound with strong presence in treble."
        elif avg_centroid < 1000:
            insight += "Low-frequency content dominates - warm, bass-heavy sound with limited high-end."
        else:
            insight += "Balanced frequency distribution across the spectrum."
        
        return {
            'image': img_base64,
            'insight': insight,
            'metrics': {
                'avg_spectral_centroid_hz': float(avg_centroid),
                'avg_bandwidth_hz': float(avg_bandwidth)
            }
        }
    except Exception as e:
        print(f"Error generating spectrogram: {e}")
        return None

def generate_spectrum(audio_path):
    """Generate spectrum analysis (FFT) and insights"""
    try:
        # Load audio
        y, sr = librosa.load(audio_path, sr=None)
        
        # Create figure with transparent background
        fig = Figure(figsize=(12, 4), facecolor='none')
        ax = fig.add_subplot(111)
        ax.set_facecolor('none')
        
        # Compute FFT
        fft = np.fft.fft(y)
        magnitude = np.abs(fft)
        frequency = np.linspace(0, sr, len(magnitude))
        
        # Only plot first half (positive frequencies)
        half_n = len(frequency) // 2
        frequency = frequency[:half_n]
        magnitude = magnitude[:half_n]
        
        # Convert to dB
        magnitude_db = 20 * np.log10(magnitude + 1e-10)
        
        # Plot spectrum
        ax.plot(frequency, magnitude_db, color='#00f2fe', linewidth=1, alpha=0.8)
        ax.fill_between(frequency, magnitude_db, alpha=0.3, color='#4facfe')
        
        # Styling
        ax.set_xlabel('Frequency (Hz)', color='white', fontsize=10)
        ax.set_ylabel('Magnitude (dB)', color='white', fontsize=10)
        ax.set_xlim(0, min(sr/2, 20000))  # Limit to 20kHz or Nyquist
        ax.tick_params(colors='white', labelsize=8)
        ax.grid(True, alpha=0.2, color='white')
        ax.spines['bottom'].set_color('white')
        ax.spines['top'].set_color('none')
        ax.spines['right'].set_color('none')
        ax.spines['left'].set_color('white')
        ax.set_xscale('log')
        
        fig.tight_layout()
        
        # Convert to base64
        buf = io.BytesIO()
        fig.savefig(buf, format='png', transparent=True, dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        
        # Generate insights
        # Analyze frequency bands
        bass_range = (20, 250)
        mid_range = (250, 4000)
        treble_range = (4000, 20000)
        
        bass_mask = (frequency >= bass_range[0]) & (frequency <= bass_range[1])
        mid_mask = (frequency >= mid_range[0]) & (frequency <= mid_range[1])
        treble_mask = (frequency >= treble_range[0]) & (frequency <= treble_range[1])
        
        bass_energy = np.mean(magnitude[bass_mask]) if np.any(bass_mask) else 0
        mid_energy = np.mean(magnitude[mid_mask]) if np.any(mid_mask) else 0
        treble_energy = np.mean(magnitude[treble_mask]) if np.any(treble_mask) else 0
        
        total_energy = bass_energy + mid_energy + treble_energy
        if total_energy > 0:
            bass_pct = (bass_energy / total_energy) * 100
            mid_pct = (mid_energy / total_energy) * 100
            treble_pct = (treble_energy / total_energy) * 100
        else:
            bass_pct = mid_pct = treble_pct = 0
        
        insight = f"Frequency distribution - Bass: {bass_pct:.1f}%, Mids: {mid_pct:.1f}%, Treble: {treble_pct:.1f}%. "
        
        if bass_pct > 50:
            insight += "Bass-heavy mix with strong low-end presence."
        elif treble_pct > 40:
            insight += "Bright mix with emphasized high frequencies."
        elif mid_pct > 50:
            insight += "Mid-focused sound with vocal/instrument clarity."
        else:
            insight += "Well-balanced frequency response across all ranges."
        
        return {
            'image': img_base64,
            'insight': insight,
            'metrics': {
                'bass_percentage': float(bass_pct),
                'mid_percentage': float(mid_pct),
                'treble_percentage': float(treble_pct)
            }
        }
    except Exception as e:
        print(f"Error generating spectrum: {e}")
        return None

def analyze_audio_file(audio_path):
    """Main function to generate all visualizations - optimized version"""
    # Load audio once for all visualizations
    print("📁 Loading audio file...")
    y, sr = librosa.load(audio_path, sr=None)
    duration = librosa.get_duration(y=y, sr=sr)
    print(f"✅ Audio loaded: {duration:.2f}s at {sr}Hz")
    
    # Generate all visualizations in parallel using the same audio data
    print("🎨 Generating waveform...")
    waveform_data = generate_waveform_optimized(y, sr, duration)
    
    print("🎨 Generating spectrogram...")
    spectrogram_data = generate_spectrogram_optimized(y, sr)
    
    print("🎨 Generating spectrum...")
    spectrum_data = generate_spectrum_optimized(y, sr)
    
    print("✅ All visualizations generated!")
    
    return {
        'waveform': waveform_data,
        'spectrogram': spectrogram_data,
        'spectrum': spectrum_data
    }

def generate_waveform_optimized(y, sr, duration):
    """Generate waveform from pre-loaded audio"""
    try:
        # Create smaller figure for faster rendering
        fig = Figure(figsize=(10, 3), facecolor='none')
        ax = fig.add_subplot(111)
        ax.set_facecolor('none')
        
        # Plot waveform
        time = np.linspace(0, duration, len(y))
        ax.plot(time, y, color='#00f2fe', linewidth=0.5, alpha=0.8)
        ax.fill_between(time, y, alpha=0.3, color='#4facfe')
        
        # Styling
        ax.set_xlabel('Time (s)', color='white', fontsize=9)
        ax.set_ylabel('Amplitude', color='white', fontsize=9)
        ax.tick_params(colors='white', labelsize=7)
        ax.grid(True, alpha=0.2, color='white')
        ax.spines['bottom'].set_color('white')
        ax.spines['top'].set_color('none')
        ax.spines['right'].set_color('none')
        ax.spines['left'].set_color('white')
        
        fig.tight_layout()
        
        # Convert to base64 with lower DPI for speed
        buf = io.BytesIO()
        fig.savefig(buf, format='png', transparent=True, dpi=80, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        
        # Generate insights
        peak_amplitude = np.max(np.abs(y))
        rms = np.sqrt(np.mean(y**2))
        dynamic_range = 20 * np.log10(peak_amplitude / (rms + 1e-10))
        
        insight = f"Peak amplitude: {peak_amplitude:.3f}. RMS energy: {rms:.3f}. "
        if dynamic_range > 20:
            insight += "Moderate dynamic range - balanced loudness variation."
        elif dynamic_range < 10:
            insight += "Low dynamic range - audio is heavily compressed or consistently loud."
        else:
            insight += "Moderate dynamic range - balanced loudness variation."
        
        return {
            'image': img_base64,
            'insight': insight,
            'metrics': {
                'peak_amplitude': float(peak_amplitude),
                'rms': float(rms),
                'dynamic_range_db': float(dynamic_range)
            }
        }
    except Exception as e:
        print(f"Error generating waveform: {e}")
        return None

def generate_spectrogram_optimized(y, sr):
    """Generate spectrogram from pre-loaded audio"""
    try:
        # Create smaller figure
        fig = Figure(figsize=(10, 4), facecolor='none')
        ax = fig.add_subplot(111)
        ax.set_facecolor('none')
        
        # Compute spectrogram
        D = librosa.amplitude_to_db(np.abs(librosa.stft(y)), ref=np.max)
        
        # Plot spectrogram
        img = librosa.display.specshow(D, sr=sr, x_axis='time', y_axis='hz', 
                                       ax=ax, cmap='viridis', alpha=0.9)
        
        # Styling
        ax.set_xlabel('Time (s)', color='white', fontsize=9)
        ax.set_ylabel('Frequency (Hz)', color='white', fontsize=9)
        ax.tick_params(colors='white', labelsize=7)
        ax.spines['bottom'].set_color('white')
        ax.spines['top'].set_color('none')
        ax.spines['right'].set_color('none')
        ax.spines['left'].set_color('white')
        
        # Add colorbar
        cbar = fig.colorbar(img, ax=ax, format='%+2.0f dB')
        cbar.ax.tick_params(colors='white', labelsize=7)
        cbar.outline.set_edgecolor('white')
        
        fig.tight_layout()
        
        # Convert to base64
        buf = io.BytesIO()
        fig.savefig(buf, format='png', transparent=True, dpi=80, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        
        # Generate insights
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        avg_centroid = np.mean(spectral_centroid)
        
        insight = f"Average spectral centroid: {avg_centroid:.0f} Hz. "
        if avg_centroid > 3000:
            insight += "Balanced frequency distribution across the spectrum."
        elif avg_centroid < 1000:
            insight += "Warm, bass-heavy sound with limited high-end."
        else:
            insight += "Balanced frequency distribution across the spectrum."
        
        return {
            'image': img_base64,
            'insight': insight,
            'metrics': {
                'avg_spectral_centroid_hz': float(avg_centroid)
            }
        }
    except Exception as e:
        print(f"Error generating spectrogram: {e}")
        return None

def generate_spectrum_optimized(y, sr):
    """Generate spectrum from pre-loaded audio"""
    try:
        # Create smaller figure
        fig = Figure(figsize=(10, 3), facecolor='none')
        ax = fig.add_subplot(111)
        ax.set_facecolor('none')
        
        # Compute FFT
        fft = np.fft.fft(y)
        magnitude = np.abs(fft)
        frequency = np.linspace(0, sr, len(magnitude))
        
        # Only plot first half
        half_n = len(frequency) // 2
        frequency = frequency[:half_n]
        magnitude = magnitude[:half_n]
        
        # Convert to dB
        magnitude_db = 20 * np.log10(magnitude + 1e-10)
        
        # Plot spectrum
        ax.plot(frequency, magnitude_db, color='#00f2fe', linewidth=1, alpha=0.8)
        ax.fill_between(frequency, magnitude_db, alpha=0.3, color='#4facfe')
        
        # Styling
        ax.set_xlabel('Frequency (Hz)', color='white', fontsize=9)
        ax.set_ylabel('Magnitude (dB)', color='white', fontsize=9)
        ax.set_xlim(0, min(sr/2, 20000))
        ax.tick_params(colors='white', labelsize=7)
        ax.grid(True, alpha=0.2, color='white')
        ax.spines['bottom'].set_color('white')
        ax.spines['top'].set_color('none')
        ax.spines['right'].set_color('none')
        ax.spines['left'].set_color('white')
        ax.set_xscale('log')
        
        fig.tight_layout()
        
        # Convert to base64
        buf = io.BytesIO()
        fig.savefig(buf, format='png', transparent=True, dpi=80, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        
        # Generate insights
        bass_range = (20, 250)
        mid_range = (250, 4000)
        treble_range = (4000, 20000)
        
        bass_mask = (frequency >= bass_range[0]) & (frequency <= bass_range[1])
        mid_mask = (frequency >= mid_range[0]) & (frequency <= mid_range[1])
        treble_mask = (frequency >= treble_range[0]) & (frequency <= treble_range[1])
        
        bass_energy = np.mean(magnitude[bass_mask]) if np.any(bass_mask) else 0
        mid_energy = np.mean(magnitude[mid_mask]) if np.any(mid_mask) else 0
        treble_energy = np.mean(magnitude[treble_mask]) if np.any(treble_mask) else 0
        
        total_energy = bass_energy + mid_energy + treble_energy
        if total_energy > 0:
            bass_pct = (bass_energy / total_energy) * 100
            mid_pct = (mid_energy / total_energy) * 100
            treble_pct = (treble_energy / total_energy) * 100
        else:
            bass_pct = mid_pct = treble_pct = 0
        
        insight = f"Frequency distribution - Bass: {bass_pct:.1f}%, Mids: {mid_pct:.1f}%, Treble: {treble_pct:.1f}%. "
        
        if bass_pct > 50:
            insight += "Bass-heavy mix with strong low-end presence."
        elif treble_pct > 40:
            insight += "Bright mix with emphasized high frequencies."
        else:
            insight += "Well-balanced frequency response across all ranges."
        
        return {
            'image': img_base64,
            'insight': insight,
            'metrics': {
                'bass_percentage': float(bass_pct),
                'mid_percentage': float(mid_pct),
                'treble_percentage': float(treble_pct)
            }
        }
    except Exception as e:
        print(f"Error generating spectrum: {e}")
        return None
