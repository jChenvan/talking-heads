'use client';

import { useEffect, useRef, useState } from 'react';

const sessionUpdate = {
  type: "session.update",
  session: {
    tools:[
      {
        type: 'function',
        name: 'emote',
        description: 'Choose from a list of emotes to express yourself',
        parameters: {
          type: 'object',
          properties: {
            emote: {
              type: 'string',
              enum: ['nod', 'shake'],
              description: 'The emote to perform',
            }
          }
        }
      },
      {
        type: 'function',
        name: 'changeExpression',
        description: 'Before each response, call this function to set an appropriate emotion for that response.',
        parameters: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              enum: ['happy', 'angry'],
              description: 'The expression to change to',
            },
          },
          required: ['expression'],
        },
      }
    ],
    tool_choice: 'auto',
  }
}

function useTools(
  isSessionActive: boolean,
  sendClientEvent: (msg:any) => void,
  events:any[]
) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState<any>();

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output:any) => {
        if (
          output.type === "function_call"
        ) {
          setFunctionCallOutput(output);
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: `
                Please respond to what the user last said to you.
              `,
              },
            });
          }, 500);
        }
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutput(null);
    }
  }, [isSessionActive]);

  return {functionCallOutput};
}

export default function useRealtimeChat() {
  const [prompt, setPrompt] = useState(
    `You are a witty and friendly AI chatbot designed for casual conversation with general users.
Your tone should be upbeat, engaging, and occasionally humorous — think clever, not clownish.
Always prioritize clarity and friendliness, and aim to make interactions enjoyable without sacrificing coherence.
Use emojis sparingly and only when they enhance the message.
If a topic is unclear, gently ask for clarification in a humorous or lighthearted way.
Do not make up facts or give advice outside your capabilities.
If you don't know something, admit it with charm. Be entertaining, but stay useful.`
  );
  const [voice, setVoice] = useState<'male' | 'female'>('male');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const peerConnection = useRef<RTCPeerConnection>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement|null>(null);

  async function startSession() {
    const tokenResponse = await fetch('/api/token', {
      method: 'POST',
      body: JSON.stringify({ prompt, voice }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    const pc = new RTCPeerConnection();

    const audio = document.createElement('audio');
    audio.autoplay = true;
    pc.ontrack = (e) => {
      if (audio) {
        audio.srcObject = e.streams[0];
      }
    };
    setAudioElement(audio);

    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    const dc = pc.createDataChannel('oai-events');
    setDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = 'https://api.openai.com/v1/realtime';
    const model = 'gpt-4o-realtime-preview-2024-12-17';
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: 'POST',
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        'Content-Type': 'application/sdp',
      },
    });

    const answer: { type: RTCSdpType; sdp: string } = {
      type: 'answer',
      sdp: await sdpResponse.text(),
    };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }

    peerConnection.current?.getSenders().forEach((sender) => {
      if (sender.track) sender.track.stop();
    });

    if (peerConnection.current) peerConnection.current.close();

    setIsSessionActive(false);
    setDataChannel(null);
    setAudioElement(null);
    peerConnection.current = null;
  }

  function sendClientEvent(msg: any) {
    if (dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      msg.event_id = msg.event_id || crypto.randomUUID();

      dataChannel.send(JSON.stringify(msg));

      if (!msg.timestamp) msg.timestamp = timestamp;

      setEvents((prev) => [msg, ...prev]);
    } else {
      console.error('Failed to send message - no data channel available', msg);
    }
  }

  function sendTextMessage(msg: string) {
    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: msg,
          },
        ],
      },
    };

    sendClientEvent(event),
      sendClientEvent({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
        },
      });
  }

  useEffect(() => {
    if (dataChannel) {
      dataChannel.addEventListener('message', (e) => {
        const event = JSON.parse(e.data);
        if (!event.timestamp) event.timestamp = new Date().toLocaleTimeString();
        setEvents((prev) => [event, ...prev]);
      });

      dataChannel.addEventListener('open', () => {
        setIsSessionActive(true);
        setEvents([]);
      });
    }
  }, [dataChannel]);

  const {functionCallOutput} = useTools(isSessionActive,sendClientEvent,events);

  return {
    isSessionActive,
    startSession,
    stopSession,
    sendTextMessage,
    events,
    prompt,
    setPrompt,
    voice,
    setVoice,
    audioElement,
    functionCallOutput,
  };
}
