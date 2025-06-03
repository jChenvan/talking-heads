'use client';

import useRealtimeChat from '@/hooks/useRealtimeChat';
import cn from '@/utils/cn';

export default function Chat() {
  const chatbot = useRealtimeChat();

  return (
    <div className="h-screen w-screen flex justify-center items-center">
      <div className="bg-gray-900 p-6 rounded-xl flex gap-2">
        <canvas width={500} height={500} />
        <div className="bg-gray-700 p-4 rounded-lg select-none">
          <h1 className='mb-1.5'>
            Prompt
            <button onClick={e=>{e.preventDefault();chatbot.setPrompt("")}} className='ml-2 p-1 bg-gray-900 rounded-sm active:bg-gray-400 cursor-pointer'>clear</button>
            </h1>
          <textarea
            rows={5}
            className="w-[50ch] bg-gray-900 rounded-md resize-none p-2 focus:outline-0"
            value={chatbot.prompt}
            onChange={(e) => chatbot.setPrompt(e.target.value)}
            placeholder="You are a..."
          />
          <h1 className='w-fit my-1.5'>Voice</h1>
          <button className='cursor-pointer' onClick={()=>chatbot.setVoice(prev=>{
            if (prev === 'male') return 'female';
            else return 'male';
          })}>
              <div className='flex bg-gray-900 rounded-sm w-fit'>
                <div className={cn(
                    'ml-2 mt-2 mb-2 rounded-sm w-[30px] h-[30px] flex justify-center items-center',
                    chatbot.voice === 'male' && 'bg-blue-800'
                    )}>M</div>
                <div className={cn(
                    'm-2 rounded-sm w-[30px] h-[30px] flex justify-center items-center',
                    chatbot.voice === 'female' && 'bg-pink-500'
                )}>F</div>
              </div>
          </button>
          <button className='block bg-blue-950 w-full py-2 rounded-lg mt-2 hover:bg-blue-600 active:bg-blue-300 cursor-pointer' onClick={e=>{
              e.preventDefault();
              if (chatbot.isSessionActive) {
                chatbot.stopSession();
              } else {
                chatbot.startSession();
              }
          }}>{chatbot.isSessionActive ? "stop session" : "begin session"}</button>
        </div>
      </div>
    </div>
  );
}
