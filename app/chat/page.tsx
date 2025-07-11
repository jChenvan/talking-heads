'use client';

import useAudioVolume from '@/hooks/useAudioVolume';
import useCharacter from '@/hooks/useCharacter';
import useRealtimeChat from '@/hooks/useRealtimeChat';
import cn from '@/utils/cn';
import throttle from '@/utils/throttle';
import { useEffect, useRef } from 'react';

export default function Chat() {
  const {canvas, setBend, setMorphTargets, setTwist} = useCharacter();
  const happiness = useRef(1);
  const mouthOpen = useRef(0);

  const updateMouth = () => {
    setMorphTargets({
      HappyOpen: happiness.current * mouthOpen.current,
      UpsetOpen: (1 - happiness.current) * mouthOpen.current,
    });
  }

  const setIsHappy = (isHappy: boolean) => {
    function animate() {
      happiness.current += (isHappy ? 1 : -1) * 0.05;
      if (happiness.current < 0) {happiness.current = 0; return};
      if (happiness.current > 1) {happiness.current = 1; return};
      requestAnimationFrame(animate)
    }

    animate();
  }

  const blink = () => {
    let progress = 0;
    function animate() {
      progress += 0.1;
      setMorphTargets({
        LeftLid:(progress < 1) ? progress : 2 - progress,
        RightLid:(progress < 1) ? progress : 2 - progress,
      })
      if (progress <= 2) requestAnimationFrame(animate);
    }

    animate();
  }

  useEffect(()=>{
    if (canvas) {
        canvasContainerRef.current?.appendChild(canvas);
        const onMouseMove = throttle((e:MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left)/rect.width;
            const y = (e.clientY - rect.top)/rect.height;
            
            setBend(Math.PI/24 - y * Math.PI / 8);
            setTwist(-Math.PI/24 + x * Math.PI / 12);
        }, 1000 / 60 + 1)

        canvas.addEventListener("pointermove", onMouseMove);

        const intervalId = setInterval(blink, 5000);

        return () => {
          canvas.removeEventListener("pointermove", onMouseMove);
          clearInterval(intervalId);
        }
    }
  },[canvas])


  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const chatbot = useRealtimeChat();
  const {rmsRef, setAudio, audio} = useAudioVolume();

  useEffect(()=>{
    if (!chatbot.functionCallOutput) return;
    const {name, arguments:args} = chatbot.functionCallOutput;
    switch (name) {
      case "changeExpression":
        const {expression} = JSON.parse(args);
        setIsHappy(expression === "happy");
        break;

      default:
        break;
    }
  },[chatbot.functionCallOutput]);

  useEffect(()=>{
    if (audio) {
      let id:number;
      function animate() {
        id = requestAnimationFrame(animate);
        mouthOpen.current = Math.min(rmsRef.current*5,1);
        updateMouth();
      }

      animate();

      return ()=>cancelAnimationFrame(id);
    } else {
      setAudio(chatbot.audioElement);
    }
  },[audio, chatbot]);

  useEffect(()=>{
    if (canvas && canvasContainerRef.current) {
      canvasContainerRef.current.appendChild(canvas);

      return ()=>{
        canvasContainerRef.current?.removeChild(canvas);
      }
    }
  },[canvas, canvasContainerRef]);

  return (
    <div className="h-screen w-screen flex justify-center items-center">
      <div className="bg-gray-900 p-6 rounded-xl flex gap-2">
        <div ref={canvasContainerRef} className='bg-gray-950 rounded-lg w-[500px] h-[500px]'></div>
        <div className="bg-gray-700 p-4 rounded-lg select-none">
          <h1 className="mb-1.5">
            Prompt
            <button
              onClick={(e) => {
                e.preventDefault();
                chatbot.setPrompt('');
              }}
              className="ml-2 p-1 bg-gray-900 rounded-sm active:bg-gray-400 cursor-pointer"
            >
              clear
            </button>
          </h1>
          <textarea
            rows={5}
            className="w-[50ch] bg-gray-900 rounded-md resize-none p-2 focus:outline-0"
            value={chatbot.prompt}
            onChange={(e) => chatbot.setPrompt(e.target.value)}
            placeholder="You are a..."
          />
          <h1 className="w-fit my-1.5">Voice</h1>
          <button
            className="cursor-pointer"
            onClick={() =>
              chatbot.setVoice((prev) => {
                if (prev === 'male') return 'female';
                else return 'male';
              })
            }
          >
            <div className="flex bg-gray-900 rounded-sm w-fit">
              <div
                className={cn(
                  'ml-2 mt-2 mb-2 rounded-sm w-[30px] h-[30px] flex justify-center items-center',
                  chatbot.voice === 'male' && 'bg-blue-800'
                )}
              >
                M
              </div>
              <div
                className={cn(
                  'm-2 rounded-sm w-[30px] h-[30px] flex justify-center items-center',
                  chatbot.voice === 'female' && 'bg-pink-500'
                )}
              >
                F
              </div>
            </div>
          </button>
          <button
            className="block bg-blue-950 w-full py-2 rounded-lg mt-2 hover:bg-blue-600 active:bg-blue-300 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              if (chatbot.isSessionActive) {
                chatbot.stopSession();
              } else {
                chatbot.startSession();
              }
            }}
          >
            {chatbot.isSessionActive ? 'stop session' : 'begin session'}
          </button>
        </div>
      </div>
    </div>
  );
}
