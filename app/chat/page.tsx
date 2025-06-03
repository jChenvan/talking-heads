'use client';

import useRealtimeChat from '@/hooks/useRealtimeChat';

export default function Chat() {
  const chatbot = useRealtimeChat();

  return (
    <div className="h-screen w-screen flex justify-center items-center">
      <div className="bg-gray-900 p-6 rounded-xl flex gap-2">
        <canvas width={500} height={500} />
        <div className="bg-gray-700 p-4 rounded-lg">
          <form action="">
            <label>
              <h1>Prompt</h1>
              <textarea
                rows={7}
                className="w-[50ch] bg-gray-900 rounded-md resize-none p-2 focus:outline-0"
                value={chatbot.prompt}
                onChange={(e) => chatbot.setPrompt(e.target.value)}
              />
            </label>
          </form>
        </div>
      </div>
    </div>
  );
}
