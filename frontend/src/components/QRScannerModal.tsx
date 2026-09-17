import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Scan,
  Search,
  UserCheck,
  Users,
  Sparkles,
  SwitchCamera,
  RefreshCw,
  Flashlight,
  FlashlightOff,
  VideoOff,
  Check
} from 'lucide-react';
import jsQR from 'jsqr';
import { api } from '@/services/api';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  busId: string;
  onPassengerBoarded?: (newOccupancy?: number) => void;
  isDemoMode?: boolean;
}

interface ScanResult {
  success: boolean;
  message: string;
  student_name?: string;
  route_id?: string;
  occupancy?: number;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  busId,
  onPassengerBoarded,
  isDemoMode = true
}) => {
  const [passCodeInput, setPassCodeInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [demoPasses, setDemoPasses] = useState<any[]>([]);

  // Camera state
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState<number>(0);
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanCooldown, setScanCooldown] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Sound feedback on successful QR scan
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio playback might be restricted before first user interaction
    }
  }, []);

  // Initialize BarcodeDetector if natively supported by the browser (Chrome / Android)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({
          formats: ['qr_code']
        });
      } catch (e) {
        barcodeDetectorRef.current = null;
      }
    }
  }, []);

  // Load active demo passes from localStorage
  useEffect(() => {
    if (isOpen && isDemoMode) {
      try {
        const stored = localStorage.getItem('campustrack_demo_passes');
        if (stored) {
          setDemoPasses(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Error reading demo passes:', err);
      }
    }
  }, [isOpen, isDemoMode]);

  // Stop camera tracks and cleanup stream
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchEnabled(false);
    setTorchSupported(false);
  }, []);

  // Start camera stream with resilient fallback constraints
  const startCamera = useCallback(async (deviceIndex?: number) => {
    setCameraError(null);
    setCameraLoading(true);

    // Ensure previous stream is stopped
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraLoading(false);
      setCameraError(
        window.isSecureContext === false
          ? 'Camera access requires a secure connection (HTTPS or localhost).'
          : 'Camera API is not supported by your browser.'
      );
      return;
    }

    try {
      // 1. Enumerate available video devices
      let devices: MediaDeviceInfo[] = [];
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        devices = allDevices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(devices);
      } catch (err) {
        console.warn('Could not enumerate video devices:', err);
      }

      const targetIdx = deviceIndex !== undefined ? deviceIndex : currentDeviceIndex;
      const targetDevice = devices[targetIdx];

      // Build primary constraints
      let constraints: MediaStreamConstraints;

      if (targetDevice && targetDevice.deviceId) {
        constraints = {
          video: {
            deviceId: { exact: targetDevice.deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
      } else {
        constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr: any) {
        console.warn('Primary camera constraints failed, attempting fallback to basic video constraint:', firstErr);
        // Fallback to basic { video: true } (resolves OverconstrainedError on Mac/laptops)
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;

      // Check if torch/flashlight is supported on the active video track
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && typeof (videoTrack as any).getCapabilities === 'function') {
        const capabilities = (videoTrack as any).getCapabilities();
        setTorchSupported(Boolean(capabilities && capabilities.torch));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setCameraLoading(false);

      // Re-enumerate to populate device labels now that permission is granted
      try {
        const updatedAll = await navigator.mediaDevices.enumerateDevices();
        const updatedVideos = updatedAll.filter((d) => d.kind === 'videoinput');
        if (updatedVideos.length > 0) {
          setVideoDevices(updatedVideos);
        }
      } catch (e) {
        // ignore
      }
    } catch (err: any) {
      console.error('Camera initialization failed:', err);
      setCameraLoading(false);
      setCameraActive(false);

      let msg = 'Failed to open camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please click the camera icon in your browser address bar to allow camera access, then retry.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device detected on this system. You can verify passes using the manual code input or presets below.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is in use by another app or tab (e.g. Zoom, FaceTime). Please close other camera apps and retry.';
      } else if (err.name === 'OverconstrainedError') {
        msg = 'Requested camera resolution or facing mode is not supported by your camera hardware.';
      } else if (err.message) {
        msg = err.message;
      }
      setCameraError(msg);
    }
  }, [currentDeviceIndex, stopCamera]);

  // Flip / switch camera device
  const handleSwitchCamera = () => {
    if (videoDevices.length <= 1) return;
    const nextIdx = (currentDeviceIndex + 1) % videoDevices.length;
    setCurrentDeviceIndex(nextIdx);
    startCamera(nextIdx);
  };

  // Toggle Torch/Flashlight
  const handleToggleTorch = async () => {
    if (!streamRef.current || !torchSupported) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextState = !torchEnabled;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchEnabled(nextState);
    } catch (e) {
      console.warn('Error toggling flashlight:', e);
    }
  };

  // Main verification handler
  const handleVerify = async (codeToVerify: string) => {
    if (!codeToVerify.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      if (isDemoMode) {
        await new Promise((resolve) => setTimeout(resolve, 350));

        const stored = localStorage.getItem('campustrack_demo_passes');
        const passes: any[] = stored ? JSON.parse(stored) : [];
        const foundPass = passes.find(
          (p) => p.pass_code.toUpperCase() === codeToVerify.trim().toUpperCase()
        );

        if (foundPass) {
          if (foundPass.status === 'boarded') {
            setResult({
              success: false,
              message: `Pass already used! ${foundPass.student_name} boarded previously.`,
              student_name: foundPass.student_name,
              route_id: foundPass.route_id
            });
          } else {
            foundPass.status = 'boarded';
            foundPass.scanned_at = new Date().toISOString();
            foundPass.scanned_by_bus_id = busId;
            localStorage.setItem('campustrack_demo_passes', JSON.stringify(passes));
            setDemoPasses([...passes]);

            setResult({
              success: true,
              message: `Boarding Verified! Registered on Bus ${busId}.`,
              student_name: foundPass.student_name,
              route_id: foundPass.route_id
            });

            if (onPassengerBoarded) {
              onPassengerBoarded();
            }
          }
        } else if (codeToVerify.startsWith('INVALID')) {
          setResult({
            success: false,
            message: `Pass code '${codeToVerify}' not found in campus registry.`
          });
        } else {
          // Fallback demo student validation for arbitrary scanned codes
          const mockNames: Record<string, string> = {
            aarav: 'Aarav Sharma',
            ananya: 'Ananya Verma',
            rohit: 'Rohit Patel',
            priya: 'Priya Singh'
          };
          const key = Object.keys(mockNames).find((k) =>
            codeToVerify.toLowerCase().includes(k)
          );
          const name = key ? mockNames[key] : 'Student Passenger';

          setResult({
            success: true,
            message: `Boarding Approved! Validated for Bus ${busId}.`,
            student_name: name,
            route_id: 'ALL'
          });

          if (onPassengerBoarded) {
            onPassengerBoarded();
          }
        }
      } else {
        const data = await api.verifyPass(codeToVerify.trim(), busId);
        setResult(data);
        if (data.success && onPassengerBoarded) {
          onPassengerBoarded(data.occupancy);
        }
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setResult({
        success: false,
        message: err.message || 'Error communicating with pass validation service.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Called whenever a QR code is detected from camera frames
  const handleCodeScanned = useCallback(
    (codeText: string) => {
      if (scanCooldown) return;
      const cleanCode = codeText.trim();
      if (!cleanCode) return;

      playBeep();
      setLastScannedCode(cleanCode);
      setPassCodeInput(cleanCode);
      setScanCooldown(true);

      // Trigger verification
      handleVerify(cleanCode);

      // 2.5s cooldown before re-scanning the same or new codes
      setTimeout(() => {
        setScanCooldown(false);
      }, 2500);
    },
    [scanCooldown, playBeep, isDemoMode, busId]
  );

  // Frame processing loop for scanning QR codes
  useEffect(() => {
    if (!cameraActive) return;

    let isScanning = true;

    const processFrame = async (timestamp: number) => {
      if (!isScanning) return;

      // Throttle scanning to every 120ms to conserve CPU
      if (timestamp - lastFrameTimeRef.current >= 120 && !scanCooldown) {
        lastFrameTimeRef.current = timestamp;

        const video = videoRef.current;
        if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          // 1. Try native BarcodeDetector if available
          if (barcodeDetectorRef.current) {
            try {
              const barcodes = await barcodeDetectorRef.current.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleCodeScanned(barcodes[0].rawValue);
              }
            } catch (err) {
              // Fallback to jsQR below
            }
          }

          // 2. jsQR engine (fallback and primary cross-platform decoder)
          if (!scanCooldown && video.videoWidth > 0 && video.videoHeight > 0) {
            let canvas = canvasRef.current;
            if (!canvas) {
              canvas = document.createElement('canvas');
              canvasRef.current = canvas;
            }

            // Downsample slightly for maximum performance if high-res stream
            const maxDim = 640;
            let targetW = video.videoWidth;
            let targetH = video.videoHeight;
            if (targetW > maxDim || targetH > maxDim) {
              const ratio = Math.min(maxDim / targetW, maxDim / targetH);
              targetW = Math.floor(targetW * ratio);
              targetH = Math.floor(targetH * ratio);
            }

            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, targetW, targetH);
              const imageData = ctx.getImageData(0, 0, targetW, targetH);
              const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
              });

              if (qrResult && qrResult.data) {
                handleCodeScanned(qrResult.data);
              }
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(processFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(processFrame);

    return () => {
      isScanning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [cameraActive, scanCooldown, handleCodeScanned]);

  // Automatically start camera when modal opens, and stop when modal closes
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setPassCodeInput('');
      setLastScannedCode(null);
      setScanCooldown(false);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickBoard = (code: string) => {
    setPassCodeInput(code);
    handleVerify(code);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          setResult(null);
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-slate-900 text-white rounded-3xl shadow-2xl border border-indigo-500/30 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Live QR Scanner</span>
                {cameraActive && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Assigned Unit: <span className="font-semibold text-indigo-400">{busId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              setResult(null);
              onClose();
            }}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Close Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Real Live Camera Viewfinder */}
          <div className="relative h-64 w-full rounded-2xl bg-black overflow-hidden flex flex-col items-center justify-center border-2 border-indigo-500/40 shadow-inner">
            {/* Native Video Stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                cameraActive ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Hidden Off-Screen Canvas for Frame Analysis */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder Target Framing Brackets */}
            <div className="absolute inset-8 pointer-events-none flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl shadow-sm" />
                <div className="w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl shadow-sm" />
              </div>
              <div className="flex justify-between">
                <div className="w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl shadow-sm" />
                <div className="w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-xl shadow-sm" />
              </div>
            </div>

            {/* Animated Scanning Laser Line */}
            {cameraActive && !scanCooldown && (
              <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse top-1/2 -translate-y-1/2 pointer-events-none" />
            )}

            {/* Flash Overlay when QR is successfully recognized */}
            {scanCooldown && (
              <div className="absolute inset-0 bg-emerald-500/25 border-4 border-emerald-400 rounded-2xl flex items-center justify-center backdrop-blur-[1px] animate-fade-in pointer-events-none">
                <div className="p-3 bg-emerald-950/90 rounded-2xl border border-emerald-400 text-emerald-300 flex items-center gap-2 shadow-2xl">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 animate-bounce" />
                  <span className="text-xs font-bold font-mono">QR DETECTED: {lastScannedCode}</span>
                </div>
              </div>
            )}

            {/* Viewfinder Overlay Controls (Camera switch, torch, restart) */}
            {cameraActive && (
              <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
                {torchSupported && (
                  <button
                    onClick={handleToggleTorch}
                    className={`p-2 rounded-xl backdrop-blur-md transition-all text-xs flex items-center justify-center ${
                      torchEnabled
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-black/60 hover:bg-black/80 text-amber-300'
                    }`}
                    title={torchEnabled ? 'Turn Torch Off' : 'Turn Torch On'}
                  >
                    {torchEnabled ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
                  </button>
                )}

                {videoDevices.length > 1 && (
                  <button
                    onClick={handleSwitchCamera}
                    className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-indigo-300 backdrop-blur-md transition-all text-xs flex items-center gap-1"
                    title="Flip Camera (Front/Back)"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Placeholder when Camera is Loading */}
            {cameraLoading && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-4 space-y-2 z-10">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-xs font-semibold text-slate-200">Initializing Camera...</p>
                <p className="text-[11px] text-slate-400">Please allow camera permissions if prompted</p>
              </div>
            )}

            {/* Error or Inactive State */}
            {!cameraActive && !cameraLoading && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
                <div className="p-3 rounded-full bg-rose-500/20 text-rose-400">
                  <VideoOff className="w-8 h-8" />
                </div>
                <div className="max-w-xs space-y-1">
                  <p className="text-xs font-semibold text-rose-300">Camera Unavailable</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {cameraError || 'Camera could not be activated.'}
                  </p>
                </div>
                <button
                  onClick={() => startCamera()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera Access</span>
                </button>
              </div>
            )}

            {/* Live scanning guidance subtitle */}
            {cameraActive && (
              <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
                <span className="text-[11px] bg-slate-950/75 text-indigo-200 px-3 py-1 rounded-full border border-indigo-500/30 backdrop-blur-sm">
                  Align Student QR code inside the frame
                </span>
              </div>
            )}
          </div>

          {/* Verification Result Feedback Popup */}
          {result && (
            <div
              className={`p-4 rounded-2xl border flex items-start space-x-3 transition-all ${
                result.success
                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                  : 'bg-rose-950/70 border-rose-500/60 text-rose-200'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-xs">
                <p className="font-bold text-sm">
                  {result.success ? '✓ Boarding Approved' : 'Validation Alert'}
                </p>
                <p>{result.message}</p>
                {result.student_name && (
                  <p className="font-medium text-emerald-300 pt-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" /> Student: {result.student_name}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 1-Click Easy Boarding Presets */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 1-Click Fast Boarding:
            </p>

            {/* List any real student passes created in this session */}
            {demoPasses.length > 0 ? (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {demoPasses.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickBoard(p.pass_code)}
                    disabled={loading}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-medium flex items-center justify-between transition-all border ${
                      p.status === 'boarded'
                        ? 'bg-slate-800/40 border-slate-700/50 text-slate-400'
                        : 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/40 text-indigo-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-400" />
                      <span>
                        {p.student_name} ({p.pass_code})
                      </span>
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-400">
                      {p.status === 'boarded' ? 'Already Boarded' : '⚡ Click to Board'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickBoard('PASS-20260903-AARAV88')}
                  disabled={loading}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-indigo-300 flex items-center justify-between transition-colors"
                >
                  <span>⚡ Board Aarav</span>
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => handleQuickBoard('PASS-20260903-ANANYA88')}
                  disabled={loading}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-indigo-300 flex items-center justify-between transition-colors"
                >
                  <span>⚡ Board Ananya</span>
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            )}
          </div>

          {/* Manual Pass Code Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Or Paste / Enter Pass Code Manually:</label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="e.g. PASS-20260903-..."
                value={passCodeInput}
                onChange={(e) => setPassCodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleVerify(passCodeInput);
                  }
                }}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                onClick={() => handleVerify(passCodeInput)}
                disabled={loading || !passCodeInput.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>{loading ? 'Checking...' : 'Verify'}</span>
              </button>
            </div>
          </div>

          {/* Bottom Close Button */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                stopCamera();
                setResult(null);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            >
              Done / Close Scanner
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
