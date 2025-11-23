'use client';

import React, { useState } from 'react';

type VisualizationData = {
    image: string;
    insight: string;
    metrics: any;
};

type VisualizationsProps = {
    waveform: VisualizationData | null;
    spectrogram: VisualizationData | null;
    spectrum: VisualizationData | null;
};

export default function AudioVisualizations({ waveform, spectrogram, spectrum }: VisualizationsProps) {
    const [enlargedImage, setEnlargedImage] = useState<{ src: string; title: string } | null>(null);

    if (!waveform && !spectrogram && !spectrum) {
        return null;
    }

    const handleImageClick = (imageSrc: string, title: string) => {
        setEnlargedImage({ src: imageSrc, title });
    };

    const closeEnlarged = () => {
        setEnlargedImage(null);
    };

    return (
        <>
            <div className="visualizations-section">
                <h3 className="viz-section-title">Audio Analysis Visualizations</h3>
                <div className="visualization-cards">
                    {waveform && (
                        <div className="viz-card" onClick={() => handleImageClick(`data:image/png;base64,${waveform.image}`, 'Waveform Analysis')} style={{ cursor: 'pointer' }}>
                            <h4 className="viz-title">Waveform Analysis</h4>
                            <div className="viz-image-container">
                                <img
                                    src={`data:image/png;base64,${waveform.image}`}
                                    alt="Waveform"
                                    className="viz-image"
                                />
                            </div>
                            <p className="viz-insight">{waveform.insight}</p>
                        </div>
                    )}

                    {spectrogram && (
                        <div className="viz-card" onClick={() => handleImageClick(`data:image/png;base64,${spectrogram.image}`, 'Spectrogram')} style={{ cursor: 'pointer' }}>
                            <h4 className="viz-title">Spectrogram</h4>
                            <div className="viz-image-container">
                                <img
                                    src={`data:image/png;base64,${spectrogram.image}`}
                                    alt="Spectrogram"
                                    className="viz-image"
                                />
                            </div>
                            <p className="viz-insight">{spectrogram.insight}</p>
                        </div>
                    )}

                    {spectrum && (
                        <div className="viz-card" onClick={() => handleImageClick(`data:image/png;base64,${spectrum.image}`, 'Spectrum Analysis')} style={{ cursor: 'pointer' }}>
                            <h4 className="viz-title">Spectrum Analysis</h4>
                            <div className="viz-image-container">
                                <img
                                    src={`data:image/png;base64,${spectrum.image}`}
                                    alt="Spectrum"
                                    className="viz-image"
                                />
                            </div>
                            <p className="viz-insight">{spectrum.insight}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Enlarged Image Modal */}
            {enlargedImage && (
                <div className="viz-modal-overlay" onClick={closeEnlarged}>
                    <div className="viz-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="viz-modal-close" onClick={closeEnlarged}>×</button>
                        <h3 className="viz-modal-title">{enlargedImage.title}</h3>
                        <img src={enlargedImage.src} alt={enlargedImage.title} className="viz-modal-image" />
                    </div>
                </div>
            )}
        </>
    );
}
