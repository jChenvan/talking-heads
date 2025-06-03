'use client';

import { useEffect, useRef, useState } from "react";

export default function useRealtimeChat() {
    const [prompt, setPrompt] = useState("");
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [events, setEvents] = useState<any[]>([]);
    const [dataChannel, setDataChannel] = useState<RTCDataChannel|null>(null);
    const peerConnection = useRef<RTCPeerConnection>(null);
    const audioElement = useRef<HTMLAudioElement>(null);

    async function startSession() {
        const tokenResponse = await fetch("/token");
        const data = await tokenResponse.json();
        const EPHEMERAL_KEY = data.client_secret.value;

        const pc = new RTCPeerConnection();

        audioElement.current = document.createElement("audio");
        audioElement.current.autoplay = true;
        pc.ontrack = e => {
            if (audioElement.current) {
                audioElement.current.srcObject = e.streams[0];
            }
        };

        const ms = await navigator.mediaDevices.getUserMedia({
            audio:true,
        });
        pc.addTrack(ms.getTracks()[0]);

        const dc = pc.createDataChannel("oai-events");
        setDataChannel(dc);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const baseUrl = "https://api.openai.com/v1/realtime";
        const model = "gpt-4o-realtime-preview-2024-12-17";
        const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
            method: "POST",
            body: offer.sdp,
            headers: {
                Authorization: `Bearer ${EPHEMERAL_KEY}`,
                "Content-Type": "application/sdp",
            },
        });

        const answer:{type:RTCSdpType, sdp: string} = {
            type: "answer",
            sdp: await sdpResponse.text(),
        };
        await pc.setRemoteDescription(answer);

        peerConnection.current = pc;
    }

    function stopSession() {
        if (dataChannel) {
            dataChannel.close();
        }

        peerConnection.current?.getSenders().forEach(sender=>{
            if (sender.track) sender.track.stop();
        });

        if (peerConnection.current) peerConnection.current.close();

        setIsSessionActive(false);
        setDataChannel(null);
        peerConnection.current = null;
    }

    function sendClientEvent(msg:any) {
        if (dataChannel) {
            const timestamp = new Date().toLocaleTimeString();
            msg.event_id = msg.event_id || crypto.randomUUID();

            dataChannel.send(JSON.stringify(msg));

            if (!msg.timestamp) msg.timestamp = timestamp;

            setEvents(prev=>[msg, ...prev]);
        } else {
            console.error(
                "Failed to send message - no data channel available",
                msg,
            );
        }
    }

    function sendTextMessage(msg:string) {
        const event = {
            type: "conversation.item.create",
            item:{
                type:"message",
                role:"user",
                content: [
                    {
                        type:"input_text",
                        text:msg,
                    }
                ],
            }
        }

        sendClientEvent(event),
        sendClientEvent({
            type:"response.create",
            response:{
                modalities: ["text", "audio"],
            },
        });
    }

    useEffect(()=>{
        if (dataChannel) {
            dataChannel.addEventListener("message", e=>{
                const event = JSON.parse(e.data);
                if (!event.timestamp) event.timestamp = new Date().toLocaleTimeString();
                setEvents(prev=>[event, ...prev]);
            });

            dataChannel.addEventListener("open",()=>{
                setIsSessionActive(true);
                setEvents([]);
            });
        }
    },[dataChannel]);

    return {isSessionActive, startSession, stopSession, sendTextMessage, events, prompt, setPrompt}
}