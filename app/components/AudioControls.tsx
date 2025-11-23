import React from 'react';

type AudioControlsProps = {
    loudness: number;
    bass: number;
    treble: number;
    pitch: number;
    timeRange: [number, number];
    audioDuration: number;
    onControlChange: (control: string, value: number | [number, number]) => void;
};

export default function AudioControls({
    loudness,
    bass,
    treble,
    pitch,
    timeRange,
    audioDuration,
    onControlChange
}: AudioControlsProps) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="controls-section">
            <h3 className="controls-title">Quick Audio Controls</h3>
            <p className="controls-subtitle">Adjust audio parameters in real-time</p>

            <div className="controls-grid">
                {/* Loudness Control */}
                <div className="slider-control">
                    <div className="slider-header">
                        <label>Loudness</label>
                        <span className="slider-value">{loudness > 0 ? '+' : ''}{loudness} dB</span>
                    </div>
                    <input
                        type="range"
                        min="-20"
                        max="20"
                        step="0.5"
                        value={loudness}
                        onChange={(e) => onControlChange('loudness', parseFloat(e.target.value))}
                        className="slider"
                    />
                    <div className="slider-labels">
                        <span>-20dB</span>
                        <span>0dB</span>
                        <span>+20dB</span>
                    </div>
                </div>

                {/* Bass Control */}
                <div className="slider-control">
                    <div className="slider-header">
                        <label>Bass</label>
                        <span className="slider-value">{bass > 0 ? '+' : ''}{bass} dB</span>
                    </div>
                    <input
                        type="range"
                        min="-12"
                        max="12"
                        step="0.5"
                        value={bass}
                        onChange={(e) => onControlChange('bass', parseFloat(e.target.value))}
                        className="slider"
                    />
                    <div className="slider-labels">
                        <span>-12dB</span>
                        <span>0dB</span>
                        <span>+12dB</span>
                    </div>
                </div>

                {/* Treble Control */}
                <div className="slider-control">
                    <div className="slider-header">
                        <label>Treble</label>
                        <span className="slider-value">{treble > 0 ? '+' : ''}{treble} dB</span>
                    </div>
                    <input
                        type="range"
                        min="-12"
                        max="12"
                        step="0.5"
                        value={treble}
                        onChange={(e) => onControlChange('treble', parseFloat(e.target.value))}
                        className="slider"
                    />
                    <div className="slider-labels">
                        <span>-12dB</span>
                        <span>0dB</span>
                        <span>+12dB</span>
                    </div>
                </div>

                {/* Pitch Control */}
                <div className="slider-control">
                    <div className="slider-header">
                        <label>Pitch</label>
                        <span className="slider-value">{pitch > 0 ? '+' : ''}{pitch} semitones</span>
                    </div>
                    <input
                        type="range"
                        min="-12"
                        max="12"
                        step="1"
                        value={pitch}
                        onChange={(e) => onControlChange('pitch', parseInt(e.target.value))}
                        className="slider"
                    />
                    <div className="slider-labels">
                        <span>-12</span>
                        <span>0</span>
                        <span>+12</span>
                    </div>
                </div>
            </div>

            {/* Time Range Selector */}
            <div className="timestamp-control">
                <div className="slider-header">
                    <label>Time Range Selection</label>
                    <span className="slider-value">
                        {formatTime(timeRange[0])} - {formatTime(timeRange[1])}
                    </span>
                </div>
                <div className="dual-range-container">
                    <input
                        type="range"
                        min="0"
                        max={audioDuration}
                        step="0.1"
                        value={timeRange[0]}
                        onChange={(e) => {
                            const newStart = parseFloat(e.target.value);
                            if (newStart < timeRange[1]) {
                                onControlChange('timeRange', [newStart, timeRange[1]]);
                            }
                        }}
                        className="slider range-start"
                    />
                    <input
                        type="range"
                        min="0"
                        max={audioDuration}
                        step="0.1"
                        value={timeRange[1]}
                        onChange={(e) => {
                            const newEnd = parseFloat(e.target.value);
                            if (newEnd > timeRange[0]) {
                                onControlChange('timeRange', [timeRange[0], newEnd]);
                            }
                        }}
                        className="slider range-end"
                    />
                </div>
                <div className="slider-labels">
                    <span>0:00</span>
                    <span>{formatTime(audioDuration / 2)}</span>
                    <span>{formatTime(audioDuration)}</span>
                </div>
            </div>

            <div className="controls-info">
                <p>💡 Adjust sliders to modify audio parameters. Changes are applied in real-time to the analysis data.</p>
            </div>
        </div>
    );
}
