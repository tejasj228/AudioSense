"use client";

import { useState, useRef, useEffect } from "react";
import Meyda from "meyda";
import Loader from "./components/Loader";
import AudioVisualizations from "./components/AudioVisualizations";
import AudioControls from "./components/AudioControls";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Analyze Audio", href: "#analyze" },
  { label: "Insights", href: "#insights" },
  { label: "Modify Audio", href: "#modify" },
  { label: "About", href: "#about" }
];

const waveformHeights = [
  46, 72, 58, 90, 64, 88, 54, 76, 62, 98, 68, 84, 56, 74, 60, 86, 52, 70, 50,
  80, 48, 92, 66, 82, 58, 78, 62, 88, 60, 96, 68, 84, 54, 74, 58, 90, 64, 82,
  56, 78, 60, 86
];

type ChatMessage = {
  role: 'user' | 'bot';
  text: string;
};

type VisualizationData = {
  image: string;
  insight: string;
  metrics: any;
};

type AudioControlsType = {
  loudness: number;
  bass: number;
  treble: number;
  pitch: number;
  timeRange: [number, number];
};

export default function HomePage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<string | null>(null);
  const [insights, setInsights] = useState<{
    duration: string;
    avgRms: string;
    avgTempo: string;
    character: string;
    description: string;
    dynamicsScore: number;
    brightnessScore: number;
  } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [visualizations, setVisualizations] = useState<{
    waveform: VisualizationData | null;
    spectrogram: VisualizationData | null;
    spectrum: VisualizationData | null;
  } | null>(null);
  const [audioControls, setAudioControls] = useState<AudioControlsType>({
    loudness: 0,
    bass: 0,
    treble: 0,
    pitch: 0,
    timeRange: [0, 100]
  });
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
      setAnalysisData(null);
      setInsights(null);
      setChatMessages([]);
      setSuggestions([]);
      setVisualizations(null);
      setAudioControls({
        loudness: 0,
        bass: 0,
        treble: 0,
        pitch: 0,
        timeRange: [0, 100]
      });
    }
  };

  const analyzeAudio = async () => {
    if (!audioFile) return;

    setIsAnalyzing(true);
    setAnalysisData(null);
    setInsights(null);
    setChatMessages([]);
    setSuggestions([]);

    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      const duration = audioBuffer.duration;
      const sampleRate = audioContext.sampleRate;
      const bufferSize = 512;

      const channelData = audioBuffer.getChannelData(0);
      let csvContent = "data:text/csv;charset=utf-8,duration_sec,rms_energy,zcr,spectral_centroid,spectral_bandwidth,spectral_rolloff,tempo,mfcc_1,mfcc_2,mfcc_3,mfcc_4,mfcc_5,mfcc_6,mfcc_7,mfcc_8,mfcc_9,mfcc_10,mfcc_11,mfcc_12,mfcc_13\n";

      let totalRms = 0;
      let frameCount = 0;
      let spectralCentroids = [];

      Meyda.bufferSize = bufferSize;

      // Analyze in 0.5s chunks approx
      const samplesPerChunk = Math.floor(sampleRate * 0.5);

      for (let i = 0; i < channelData.length; i += samplesPerChunk) {
        const signal = new Float32Array(bufferSize);
        // Copy data from the current position
        if (i + bufferSize <= channelData.length) {
          signal.set(channelData.slice(i, i + bufferSize));
        } else {
          signal.set(channelData.slice(i));
        }

        const features = Meyda.extract(
          ["rms", "zcr", "spectralCentroid", "spectralSpread", "spectralRolloff", "mfcc"],
          signal
        );

        if (features) {
          const time = i / sampleRate;
          const rms = features.rms;
          const zcr = features.zcr;
          const centroid = features.spectralCentroid;
          const bandwidth = features.spectralSpread;
          const rolloff = features.spectralRolloff;
          const mfcc = features.mfcc as number[]; // Array of 13

          // Simple Tempo Estimate (Randomized/Placeholder for now as real detection is complex)
          const tempo = 120; // Placeholder

          csvContent += `${time.toFixed(2)},${rms.toFixed(6)},${zcr.toFixed(6)},${centroid.toFixed(6)},${bandwidth.toFixed(6)},${rolloff.toFixed(6)},${tempo},${mfcc.join(',')}\n`;

          totalRms += rms;
          spectralCentroids.push(centroid);
          frameCount++;
        }
      }

      const avgRms = totalRms / frameCount;
      const avgCentroid = spectralCentroids.reduce((a, b) => a + b, 0) / frameCount;

      // Determine character and generate prompts
      let character = "Balanced";
      let description = "The audio has a balanced frequency response with moderate dynamic range.";
      let generatedSuggestions = [
        "Increase overall loudness",
        "Add warmth to the low end",
        "Enhance stereo width"
      ];
      let brightnessScore = 50;
      let dynamicsScore = Math.min(avgRms * 200, 100); // Rough scaling

      if (avgCentroid > 3000) {
        character = "Bright & Airy";
        description = "High spectral energy detected. The track feels open and detailed but may lack warmth.";
        brightnessScore = 85;
        generatedSuggestions = [
          "Tame harsh high frequencies",
          "Boost low-mid warmth",
          "Compress to glue the mix"
        ];
      } else if (avgCentroid < 1000) {
        character = "Dark & Warm";
        description = "Dominant low-mid energy. The sound is full and warm, potentially muddy.";
        brightnessScore = 25;
        generatedSuggestions = [
          "Add air and presence",
          "Clean up muddy low-mids",
          "Tighten the bass response"
        ];
      } else {
        character = "Neutral & Clear";
        brightnessScore = 50;
      }

      if (avgRms > 0.3) {
        character += ", High Energy";
        description += " It is quite loud and impactful.";
        dynamicsScore = 90;
        generatedSuggestions.push("Recover transient detail");
      } else if (avgRms < 0.1) {
        character += ", Dynamic/Quiet";
        description += " It has a wide dynamic range and feels intimate.";
        dynamicsScore = 30;
        generatedSuggestions.push("Apply parallel compression");
      }

      setInsights({
        duration: `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`,
        avgRms: avgRms.toFixed(4),
        avgTempo: "120 BPM (Est.)", // Placeholder
        character: character,
        description: description,
        dynamicsScore: Math.round(dynamicsScore),
        brightnessScore: Math.round(brightnessScore)
      });

      // Generate suggestions via Gemini
      generateSuggestions(description, character);

      setChatMessages([{ role: 'bot', text: "Analysis complete. I've generated a dataset of your audio. How would you like to modify it?" }]);
      setAnalysisData(encodeURI(csvContent));
      setAudioDuration(duration);
      setAudioControls(prev => ({ ...prev, timeRange: [0, duration] }));

      // Call Python backend for visualizations
      await generateVisualizations();

    } catch (error) {
      console.error("Error analyzing audio:", error);
      alert("Error analyzing audio file.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateSuggestions = async (desc: string, char: string) => {
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "suggestions",
          context: `Audio Character: ${char}. Description: ${desc}`
        })
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSuggestions(data);
      }
    } catch (e) {
      console.error("Failed to generate suggestions", e);
      // Fallback
      setSuggestions(["Make it louder", "Boost brightness", "Increase tempo"]);
    }
  };

  const generateVisualizations = async () => {
    if (!audioFile) return;

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);

      const res = await fetch('http://localhost:5000/api/visualize', {
        method: 'POST',
        body: formData,
        mode: 'cors'
      });

      if (!res.ok) {
        throw new Error('Failed to generate visualizations');
      }

      const data = await res.json();

      if (data.success && data.visualizations) {
        setVisualizations(data.visualizations);
      }
    } catch (e) {
      console.error('Error generating visualizations:', e);
    }
  };

  const handleControlChange = (control: string, value: number | [number, number]) => {
    if (control === 'timeRange') {
      setAudioControls(prev => ({ ...prev, timeRange: value as [number, number] }));
    } else {
      setAudioControls(prev => ({ ...prev, [control]: value as number }));
    }
  };

  const downloadCsv = () => {
    if (!analysisData) return;
    const link = document.createElement("a");
    link.setAttribute("href", analysisData);
    link.setAttribute("download", "audio_analysis_dataset.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const applyModification = (mod: any) => {
    if (!analysisData) return;

    // Decode CSV
    const csvString = decodeURI(analysisData).replace("data:text/csv;charset=utf-8,", "");
    const rows = csvString.split("\n");
    const header = rows[0].split(",");
    const dataRows = rows.slice(1).filter(r => r.trim() !== "");

    // Find column index
    let colIndex = -1;
    if (mod.column === "all_mfcc") {
      // Special case for MFCCs? For now let's skip or handle simple cols
    } else {
      colIndex = header.indexOf(mod.column);
    }

    if (colIndex === -1 && mod.column !== "all_mfcc") return;

    const newRows = dataRows.map((row, idx) => {
      const cols = row.split(",");
      const time = parseFloat(cols[0]);

      // Check time range
      if (mod.start_time !== undefined && time < mod.start_time) return row;
      if (mod.end_time !== undefined && time > mod.end_time) return row;

      if (mod.column === "all_mfcc") {
        // Apply to all MFCC columns (indices 8 to 20)
        for (let i = 8; i <= 20; i++) {
          let val = parseFloat(cols[i]);
          if (mod.operation === "multiply") val *= mod.value;
          else if (mod.operation === "add") val += mod.value;
          else if (mod.operation === "set") val = mod.value;
          cols[i] = val.toFixed(6);
        }
      } else {
        let val = parseFloat(cols[colIndex]);
        if (mod.operation === "multiply") val *= mod.value;
        else if (mod.operation === "add") val += mod.value;
        else if (mod.operation === "set") val = mod.value;
        cols[colIndex] = val.toFixed(6);
      }
      return cols.join(",");
    });

    const newCsvContent = "data:text/csv;charset=utf-8," + [header.join(","), ...newRows].join("\n");
    setAnalysisData(encodeURI(newCsvContent));
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg = { role: 'user', text: chatInput } as ChatMessage;
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          messages: newMessages,
          context: insights ? `Character: ${insights.character}. Description: ${insights.description}` : ""
        })
      });

      const data = await res.json();

      if (data.type === "modification") {
        applyModification(data);
        setChatMessages(prev => [...prev, { role: 'bot', text: data.message }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'bot', text: data.text || "I couldn't process that." }]);
      }

    } catch (e) {
      console.error("Chat error", e);
      setChatMessages(prev => [...prev, { role: 'bot', text: "Sorry, I encountered an error connecting to Gemini." }]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setChatInput(suggestion);
    // Optional: Auto-send could be enabled here if desired
  };

  return (
    <div className="page-shell">
      <div className="ambient-grid" aria-hidden="true" />
      <header className="floating-header">
        <div className="header-inner">
          <span className="brand">AudioSense</span>
          <nav className="nav-links">
            {navItems.map((item) => (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <a className="ghost-link" href="#analyze">
            Try Demo
          </a>
        </div>
      </header>
      <main>
        <section id="home" className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Premium Audio Intelligence</span>
            <h1>Intelligent Audio Analysis &amp; Enhancement</h1>
            <p>
              Upload audio, understand its structure, and enhance it with
              AI-powered controls. Navigate clarity, dynamics, and texture
              through an elegant, data-rich experience.
            </p>
            <div className="hero-actions">
              <a className="secondary-btn" href="#analyze">
                Try Demo
              </a>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="wave-center">
              <div className="wave pulse" />
              <div className="wave ripple" />
              <div className="wave outline" />
            </div>
            <div className="waveform-bars">
              {waveformHeights.map((height, index) => (
                <span
                  key={index}
                  style={{
                    animationDelay: `${index * 0.07}s`,
                    height: `${height}px`
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="analyze" className="analyze-section">
          <div className="section-heading">
            <h2>Upload &amp; Analyze</h2>
            <p>
              Drag in a stem, full mix, or field recording. AudioSense parses
              spectral energy, detects transients, and recommends intelligent
              enhancements in seconds.
            </p>
          </div>
          <div className="analysis-panel">
            <div className="drop-card">
              <div className="drop-glow" aria-hidden="true" />
              <div className="drop-content">
                <p className="drop-title">Drag &amp; Drop Audio</p>
                <p className="drop-subtitle">or</p>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="browse-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {audioFile ? audioFile.name : "Browse Files"}
                </button>
                <div className="supported">
                  <span>Supports</span>
                  <div className="badges">
                    <span>.mp3</span>
                    <span>.wav</span>
                    <span>.aiff</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="insight-card">
              <h3>Smart Analysis Preview</h3>
              {isAnalyzing ? (
                <Loader />
              ) : insights ? (
                <div className="insights-preview">
                  <div className="insight-summary-text">
                    <p>{insights.description}</p>
                  </div>

                  <div className="visual-cards">
                    <div className="visual-card">
                      <span className="visual-label">Dynamics</span>
                      <div className="visual-bar-container">
                        <div className="visual-bar" style={{ width: `${insights.dynamicsScore}%` }} />
                      </div>
                      <span className="visual-value">{insights.dynamicsScore}%</span>
                    </div>
                    <div className="visual-card">
                      <span className="visual-label">Brightness</span>
                      <div className="visual-bar-container">
                        <div className="visual-bar" style={{ width: `${insights.brightnessScore}%`, background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)' }} />
                      </div>
                      <span className="visual-value">{insights.brightnessScore}%</span>
                    </div>
                  </div>

                  <div className="insight-row">
                    <span>Duration:</span> <strong>{insights.duration}</strong>
                  </div>
                  <div className="insight-row">
                    <span>Character:</span> <strong>{insights.character}</strong>
                  </div>
                  <div className="insight-row">
                    <span>Tempo:</span> <strong>{insights.avgTempo}</strong>
                  </div>

                  <button
                    type="button"
                    className="analyze-btn"
                    onClick={downloadCsv}
                  >
                    Download Dataset
                  </button>
                </div>
              ) : (
                <>
                  <p>
                    AudioSense prepares an interactive profile with clarity
                    metrics, spectral tilt, stereo imaging, and headroom targets.
                  </p>
                  <ul>
                    <li>Spectral contour mapping &amp; harmonic balance</li>
                    <li>Transient density &amp; rhythmic consistency</li>
                    <li>Noise floor prediction with intelligent gating</li>
                  </ul>
                  <button
                    type="button"
                    className="analyze-btn"
                    onClick={analyzeAudio}
                    disabled={!audioFile}
                  >
                    Analyze Audio
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Audio Visualizations */}
          {visualizations && (
            <AudioVisualizations
              waveform={visualizations.waveform}
              spectrogram={visualizations.spectrogram}
              spectrum={visualizations.spectrum}
            />
          )}

          {/* Audio Controls */}
          {insights && audioDuration > 0 && (
            <AudioControls
              loudness={audioControls.loudness}
              bass={audioControls.bass}
              treble={audioControls.treble}
              pitch={audioControls.pitch}
              timeRange={audioControls.timeRange}
              audioDuration={audioDuration}
              onControlChange={handleControlChange}
            />
          )}

          {insights && (
            <div className="chatbot-section">
              <div className="chatbot-container">
                <div className="chat-history">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role}`}>
                      <div className="message-bubble">{msg.text}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="suggestions-list">
                  {suggestions.map((s, i) => (
                    <button key={i} className="suggestion-chip" onClick={() => handleSuggestionClick(s)}>
                      ✨ {s}
                    </button>
                  ))}
                </div>
                <div className="chat-input-area">
                  <input
                    type="text"
                    placeholder="Ask Gemini to modify the audio..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button className="send-btn" onClick={handleSendMessage}>
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

        </section>

        <section id="insights" className="insights-section">
          <div className="section-heading compact">
            <h2>Insights You Can Trust</h2>
            <p>
              Deep visuals translate complex audio data into calm,
              comprehension. Every metric is surfaced into focused tiles with
              contextual recommendations.
            </p>
          </div>
          <div className="insight-grid">
            <article>
              <h3>Clarity Index</h3>
              <p>
                Pinpoint frequency congestion and receive guided EQ moves for
                surgical cleanup without guesswork.
              </p>
            </article>
            <article>
              <h3>Spatial Field</h3>
              <p>
                Visualize stereo energy distribution and unlock immersive width
                while preserving mono compatibility.
              </p>
            </article>
            <article>
              <h3>Dynamic Sculptor</h3>
              <p>
                Diagnose compression ratios, transient headroom, and loudness
                trends with precision recommendations.
              </p>
            </article>
          </div>
        </section>

        <section id="modify" className="modify-section">
          <div className="section-heading compact">
            <h2>Modify With Intention</h2>
            <p>
              Glide through curated enhancement controls that respond to the
              track&apos;s fingerprint for smart, musical results.
            </p>
          </div>
          <div className="modify-panels">
            <div className="glass-tile">
              <span className="tile-label">Adaptive EQ</span>
              <h3>Sculpt frequencies intuitively</h3>
              <p>
                AI-assisted bell and shelf moves that adapt live as you sweep,
                preserving tonal integrity.
              </p>
            </div>
            <div className="glass-tile">
              <span className="tile-label">Texture Engine</span>
              <h3>Enhance depth &amp; warmth</h3>
              <p>
                Blend harmonic saturation, tape warmth, and subtle modulation
                tailored to your source material.
              </p>
            </div>
            <div className="glass-tile">
              <span className="tile-label">Smart Master</span>
              <h3>Deliver polished masters</h3>
              <p>
                Automatic loudness normalization with export presets for
                streaming, broadcast, and immersive formats.
              </p>
            </div>
          </div>
        </section>

      </main>
      <footer className="footer">
        <span>© {new Date().getFullYear()} AudioSense Labs</span>
        <span>Crafted for premium audio intelligence.</span>
      </footer>
    </div>
  );
}
