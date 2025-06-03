import { RefObject, useEffect, useRef } from "react";

export default function useAudioVolume(audioRef:RefObject<HTMLAudioElement>) {
    const animationIdRef = useRef<number>(null);
    const rmsRef = useRef<number>(null);

    useEffect(()=>{
        const audio = audioRef.current;
        if (!audio) return;

        const audioCtx = new window.AudioContext();
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

            const sumSquares = dataArray.reduce((prev,curr)=>{
                const normalized = (curr - 128)/128;
                return prev + normalized * normalized;
            }, 0);

            rmsRef.current = Math.sqrt(sumSquares / bufferLength);
        }

        const handlePlay = async () => {
            if (audioCtx.state === "suspended") await audioCtx.resume();
            writeData();
        }

        audio.addEventListener('play', handlePlay);

        return ()=>{
            if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
            audio.removeEventListener('play', handlePlay);
            analyser.disconnect();
            source.disconnect();
            audioCtx.close();
        }
    },[audioRef]);

    return rmsRef;
}