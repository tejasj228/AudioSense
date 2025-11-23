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
  const [isGeneratingVisualizations, setIsGeneratingVisualizations] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState('');
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [chatMode, setChatMode] = useState<'ask' | 'modify'>('ask');
  const [modifiedAudioUrl, setModifiedAudioUrl] = useState<string | null>(null);
  const [showChatAudioPlayer, setShowChatAudioPlayer] = useState(false);
  const [isChatAudioPlaying, setIsChatAudioPlaying] = useState(false);
  const [modifiedDatasetUrl, setModifiedDatasetUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const visualizationRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const chatAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Scroll to top on page load/refresh
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Disable scrolling when loading
  useEffect(() => {
    if (isAnalyzing || isGeneratingVisualizations || isProcessing) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAnalyzing, isGeneratingVisualizations, isProcessing]);

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
    setIsGeneratingVisualizations(true);
    setLoadingProgress(0);
    setLoadingStep('Loading audio file...');
    setAnalysisData(null);
    setInsights(null);
    setChatMessages([]);
    setSuggestions([]);
    setVisualizations(null);

    try {
      setLoadingProgress(10);
      const arrayBuffer = await audioFile.arrayBuffer();
      setLoadingStep('Decoding audio...');
      setLoadingProgress(20);
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      setLoadingStep('Extracting audio features...');
      setLoadingProgress(30);

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
      const totalChunks = Math.ceil(channelData.length / samplesPerChunk);
      let chunkIndex = 0;

      for (let i = 0; i < channelData.length; i += samplesPerChunk) {
        chunkIndex++;
        if (chunkIndex % 10 === 0) {
          const progress = 30 + Math.floor((chunkIndex / totalChunks) * 20);
          setLoadingProgress(Math.min(progress, 50));
        }
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

      setLoadingProgress(50);
      setLoadingStep('Analysis complete!');
      setChatMessages([{ role: 'bot', text: "Analysis complete. I've generated a dataset of your audio. How would you like to modify it?" }]);
      setAnalysisData(encodeURI(csvContent));
      setAudioDuration(duration);
      setAudioControls(prev => ({ ...prev, timeRange: [0, duration] }));
      
      setIsAnalyzing(false);

      // Call Python backend for visualizations (runs in parallel)
      await generateVisualizations();

    } catch (error) {
      console.error("Error analyzing audio:", error);
      alert("Error analyzing audio file.");
      setIsAnalyzing(false);
      setIsGeneratingVisualizations(false);
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
      setLoadingStep('📤 Sending audio to backend...');
      setLoadingProgress(55);
      const formData = new FormData();
      formData.append('audio', audioFile);

      setLoadingStep('Loading audio file...');
      setLoadingProgress(60);
      
      // Start the fetch request
      const fetchPromise = fetch('http://localhost:5000/api/visualize', {
        method: 'POST',
        body: formData,
        mode: 'cors'
      });
      
      // Simulate progress updates while waiting for response
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev < 65) {
            setLoadingStep('Loading audio file...');
            return prev + 1;
          } else if (prev < 75) {
            setLoadingStep('Generating waveform...');
            return prev + 1;
          } else if (prev < 85) {
            setLoadingStep('Generating spectrogram...');
            return prev + 1;
          } else if (prev < 92) {
            setLoadingStep('Generating spectrum...');
            return prev + 1;
          }
          return prev;
        });
      }, 300);
      
      const res = await fetchPromise;
      clearInterval(progressInterval);
      
      setLoadingStep('Finalizing...');
      setLoadingProgress(95);

      if (!res.ok) {
        throw new Error('Failed to generate visualizations');
      }
      
      const data = await res.json();

      if (data.success && data.visualizations) {
        setLoadingStep('Complete!');
        setLoadingProgress(100);
        setVisualizations(data.visualizations);
        
        // Scroll to visualization section after a brief delay
        setTimeout(() => {
          visualizationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    } catch (e) {
      console.error('Error generating visualizations:', e);
    } finally {
      setIsGeneratingVisualizations(false);
      setLoadingProgress(0);
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

    if (chatMode === 'ask') {
      // Ask mode - just chat
      try {
        const res = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "chat",
            messages: newMessages,
            context: insights ? `Character: ${insights.character}. Description: ${insights.description}. Dataset summary: ${analysisData ? 'Available' : 'Not available'}` : ""
          })
        });

        const data = await res.json();
        setChatMessages(prev => [...prev, { role: 'bot', text: data.text || "I couldn't process that." }]);

      } catch (e) {
        console.error("Chat error", e);
        setChatMessages(prev => [...prev, { role: 'bot', text: "Sorry, I encountered an error connecting to Gemini." }]);
      }
    } else {
      // Modify mode - apply modifications and generate audio
      if (!audioFile || !analysisData) {
        setChatMessages(prev => [...prev, { role: 'bot', text: "Please analyze audio first before making modifications." }]);
        return;
      }

      setIsProcessing(true);
      setLoadingProgress(0);
      setLoadingStep('Understanding your request...');

      try {
        setLoadingProgress(20);
        // Get modification from Gemini
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
          setLoadingStep('Modifying dataset...');
          setLoadingProgress(40);
          
          // Apply modification to dataset
          applyModification(data);
          
          setLoadingStep('Applying changes to audio...');
          setLoadingProgress(60);
          
          // Convert modified dataset to blob
          const csvData = decodeURIComponent(analysisData.replace('data:text/csv;charset=utf-8,', ''));
          const csvBlob = new Blob([csvData], { type: 'text/csv' });
          
          // Send to backend to apply to audio
          const formData = new FormData();
          formData.append('audio', audioFile);
          formData.append('dataset', csvBlob, 'modified_dataset.csv');

          setLoadingProgress(70);
          const audioRes = await fetch('http://localhost:5000/api/apply-dataset', {
            method: 'POST',
            body: formData,
            mode: 'cors'
          });

          if (!audioRes.ok) {
            throw new Error('Failed to apply modifications to audio');
          }

          setLoadingProgress(90);
          setLoadingStep('Loading modified audio...');
          
          const audioBlob = await audioRes.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // Store new audio without revoking - keep previous modifications in history
          setModifiedAudioUrl(audioUrl);
          setModifiedDatasetUrl(analysisData);
          setShowChatAudioPlayer(true);
          setLoadingProgress(100);
          
          setChatMessages(prev => [...prev, { role: 'bot', text: data.message + "\n\nModified audio is ready! Use the preview and download buttons below." }]);
        } else {
          setChatMessages(prev => [...prev, { role: 'bot', text: data.text || "I couldn't understand that modification request. Try something like 'make it louder' or 'boost brightness'." }]);
        }

      } catch (e) {
        console.error("Modification error", e);
        setChatMessages(prev => [...prev, { role: 'bot', text: "Sorry, I encountered an error applying modifications." }]);
      } finally {
        setIsProcessing(false);
        setLoadingProgress(0);
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setChatInput(suggestion);
    // Optional: Auto-send could be enabled here if desired
  };

  const handleApplyChanges = async () => {
    if (!audioFile) return;

    // Stop any playing audio
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setIsPlaying(false);
    setShowAudioPlayer(false);

    setIsProcessing(true);
    setLoadingProgress(0);
    setLoadingStep('🎵 Preparing audio...');
    try {
      setLoadingProgress(10);
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('params', JSON.stringify({
        loudness: audioControls.loudness,
        bass: audioControls.bass,
        treble: audioControls.treble,
        pitch: audioControls.pitch,
        timeRange: audioControls.timeRange,
        preview: false
      }));

      setLoadingStep('Sending audio to server...');
      setLoadingProgress(30);

      const fetchPromise = fetch('http://localhost:5000/api/process-audio', {
        method: 'POST',
        body: formData,
        mode: 'cors'
      });

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev < 50) {
            setLoadingStep('Applying bass/treble filters...');
            return prev + 2;
          } else if (prev < 70) {
            setLoadingStep('Adjusting pitch...');
            return prev + 2;
          } else if (prev < 85) {
            setLoadingStep('Applying loudness...');
            return prev + 2;
          } else if (prev < 95) {
            setLoadingStep('Finalizing...');
            return prev + 1;
          }
          return prev;
        });
      }, 200);

      const res = await fetchPromise;
      clearInterval(progressInterval);
      setLoadingProgress(98);

      if (!res.ok) {
        throw new Error('Failed to process audio');
      }

      setLoadingStep('Saving processed audio...');
      const blob = await res.blob();
      setLoadingProgress(100);
      const url = URL.createObjectURL(blob);
      setProcessedAudioUrl(url);
    } catch (e) {
      console.error('Error processing audio:', e);
      alert('Error processing audio. Make sure the Python server is running.');
    } finally {
      setIsProcessing(false);
      setLoadingProgress(0);
    }
  };

  const handlePreview = async () => {
    if (!audioFile) return;

    // Stop any playing audio
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setShowAudioPlayer(false);
    setPreviewAudioUrl(null);

    setIsProcessing(true);
    setLoadingProgress(0);
    setLoadingStep('Preparing preview...');
    try {
      setLoadingProgress(20);
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('params', JSON.stringify({
        loudness: audioControls.loudness,
        bass: audioControls.bass,
        treble: audioControls.treble,
        pitch: audioControls.pitch,
        timeRange: audioControls.timeRange,
        preview: true // Only process the selected time range
      }));

      setLoadingStep('Processing preview...');
      setLoadingProgress(50);

      const fetchPromise = fetch('http://localhost:5000/api/process-audio', {
        method: 'POST',
        body: formData,
        mode: 'cors'
      });

      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => Math.min(prev + 5, 90));
      }, 200);

      const res = await fetchPromise;
      clearInterval(progressInterval);
      setLoadingProgress(95);

      if (!res.ok) {
        throw new Error('Failed to process audio preview');
      }

      setLoadingStep('Loading player...');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setLoadingProgress(100);
      
      // Set up audio player
      setPreviewAudioUrl(url);
      setShowAudioPlayer(true);
    } catch (e) {
      console.error('Error previewing audio:', e);
      alert('❌ Error previewing audio. Make sure the Python server is running.');
    } finally {
      setIsProcessing(false);
      setLoadingProgress(0);
    }
  };

  const togglePlayPause = () => {
    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
      } else {
        audioPlayerRef.current.play();
      }
    }
  };

  const toggleChatAudioPlayPause = () => {
    if (chatAudioPlayerRef.current) {
      if (isChatAudioPlaying) {
        chatAudioPlayerRef.current.pause();
      } else {
        chatAudioPlayerRef.current.play();
      }
    }
  };

  const handleChatDownload = () => {
    if (!modifiedAudioUrl) {
      alert('No modified audio available.');
      return;
    }

    const link = document.createElement('a');
    link.href = modifiedAudioUrl;
    link.download = `gemini_modified_${audioFile?.name || 'audio'}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadDataset = () => {
    if (!modifiedDatasetUrl) {
      alert('No modified dataset available.');
      return;
    }

    const link = document.createElement('a');
    link.href = modifiedDatasetUrl;
    link.download = `modified_dataset_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearChat = () => {
    setChatMessages([]);
    setChatInput('');
    setModifiedAudioUrl(null);
    setModifiedDatasetUrl(null);
    setShowChatAudioPlayer(false);
    setIsChatAudioPlaying(false);
    if (chatAudioPlayerRef.current) {
      chatAudioPlayerRef.current.pause();
      chatAudioPlayerRef.current = null;
    }
  };

  // Hide audio player when switching to Ask mode
  useEffect(() => {
    if (chatMode === 'ask') {
      setShowChatAudioPlayer(false);
      if (chatAudioPlayerRef.current) {
        chatAudioPlayerRef.current.pause();
      }
      setIsChatAudioPlaying(false);
    }
  }, [chatMode]);

  const drawWaveform = (audioUrl: string) => {
    const canvas = document.getElementById('waveform-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
    }

    // Fetch and decode audio
    fetch(audioUrl)
      .then(res => res.arrayBuffer())
      .then(arrayBuffer => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        return audioContext.decodeAudioData(arrayBuffer);
      })
      .then(audioBuffer => {
        const rawData = audioBuffer.getChannelData(0); // Get first channel
        const samples = 100; // Number of bars
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];

        for (let i = 0; i < samples; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          filteredData.push(sum / blockSize);
        }

        // Normalize data
        const multiplier = Math.pow(Math.max(...filteredData), -1);
        const normalizedData = filteredData.map(n => n * multiplier);

        // Draw waveform
        const barWidth = canvas.width / samples;
        const barGap = 1;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        normalizedData.forEach((value, i) => {
          const barHeight = value * canvas.height * 0.8;
          const x = i * barWidth;
          const y = (canvas.height - barHeight) / 2;

          // Create gradient for each bar
          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, '#6c8bff');
          gradient.addColorStop(1, '#a873ff');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, barWidth - barGap, barHeight);
        });
      })
      .catch(() => {
        // Fallback: draw random bars
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bars = 100;
        const barWidth = canvas.width / bars;
        
        for (let i = 0; i < bars; i++) {
          const barHeight = Math.random() * canvas.height * 0.6;
          const x = i * barWidth;
          const y = (canvas.height - barHeight) / 2;

          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, '#6c8bff');
          gradient.addColorStop(1, '#a873ff');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, barWidth - 1, barHeight);
        }
      });
  };

  const handleDownload = () => {
    if (!processedAudioUrl) {
      alert('Please click "Apply Changes" first to process the audio.');
      return;
    }

    const link = document.createElement('a');
    link.href = processedAudioUrl;
    link.download = `processed_${audioFile?.name || 'audio'}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-shell">
      {/* Global Loader Overlay */}
      {(isAnalyzing || isGeneratingVisualizations || isProcessing) && (
        <div className="global-loader-overlay">
          <div className="global-loader-content">
            <Loader progress={loadingProgress} message={loadingStep} />
          </div>
        </div>
      )}
      <div className="ambient-grid" aria-hidden="true" />
      <header className="floating-header">
        <div className="header-inner">
          <span className="brand">AudioSense</span>
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
            <div ref={visualizationRef}>
              <AudioVisualizations
                waveform={visualizations.waveform}
                spectrogram={visualizations.spectrogram}
                spectrum={visualizations.spectrum}
              />
            </div>
          )}

          {/* Audio Controls */}
          {insights && audioDuration > 0 && (
            <>
              <AudioControls
                loudness={audioControls.loudness}
                bass={audioControls.bass}
                treble={audioControls.treble}
                pitch={audioControls.pitch}
                timeRange={audioControls.timeRange}
                audioDuration={audioDuration}
                onControlChange={handleControlChange}
                onApply={handleApplyChanges}
                onPreview={handlePreview}
                onDownload={handleDownload}
                isProcessing={isProcessing}
              />

              {/* Audio Player */}
              {showAudioPlayer && previewAudioUrl && (
                <div className="audio-player-section">
                  <div className="audio-player-container">
                    <h4 className="player-title">🎵 Preview Player</h4>
                    <div className="soundcloud-player">
                      <button 
                        className="play-pause-btn-main" 
                        onClick={togglePlayPause}
                      >
                        {isPlaying ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <rect x="6" y="4" width="4" height="16" rx="1"/>
                            <rect x="14" y="4" width="4" height="16" rx="1"/>
                          </svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </button>
                      <div className="waveform-container" onClick={(e) => {
                        if (!audioPlayerRef.current) return;
                        const container = e.currentTarget;
                        const rect = container.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percentage = x / rect.width;
                        audioPlayerRef.current.currentTime = audioPlayerRef.current.duration * percentage;
                      }}>
                        <canvas id="waveform-canvas" className="waveform-canvas"></canvas>
                        <div className="progress-overlay" id="progress-overlay"></div>
                      </div>
                      <div className="time-display">
                        <span id="current-time">0:00</span>
                        <span id="duration-time">0:00</span>
                      </div>
                    </div>
                    <audio 
                      src={previewAudioUrl} 
                      className="hidden-audio"
                      autoPlay
                      onTimeUpdate={(e) => {
                        const audio = e.currentTarget;
                        if (!audio.duration) return;
                        const progress = (audio.currentTime / audio.duration) * 100;
                        const overlay = document.getElementById('progress-overlay');
                        const currentTime = document.getElementById('current-time');
                        if (overlay) overlay.style.width = `${progress}%`;
                        if (currentTime) {
                          const mins = Math.floor(audio.currentTime / 60);
                          const secs = Math.floor(audio.currentTime % 60);
                          currentTime.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                        }
                      }}
                      onLoadedMetadata={(e) => {
                        const audio = e.currentTarget;
                        const durationTime = document.getElementById('duration-time');
                        if (durationTime) {
                          const mins = Math.floor(audio.duration / 60);
                          const secs = Math.floor(audio.duration % 60);
                          durationTime.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                        }
                        // Draw waveform
                        if (previewAudioUrl) {
                          drawWaveform(previewAudioUrl);
                        }
                      }}
                      onEnded={() => setIsPlaying(false)}
                      onPause={() => setIsPlaying(false)}
                      onPlay={() => setIsPlaying(true)}
                      ref={(el) => {
                        if (el) audioPlayerRef.current = el;
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {insights && (
            <div className="chatbot-section">
              <div className="chatbot-container">
                {/* Clear Chat Button */}
                <div className="chat-header">
                  <div className="chat-mode-toggle">
                    <button 
                      className={`mode-btn ${chatMode === 'ask' ? 'active' : ''}`}
                      onClick={() => setChatMode('ask')}
                    >
                      Ask
                    </button>
                    <button 
                      className={`mode-btn ${chatMode === 'modify' ? 'active' : ''}`}
                      onClick={() => setChatMode('modify')}
                    >
                      Modify
                    </button>
                  </div>
                  <button className="clear-chat-btn" onClick={handleClearChat}>
                    Clear Chat
                  </button>
                </div>

                <div className="chat-history">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role}`}>
                      <div className="message-bubble">{msg.text}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Modified Audio Player in Chat - SoundCloud Style */}
                {showChatAudioPlayer && modifiedAudioUrl && (
                  <div className="chat-audio-section">
                    <h4 className="chat-audio-title">Modified Audio</h4>
                    <div className="soundcloud-player-chat">
                      <button 
                        className="play-pause-btn-chat"
                        onClick={toggleChatAudioPlayPause}
                      >
                        {isChatAudioPlaying ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <rect x="6" y="4" width="4" height="16" rx="1"/>
                            <rect x="14" y="4" width="4" height="16" rx="1"/>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </button>
                      <div className="waveform-container-chat" onClick={(e) => {
                        if (!chatAudioPlayerRef.current) return;
                        const container = e.currentTarget;
                        const rect = container.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percentage = x / rect.width;
                        chatAudioPlayerRef.current.currentTime = chatAudioPlayerRef.current.duration * percentage;
                      }}>
                        <canvas id="waveform-canvas-chat" className="waveform-canvas-chat"></canvas>
                        <div id="progress-overlay-chat" className="progress-overlay-chat"></div>
                      </div>
                      <div className="time-display-chat">
                        <span id="current-time-chat">0:00</span>
                        <span id="duration-time-chat">0:00</span>
                      </div>
                    </div>
                    <div className="chat-audio-controls">
                      <button 
                        className="chat-audio-btn download-btn"
                        onClick={handleChatDownload}
                      >
                        Download Audio
                      </button>
                      <button 
                        className="chat-audio-btn dataset-btn"
                        onClick={handleDownloadDataset}
                      >
                        Download Dataset
                      </button>
                    </div>
                    <audio 
                      src={modifiedAudioUrl}
                      className="hidden-audio"
                      autoPlay
                      onTimeUpdate={(e) => {
                        const audio = e.currentTarget;
                        if (!audio.duration) return;
                        const progress = (audio.currentTime / audio.duration) * 100;
                        const overlay = document.getElementById('progress-overlay-chat');
                        const currentTime = document.getElementById('current-time-chat');
                        if (overlay) overlay.style.width = `${progress}%`;
                        if (currentTime) {
                          const mins = Math.floor(audio.currentTime / 60);
                          const secs = Math.floor(audio.currentTime % 60);
                          currentTime.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                        }
                      }}
                      onLoadedMetadata={(e) => {
                        const audio = e.currentTarget;
                        const durationTime = document.getElementById('duration-time-chat');
                        if (durationTime) {
                          const mins = Math.floor(audio.duration / 60);
                          const secs = Math.floor(audio.duration % 60);
                          durationTime.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                        }
                        if (modifiedAudioUrl) {
                          const canvas = document.getElementById('waveform-canvas-chat') as HTMLCanvasElement;
                          if (canvas) {
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              const container = canvas.parentElement;
                              if (container) {
                                canvas.width = container.offsetWidth;
                                canvas.height = container.offsetHeight;
                              }
                              fetch(modifiedAudioUrl)
                                .then(res => res.arrayBuffer())
                                .then(arrayBuffer => {
                                  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                                  return audioContext.decodeAudioData(arrayBuffer);
                                })
                                .then(audioBuffer => {
                                  const rawData = audioBuffer.getChannelData(0);
                                  const samples = 80;
                                  const blockSize = Math.floor(rawData.length / samples);
                                  const filteredData: number[] = [];
                                  for (let i = 0; i < samples; i++) {
                                    let blockStart = blockSize * i;
                                    let sum = 0;
                                    for (let j = 0; j < blockSize; j++) {
                                      sum += Math.abs(rawData[blockStart + j]);
                                    }
                                    filteredData.push(sum / blockSize);
                                  }
                                  const multiplier = Math.pow(Math.max(...filteredData), -1);
                                  const normalizedData = filteredData.map(n => n * multiplier);
                                  const barWidth = canvas.width / samples;
                                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                                  normalizedData.forEach((value, i) => {
                                    const barHeight = value * canvas.height * 0.75;
                                    const x = i * barWidth;
                                    const y = (canvas.height - barHeight) / 2;
                                    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                                    gradient.addColorStop(0, '#6c8bff');
                                    gradient.addColorStop(1, '#a873ff');
                                    ctx.fillStyle = gradient;
                                    ctx.fillRect(x, y, barWidth - 1, barHeight);
                                  });
                                })
                                .catch(() => {
                                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                                  const bars = 80;
                                  const barWidth = canvas.width / bars;
                                  for (let i = 0; i < bars; i++) {
                                    const barHeight = Math.random() * canvas.height * 0.6;
                                    const x = i * barWidth;
                                    const y = (canvas.height - barHeight) / 2;
                                    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                                    gradient.addColorStop(0, '#6c8bff');
                                    gradient.addColorStop(1, '#a873ff');
                                    ctx.fillStyle = gradient;
                                    ctx.fillRect(x, y, barWidth - 1, barHeight);
                                  }
                                });
                            }
                          }
                        }
                      }}
                      onEnded={() => setIsChatAudioPlaying(false)}
                      onPause={() => setIsChatAudioPlaying(false)}
                      onPlay={() => setIsChatAudioPlaying(true)}
                      ref={(el) => {
                        if (el) chatAudioPlayerRef.current = el;
                      }}
                    />
                  </div>
                )}

                {chatMode === 'ask' && suggestions.length > 0 && (
                  <div className="suggestions-list">
                    {suggestions.map((s, i) => (
                      <button key={i} className="suggestion-chip" onClick={() => handleSuggestionClick(s)}>
                         {s}
                      </button>
                    ))}
                  </div>
                )}

                <div className="chat-input-area">
                  <input
                    type="text"
                    placeholder={chatMode === 'ask' ? "Ask about your audio..." : "Describe your modification..."}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button className="send-btn" onClick={handleSendMessage}>
                    {chatMode === 'ask' ? ' Ask' : ' Modify'}
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
