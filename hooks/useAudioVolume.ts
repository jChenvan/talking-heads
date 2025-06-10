import { RefObject, use, useEffect, useRef, useState } from 'react';

export default function useAudioVolume() {
  const rmsRef = useRef<number>(0);
  const animationIdRef = useRef<number>(null);
  const audioCtxRef = useRef<AudioContext>(null);
  const [audio,setAudio] = useState<HTMLAudioElement|null>(null);

  useEffect(() => {
    if (!audio || !window.AudioContext) return;

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaElementSource(audio);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    const writeData = () => {
      animationIdRef.current = requestAnimationFrame(writeData);
      analyser.getByteTimeDomainData(dataArray);

      const sumSquares = dataArray.reduce((sum, val) => {
        const normalized = (val - 128) / 128;
        return sum + normalized * normalized;
      }, 0);

      const rmsValue = Math.sqrt(sumSquares / bufferLength);
      rmsRef.current = rmsValue;
    };

    const handlePlay = async () => {
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      writeData();
    };

    audio.addEventListener('play', handlePlay);

    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      audio.removeEventListener('play', handlePlay);
      source.disconnect();
      analyser.disconnect();
      audioCtx.close();
    };
  }, [audio]);

  return {rmsRef, setAudio, audio};
}
