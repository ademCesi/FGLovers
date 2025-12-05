import type { ChangeEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import fragmentShaderSource from './shaders/visualizer.frag.glsl?raw'
import vertexShaderSource from './shaders/screen.vert.glsl?raw'
import './Visualizer.css'

type SourceType = 'mic' | 'file' | null
type ViewMode = 'shader' | 'fft' | 'player'

type AudioListeners = {
  timeupdate: () => void
  loadedmetadata: () => void
  play: () => void
  pause: () => void
  ended: () => void
}

const BIN_COUNT = 64

const compileShader = (
  gl: WebGLRenderingContext,
  source: string,
  type: number
): WebGLShader | null => {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  const ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
  if (!ok) {
    console.error(gl.getShaderInfoLog(shader) ?? 'Erreur de compilation du shader')
    gl.deleteShader(shader)
    return null
  }
  return shader
}

const createProgram = (
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram | null => {
  const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER)
  const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER)
  if (!vertexShader || !fragmentShader) return null

  const program = gl.createProgram()
  if (!program) return null

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  const ok = gl.getProgramParameter(program, gl.LINK_STATUS)
  if (!ok) {
    console.error(gl.getProgramInfoLog(program) ?? 'Erreur de linkage du shader')
    gl.deleteProgram(program)
    return null
  }

  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  return program
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VisualizerPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fftCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const fftCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const glRef = useRef<WebGLRenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const uniformsRef = useRef<{
    resolution: WebGLUniformLocation | null
    time: WebGLUniformLocation | null
    bins: WebGLUniformLocation | null
    bass: WebGLUniformLocation | null
    mids: WebGLUniformLocation | null
    highs: WebGLUniformLocation | null
  }>({
    resolution: null,
    time: null,
    bins: null,
    bass: null,
    mids: null,
    highs: null
  })
  const animationRef = useRef<number | null>(null)
  const viewRef = useRef<ViewMode>('shader')

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const sourceNodeRef = useRef<AudioNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaElementRef = useRef<HTMLAudioElement | null>(null)
  const mediaListenersRef = useRef<AudioListeners | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const binsRef = useRef<Float32Array>(new Float32Array(BIN_COUNT))

  const [source, setSource] = useState<SourceType>(null)
  const [view, setView] = useState<ViewMode>('shader')
  const [status, setStatus] = useState('Choisissez une source audio')
  const [error, setError] = useState<string | null>(null)
  const [trackName, setTrackName] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)

  useEffect(() => {
    viewRef.current = view
  }, [view])

  const ensureAudioGraph = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    const ctx = audioContextRef.current
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.85
      analyserRef.current = analyser
      frequencyDataRef.current = new Uint8Array(
        analyser.frequencyBinCount
      ) as Uint8Array<ArrayBuffer>
    }
    if (!gainRef.current) {
      const gain = ctx.createGain()
      gain.gain.value = 1
      gain.connect(ctx.destination)
      gainRef.current = gain
    }
    return ctx
  }

  const resetSource = () => {
    sourceNodeRef.current?.disconnect()
    sourceNodeRef.current = null
    analyserRef.current?.disconnect()
    if (mediaElementRef.current) {
      const audio = mediaElementRef.current
      const listeners = mediaListenersRef.current
      if (listeners) {
        audio.removeEventListener('timeupdate', listeners.timeupdate)
        audio.removeEventListener('loadedmetadata', listeners.loadedmetadata)
        audio.removeEventListener('play', listeners.play)
        audio.removeEventListener('pause', listeners.pause)
        audio.removeEventListener('ended', listeners.ended)
      }
      mediaListenersRef.current = null
      audio.pause()
      audio.src = ''
      audio.load()
    }
    mediaElementRef.current = null
    setIsPlaying(false)
    setDuration(0)
    setPosition(0)
    setTrackName(null)
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const attachAudioListeners = (audio: HTMLAudioElement) => {
    const listeners: AudioListeners = {
      timeupdate: () => setPosition(audio.currentTime),
      loadedmetadata: () => setDuration(audio.duration || 0),
      play: () => setIsPlaying(true),
      pause: () => setIsPlaying(false),
      ended: () => setIsPlaying(false)
    }
    audio.addEventListener('timeupdate', listeners.timeupdate)
    audio.addEventListener('loadedmetadata', listeners.loadedmetadata)
    audio.addEventListener('play', listeners.play)
    audio.addEventListener('pause', listeners.pause)
    audio.addEventListener('ended', listeners.ended)
    mediaListenersRef.current = listeners
  }

  const connectSource = (node: AudioNode, audible: boolean) => {
    const analyser = analyserRef.current
    const gain = gainRef.current
    if (!analyser || !gain) return
    try {
      node.disconnect()
    } catch {
      /* ignore disconnect errors */
    }
    try {
      analyser.disconnect()
    } catch {
      /* ignore disconnect errors */
    }
    node.connect(analyser)
    gain.gain.value = audible ? 1 : 0
    analyser.connect(gain)
    sourceNodeRef.current = node
  }

  const startMic = async () => {
    setError(null)
    setStatus('Connexion au micro...')
    try {
      await ensureAudioGraph()
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia non supporte ici.')
      }
      resetSource()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const ctx = audioContextRef.current
      if (!ctx) {
        throw new Error('AudioContext manquant')
      }
      const mic = ctx.createMediaStreamSource(stream)
      connectSource(mic, false)
      setSource('mic')
      setStatus('Micro en ecoute (volume coupe pour eviter le larsen)')
    } catch (err) {
      console.error(err)
      setSource(null)
      setStatus('Micro indisponible')
      setError(
        "Impossible d'acceder au micro. Verifiez les permissions ou vos reglages."
      )
    }
  }

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    setStatus('Chargement du fichier...')
    try {
      await ensureAudioGraph()
      resetSource()
      const ctx = audioContextRef.current
      if (!ctx) {
        throw new Error('AudioContext manquant')
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      const audio = new Audio(url)
      audio.loop = true
      audio.crossOrigin = 'anonymous'
      setTrackName(file.name)
      setDuration(0)
      setPosition(0)
      setIsPlaying(false)
      attachAudioListeners(audio)
      mediaElementRef.current = audio

      const elementSource = ctx.createMediaElementSource(audio)
      connectSource(elementSource, true)
      await audio.play()
      setSource('file')
      setStatus(`Lecture: ${file.name}`)
      setIsPlaying(!audio.paused)
    } catch (err) {
      console.error(err)
      setSource(null)
      setStatus('Lecture arretee')
      setError('Impossible de lire ce fichier audio.')
    }
  }

  const stopAll = () => {
    resetSource()
    setSource(null)
    setStatus('Capture en pause')
  }

  const togglePlay = async () => {
    const audio = mediaElementRef.current
    if (!audio) return
    try {
      if (audio.paused) {
        await audio.play()
        setIsPlaying(true)
      } else {
        audio.pause()
      }
    } catch (err) {
      console.error(err)
      setError('Lecture impossible (autoplay bloque ?)')
    }
  }

  const seekTo = (value: number) => {
    const audio = mediaElementRef.current
    if (!audio) return
    const clamped = Math.max(0, Math.min(value, audio.duration || value))
    audio.currentTime = clamped
    setPosition(clamped)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl')
    if (!gl) {
      setError("WebGL n'est pas disponible sur ce navigateur.")
      return
    }
    glRef.current = gl

    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource)
    if (!program) {
      setError('Le shader ne peut pas etre compile.')
      return
    }
    programRef.current = program

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    )

    const positionLocation = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    gl.useProgram(program)
    uniformsRef.current = {
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      time: gl.getUniformLocation(program, 'u_time'),
      bins: gl.getUniformLocation(program, 'u_bins'),
      bass: gl.getUniformLocation(program, 'u_bass'),
      mids: gl.getUniformLocation(program, 'u_mids'),
      highs: gl.getUniformLocation(program, 'u_highs')
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const { clientWidth, clientHeight } = canvas
      const width = Math.max(1, Math.floor(clientWidth * dpr))
      const height = Math.max(1, Math.floor(clientHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      gl.viewport(0, 0, width, height)
    }

    const render = (time: number) => {
      resize()
      const bins = binsRef.current
      bins.fill(0)
      const analyser = analyserRef.current
      const freq = frequencyDataRef.current
      let bass = 0
      let mids = 0
      let highs = 0
      if (analyser && freq) {
        analyser.getByteFrequencyData(freq)
        const step = Math.max(1, Math.floor(freq.length / BIN_COUNT))
        for (let i = 0; i < BIN_COUNT; i++) {
          const idx = i * step
          bins[i] = freq[idx] / 255
          const value = bins[i]
          if (i < BIN_COUNT * 0.15) {
            bass += value
          } else if (i < BIN_COUNT * 0.55) {
            mids += value
          } else {
            highs += value
          }
        }
      }
      const bassAvg = bass / Math.max(1, Math.floor(BIN_COUNT * 0.15))
      const midsAvg = mids / Math.max(1, Math.floor(BIN_COUNT * 0.4))
      const highsAvg = highs / Math.max(1, Math.floor(BIN_COUNT * 0.3))

      const {
        resolution,
        time: timeLoc,
        bins: binsLoc,
        bass: bassLoc,
        mids: midsLoc,
        highs: highsLoc
      } = uniformsRef.current
      if (resolution) gl.uniform2f(resolution, canvas.width, canvas.height)
      if (timeLoc) gl.uniform1f(timeLoc, time / 1000)
      if (binsLoc) gl.uniform1fv(binsLoc, bins)
      if (bassLoc) gl.uniform1f(bassLoc, bassAvg)
      if (midsLoc) gl.uniform1f(midsLoc, midsAvg)
      if (highsLoc) gl.uniform1f(highsLoc, highsAvg)

      if (viewRef.current === 'shader') {
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }

      const fftCanvas = fftCanvasRef.current
      if (fftCanvas && viewRef.current === 'fft') {
        if (!fftCtxRef.current) {
          fftCtxRef.current = fftCanvas.getContext('2d')
        }
        const ctx = fftCtxRef.current
        if (ctx) {
          const dpr = window.devicePixelRatio || 1
          const { clientWidth, clientHeight } = fftCanvas
          const width = Math.max(1, Math.floor(clientWidth * dpr))
          const height = Math.max(1, Math.floor(clientHeight * dpr))
          if (fftCanvas.width !== width || fftCanvas.height !== height) {
            fftCanvas.width = width
            fftCanvas.height = height
          }
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.clearRect(0, 0, width, height)
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

          ctx.fillStyle = 'rgba(10, 14, 24, 0.85)'
          ctx.fillRect(0, 0, clientWidth, clientHeight)

          const grad = ctx.createLinearGradient(0, clientHeight, 0, clientHeight * 0.2)
          grad.addColorStop(0, 'rgba(86, 194, 255, 0.28)')
          grad.addColorStop(0.5, 'rgba(139, 155, 255, 0.4)')
          grad.addColorStop(1, 'rgba(255, 113, 64, 0.45)')
          ctx.fillStyle = grad

          const barW = clientWidth / BIN_COUNT
          for (let i = 0; i < BIN_COUNT; i++) {
            const value = bins[i]
            const h = Math.max(4, value * (clientHeight - 60))
            const x = i * barW + barW * 0.12
            const y = clientHeight - h - 24
            const radius = Math.min(10, barW * 0.35)
            ctx.beginPath()
            ctx.moveTo(x + radius, y)
            ctx.lineTo(x + barW * 0.76 - radius, y)
            ctx.quadraticCurveTo(x + barW * 0.76, y, x + barW * 0.76, y + radius)
            ctx.lineTo(x + barW * 0.76, y + h - radius)
            ctx.quadraticCurveTo(x + barW * 0.76, y + h, x + barW * 0.76 - radius, y + h)
            ctx.lineTo(x + radius, y + h)
            ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
            ctx.lineTo(x, y + radius)
            ctx.quadraticCurveTo(x, y, x + radius, y)
            ctx.fill()
          }

          ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
          ctx.fillRect(0, clientHeight - 24, clientWidth, 2)
        }
      }

      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)
    window.addEventListener('resize', resize)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      window.removeEventListener('resize', resize)
      resetSource()
      if (program) gl.deleteProgram(program)
      glRef.current = null
      programRef.current = null
      audioContextRef.current?.close()
      audioContextRef.current = null
    }
  }, [])

  return (
    <div className="page">
      <div className="neon-blob blob-a" />
      <div className="neon-blob blob-b" />
      <div className="neon-blob blob-c" />

      <header className="hero">
        <div className="text">
          <p className="eyebrow">FG Lovers - Studio visuel</p>
          <h1>
            Visualiseur audio
            <span className="accent"> fragment shader </span>
            en temps reel
          </h1>
          <p className="lede">
            Capture depuis le micro ou un MP3, FFT en 64 bandes et rendu GLSL
            immersif.
          </p>

          <div className="actions">
            <button className="btn primary" onClick={startMic}>
              Activer le micro
            </button>
            <label className="btn ghost">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={onFileChange}
              />
              Charger un MP3
            </label>
            <button className="btn subtle" onClick={stopAll} disabled={!source}>
              Stopper
            </button>
          </div>

          <div className="status">
            <span className={`dot ${source ? 'on' : 'off'}`} />
            <span className="status-text">{status}</span>
          </div>
          {error ? <p className="error">{error}</p> : null}
        </div>

        <div className="panel">
          <div className="view-switch">
            <button
              className={`view-btn ${view === 'shader' ? 'active' : ''}`}
              onClick={() => setView('shader')}
            >
              Shader
            </button>
            <button
              className={`view-btn ${view === 'fft' ? 'active' : ''}`}
              onClick={() => setView('fft')}
            >
              FFT {BIN_COUNT}
            </button>
            <button
              className={`view-btn ${view === 'player' ? 'active' : ''}`}
              onClick={() => setView('player')}
              disabled={source !== 'file'}
            >
              Lecteur MP3
            </button>
          </div>

          <div className="viewer">
            <canvas
              ref={canvasRef}
              className={`visualizer ${view === 'shader' ? 'visible' : 'hidden'}`}
            />
            <canvas
              ref={fftCanvasRef}
              className={`visualizer fft ${view === 'fft' ? 'visible' : 'hidden'}`}
            />
            {view === 'player' ? (
              <div className="player-box">
                <div className="player-title">
                  <span className="pill tight">Lecteur MP3</span>
                  <span className="track-name">
                    {trackName ?? 'Aucun MP3 charge'}
                  </span>
                </div>
                <div className="player-controls">
                  <button
                    className="btn primary small"
                    onClick={togglePlay}
                    disabled={!mediaElementRef.current}
                  >
                    {isPlaying ? 'Pause' : 'Lecture'}
                  </button>
                  <div className="timeline">
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      step={0.05}
                      value={Math.min(position, duration || 0)}
                      onChange={(e) => seekTo(Number(e.target.value))}
                      disabled={!mediaElementRef.current || duration === 0}
                    />
                    <div className="timecodes">
                      <span>{formatTime(position)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="pill-row">
            <span className="pill">Fragment shader</span>
            <span className="pill">FFT {BIN_COUNT} bandes</span>
            <span className="pill">
              {source === 'mic'
                ? 'Micro en direct'
                : source === 'file'
                  ? 'Lecture MP3'
                  : 'En attente'}
            </span>
          </div>
        </div>
      </header>
    </div>
  )
}

export default VisualizerPage
