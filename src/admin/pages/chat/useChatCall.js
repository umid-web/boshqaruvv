import { useCallback, useEffect, useRef, useState } from 'react';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export function useChatCall(channel, actor) {
  const [roomId, setRoomId] = useState('');
  const [incoming, setIncoming] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const roomRef = useRef('');
  const localRef = useRef(null);
  const peersRef = useRef(new Map());
  const pendingRef = useRef(new Map());
  const channelRef = useRef(null);
  const actorRef = useRef(actor);
  actorRef.current = actor;

  const broadcast = useCallback((payload) => channelRef.current?.postMessage({ ...payload, from: actorRef.current.key, fromName: actorRef.current.name }), []);
  const updateRoom = useCallback((value) => { roomRef.current = value; setRoomId(value); }, []);
  const getMedia = useCallback(async () => {
    if (localRef.current) return localRef.current;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Bu brauzerda kamera va mikrofon mavjud emas.');
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const clearPeer = useCallback((peerKey) => {
    peersRef.current.get(peerKey)?.close();
    peersRef.current.delete(peerKey);
    pendingRef.current.delete(peerKey);
    setRemoteStreams((list) => list.filter((item) => item.peerKey !== peerKey));
  }, []);

  const closeRoom = useCallback(() => {
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    pendingRef.current.clear();
    localRef.current?.getTracks().forEach((track) => track.stop());
    localRef.current = null;
    setLocalStream(null);
    setRemoteStreams([]);
    setIncoming(null);
    setError('');
    setMuted(false);
    setCameraOff(false);
    updateRoom('');
  }, [updateRoom]);

  const makePeer = useCallback((peerKey, offer) => {
    if (peersRef.current.has(peerKey)) return peersRef.current.get(peerKey);
    const connection = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current.set(peerKey, connection);
    localRef.current?.getTracks().forEach((track) => connection.addTrack(track, localRef.current));
    connection.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) setRemoteStreams((list) => [...list.filter((item) => item.peerKey !== peerKey), { peerKey, stream }]);
    };
    connection.onicecandidate = (event) => { if (event.candidate) broadcast({ type: 'candidate', callId: roomRef.current, to: peerKey, candidate: event.candidate }); };
    connection.onconnectionstatechange = () => { if (['failed', 'closed', 'disconnected'].includes(connection.connectionState)) clearPeer(peerKey); };
    if (offer) connection.createOffer().then((description) => connection.setLocalDescription(description)).then(() => broadcast({ type: 'offer', callId: roomRef.current, to: peerKey, description: connection.localDescription })).catch(() => setError('Video ulanishini yaratib bo‘lmadi.'));
    return connection;
  }, [broadcast, clearPeer]);

  useEffect(() => {
    if (!('BroadcastChannel' in window)) return undefined;
    const bus = new BroadcastChannel(`edu-chat-call:${channel}`);
    channelRef.current = bus;
    const receive = async ({ data }) => {
      if (!data || data.from === actorRef.current.key || (data.to && data.to !== actorRef.current.key)) return;
      if (data.type === 'invite') { if (!roomRef.current) setIncoming(data); return; }
      if (data.type === 'end' && data.callId === roomRef.current) { closeRoom(); return; }
      if (data.type === 'leave' && data.callId === roomRef.current) { clearPeer(data.from); return; }
      if (data.type === 'decline' && data.callId === roomRef.current) { clearPeer(data.from); return; }
      if (data.callId !== roomRef.current) return;
      try {
        if (data.type === 'join') {
          const connection = makePeer(data.from, false);
          const offer = await connection.createOffer();
          await connection.setLocalDescription(offer);
          broadcast({ type: 'offer', callId: roomRef.current, to: data.from, description: connection.localDescription });
        } else if (data.type === 'offer') {
          const connection = makePeer(data.from, false);
          await connection.setRemoteDescription(data.description);
          const queued = pendingRef.current.get(data.from) || [];
          for (const candidate of queued) await connection.addIceCandidate(candidate);
          pendingRef.current.delete(data.from);
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          broadcast({ type: 'answer', callId: roomRef.current, to: data.from, description: connection.localDescription });
        } else if (data.type === 'answer') {
          const connection = peersRef.current.get(data.from);
          if (!connection || connection.remoteDescription) return;
          await connection.setRemoteDescription(data.description);
          const queued = pendingRef.current.get(data.from) || [];
          for (const candidate of queued) await connection.addIceCandidate(candidate);
          pendingRef.current.delete(data.from);
        } else if (data.type === 'candidate') {
          const connection = peersRef.current.get(data.from);
          if (connection?.remoteDescription) await connection.addIceCandidate(data.candidate);
          else pendingRef.current.set(data.from, [...(pendingRef.current.get(data.from) || []), data.candidate]);
        }
      } catch { setError('Video ulanishida xatolik yuz berdi. Qayta urinib ko‘ring.'); }
    };
    bus.addEventListener('message', receive);
    return () => { bus.removeEventListener('message', receive); bus.close(); if (channelRef.current === bus) channelRef.current = null; closeRoom(); };
  }, [channel, broadcast, clearPeer, closeRoom, makePeer]);

  const start = useCallback(async () => {
    try {
      setError('');
      await getMedia();
      const id = `CALL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      updateRoom(id);
      broadcast({ type: 'invite', callId: id, channel });
    } catch (cause) { setError(cause.message || 'Kamera va mikrofonni yoqib bo‘lmadi.'); }
  }, [broadcast, channel, getMedia, updateRoom]);

  const accept = useCallback(async () => {
    if (!incoming) return;
    try {
      setError('');
      await getMedia();
      updateRoom(incoming.callId);
      broadcast({ type: 'join', callId: incoming.callId, to: incoming.from });
      setIncoming(null);
    } catch (cause) { setError(cause.message || 'Kamera va mikrofonni yoqib bo‘lmadi.'); }
  }, [broadcast, getMedia, incoming, updateRoom]);

  const reject = useCallback(() => {
    if (incoming) broadcast({ type: 'decline', callId: incoming.callId, to: incoming.from });
    setIncoming(null);
  }, [broadcast, incoming]);

  const end = useCallback(() => {
    if (roomRef.current) broadcast({ type: 'end', callId: roomRef.current });
    closeRoom();
  }, [broadcast, closeRoom]);

  const toggleMute = () => { const next = !muted; localRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; }); setMuted(next); };
  const toggleCamera = () => { const next = !cameraOff; localRef.current?.getVideoTracks().forEach((track) => { track.enabled = !next; }); setCameraOff(next); };

  return { roomId, incoming, localStream, remoteStreams, error, muted, cameraOff, start, accept, reject, end, toggleMute, toggleCamera };
}
