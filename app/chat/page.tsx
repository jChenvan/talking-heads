'use client';

import Animation from '@/components/Animation';
import useAudioVolume from '@/hooks/useAudioVolume';
import useHead from '@/hooks/useHead';
import useRealtimeChat from '@/hooks/useRealtimeChat';
import cn from '@/utils/cn';
import { useEffect, useRef } from 'react';

export default function Chat() {
  const {canvas, setBlendShape, mousePos} = useHead();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const chatbot = useRealtimeChat();
  const rmsRef = useAudioVolume(chatbot.audioElement);

  useEffect(()=>{
    let id:number;
    function animate() {
      id = requestAnimationFrame(animate);
      setBlendShape.current?.(Math.min(rmsRef.current*5,1));
    }

    animate();

    return ()=>cancelAnimationFrame(id);
  },[]);

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
        <div ref={canvasContainerRef}></div>
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
