import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, MessageCircle, MessagesSquare, Mic, MicOff, PhoneOff, Search, Send, SmilePlus, Users, Video, VideoOff } from 'lucide-react';
import Card from '../../components/Card';
import Avatar from '../../components/ui/Avatar';
import { loadTeachers } from '../teachers/teachersStore';
import { loadRoles, loadUsers } from '../users-roles/usersStore';
import { useChatCall } from './useChatCall';
import { CHAT_STORAGE_KEY } from './chatStore';
import './Chat.scss';

const PRESENCE_KEY = 'edu-chat-presence-v1';
const STICKERS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];
const readMessages = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};
const readPresence = () => {
  try { return JSON.parse(localStorage.getItem(PRESENCE_KEY)) || {}; } catch { return {}; }
};
const lastSeenFor = (presence, key) => Math.max(0, ...Object.values(presence[key] || {}).map(Number));
const presenceLabel = (presence, key) => {
  const lastSeen = lastSeenFor(presence, key);
  const elapsed = Date.now() - lastSeen;
  if (lastSeen && elapsed < 15000) return { online: true, text: 'Hozir online' };
  if (!lastSeen) return { online: false, text: 'Hali online bo‘lmagan' };
  const minutes = Math.max(1, Math.floor(elapsed / 60000));
  if (minutes < 60) return { online: false, text: `${minutes} daqiqa oldin online edi` };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { online: false, text: `${hours} soat oldin online edi` };
  return { online: false, text: `${Math.floor(hours / 24)} kun oldin online edi` };
};
const normalize = (value = '') => value.trim().toLocaleLowerCase('uz');
const teacherForUser = (user, teachers) => teachers.find((teacher) => teacher.id === user.teacherId)
  || teachers.find((teacher) => normalize(teacher.firstName) === normalize(user.firstName) && normalize(teacher.lastName) === normalize(user.lastName));
const actorForUser = (user, teachers, roles) => {
  const teacher = user.roleId === 'teacher' ? teacherForUser(user, teachers) : null;
  return {
    key: teacher ? `teacher:${teacher.id}` : `user:${user.id}`,
    name: teacher ? `${teacher.firstName} ${teacher.lastName}` : `${user.firstName} ${user.lastName}`,
    role: roles.find((item) => item.id === user.roleId)?.name || user.roleId,
    teacherId: teacher?.id || '',
  };
};

function VideoTile({ stream, label, muted = false, local = false }) {
  const videoRef = useRef(null);
  useEffect(() => { if (videoRef.current) videoRef.current.srcObject = stream || null; }, [stream]);
  return <div className="chat-video-tile"><video ref={videoRef} autoPlay playsInline muted={muted}/><span>{label}{local ? ' (siz)' : ''}</span></div>;
}

export default function Chat() {
  const users = useMemo(() => loadUsers().filter((user) => user.status === 'active'), []);
  const teachers = useMemo(() => loadTeachers().filter((teacher) => teacher.status !== 'left'), []);
  const roles = useMemo(() => loadRoles(), []);
  const currentUser = users.find((user) => user.id === sessionStorage.getItem('educontrol_user_id'));
  const actor = useMemo(() => {
    if (currentUser) return actorForUser(currentUser, teachers, roles);
    const role = sessionStorage.getItem('educontrol_role') || 'admin';
    const username = sessionStorage.getItem('educontrol_username') || role;
    const teacherId = sessionStorage.getItem('educontrol_teacher_id');
    const teacher = teachers.find((item) => item.id === teacherId);
    return teacher
      ? { key: `teacher:${teacher.id}`, name: `${teacher.firstName} ${teacher.lastName}`, role: 'Ustoz', teacherId: teacher.id }
      : { key: `${role}:${username}`, name: username, role: roles.find((item) => item.id === role)?.name || role, teacherId: '' };
  }, [currentUser, teachers, roles]);

  const peers = useMemo(() => {
    const list = users.map((user) => actorForUser(user, teachers, roles));
    const known = new Set(list.map((item) => item.key));
    teachers.forEach((teacher) => {
      const key = `teacher:${teacher.id}`;
      if (!known.has(key)) list.push({ key, name: `${teacher.firstName} ${teacher.lastName}`, role: 'Ustoz', teacherId: teacher.id });
    });
    return list.filter((item) => item.key !== actor.key).sort((a, b) => a.name.localeCompare(b.name, 'uz'));
  }, [users, teachers, roles, actor]);

  const [selected, setSelected] = useState({ type: 'general', key: 'general' });
  const [messages, setMessages] = useState(readMessages);
  const [presence, setPresence] = useState(readPresence);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [reactionPicker, setReactionPicker] = useState('');
  const endRef = useRef(null);
  const selectedPeer = selected.type === 'direct' ? peers.find((peer) => peer.key === selected.peerKey) : null;
  const channel = selected.type === 'general'
    ? 'general'
    : `direct:${[actor.key, selected.peerKey].sort().join('|')}`;
  const visibleMessages = messages.filter((message) => message.channel === channel);
  const orderedPeers = useMemo(() => peers.map((peer) => {
    const directChannel = `direct:${[actor.key, peer.key].sort().join('|')}`;
    const latest = messages.reduce((time, message) => message.channel === directChannel ? Math.max(time, Date.parse(message.createdAt) || 0) : time, 0);
    return { ...peer, latestMessageAt: latest };
  }).sort((a, b) => b.latestMessageAt - a.latestMessageAt || a.name.localeCompare(b.name, 'uz')), [peers, messages, actor.key]);
  const filteredPeers = orderedPeers.filter((peer) => `${peer.name} ${peer.role}`.toLocaleLowerCase('uz').includes(query.trim().toLocaleLowerCase('uz')));
  const call = useChatCall(channel, actor);

  useEffect(() => {
    const refresh = () => setMessages(readMessages());
    window.addEventListener('storage', refresh);
    window.addEventListener('edu-chat-update', refresh);
    const timer = window.setInterval(refresh, 1800);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('edu-chat-update', refresh); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const tabId = `TAB-${Math.random().toString(36).slice(2, 10)}`;
    const updatePresence = (remove = false) => {
      const all = readPresence();
      const now = Date.now();
      Object.keys(all).forEach((key) => {
        all[key] = Object.fromEntries(Object.entries(all[key] || {}).filter(([, time]) => now - Number(time) < 20000));
        if (!Object.keys(all[key]).length) delete all[key];
      });
      if (!all[actor.key]) all[actor.key] = {};
      if (remove) delete all[actor.key][tabId];
      else all[actor.key][tabId] = now;
      if (!Object.keys(all[actor.key]).length) delete all[actor.key];
      try { localStorage.setItem(PRESENCE_KEY, JSON.stringify(all)); } catch { /* presence ixtiyoriy */ }
      setPresence(all);
      window.dispatchEvent(new Event('edu-chat-presence'));
    };
    updatePresence();
    const timer = window.setInterval(updatePresence, 5000);
    const refresh = () => setPresence(readPresence());
    const onHide = () => updatePresence(true);
    window.addEventListener('pagehide', onHide, { once: true });
    window.addEventListener('storage', refresh);
    window.addEventListener('edu-chat-presence', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('pagehide', onHide); window.removeEventListener('storage', refresh); window.removeEventListener('edu-chat-presence', refresh); updatePresence(true); };
  }, [actor.key]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [visibleMessages.length, channel]);

  useEffect(() => {
    const all = readMessages();
    let changed = false;
    const next = all.map((message) => {
      if (message.channel !== channel || message.fromKey === actor.key || message.readBy?.includes(actor.key)) return message;
      changed = true;
      return { ...message, readBy: [...(message.readBy || []), actor.key] };
    });
    if (changed) {
      try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(next)); } catch { /* storage to‘lib qolsa ham sahifa ishlayveradi */ }
      setMessages(next);
      window.dispatchEvent(new Event('edu-chat-update'));
    }
  }, [channel, actor.key, messages]);

  const send = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const next = [...readMessages(), {
      id: `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      channel,
      fromKey: actor.key,
      fromName: actor.name,
      fromRole: actor.role,
      text,
      createdAt: new Date().toISOString(),
      readBy: [],
    }];
    try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(next)); } catch { /* storage to‘lib qolsa ham sahifa ishlayveradi */ }
    setMessages(next);
    setDraft('');
    window.dispatchEvent(new Event('edu-chat-update'));
  };

  const toggleReaction = (messageId, emoji) => {
    const next = readMessages().map((message) => {
      if (message.id !== messageId) return message;
      const reactions = { ...(message.reactions || {}) };
      const voters = new Set(reactions[emoji] || []);
      if (voters.has(actor.key)) voters.delete(actor.key);
      else voters.add(actor.key);
      if (voters.size) reactions[emoji] = [...voters];
      else delete reactions[emoji];
      return { ...message, reactions };
    });
    try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(next)); } catch { /* storage to‘lib qolsa ham sahifa ishlayveradi */ }
    setMessages(next);
    setReactionPicker('');
    window.dispatchEvent(new Event('edu-chat-update'));
  };

  return <div className="chat-page">
    <header className="chat-page__heading"><div><span className="chat-page__eyebrow">JAMOA ALOQASI</span><h1>Chat</h1><p>Umumiy suhbat va xodimlar bilan shaxsiy yozishmalar</p></div><span className="chat-page__online"><i/> Jamoa chatda</span></header>
    <Card className="chat-shell">
      <aside className="chat-people">
        <button type="button" className={`chat-people__general${selected.type === 'general' ? ' is-active' : ''}`} onClick={() => setSelected({ type: 'general', key: 'general' })}>
          <span className="chat-people__icon"><MessagesSquare size={19}/></span><span><strong>Umumiy chat</strong><small>Barcha xodimlar</small></span>
        </button>
        <div className="chat-people__title"><span>Xodimlar</span><b>{peers.length}</b></div>
        <label className="chat-people__search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Xodim qidirish" /></label>
        <div className="chat-people__list">{filteredPeers.map((peer) => { const state = presenceLabel(presence, peer.key); return <button type="button" key={peer.key} className={`chat-person${selected.peerKey === peer.key ? ' is-active' : ''}`} onClick={() => setSelected({ type: 'direct', key: peer.key, peerKey: peer.key })}>
          <span className="chat-person__avatar"><Avatar firstName={peer.name.split(' ')[0]} lastName={peer.name.split(' ').slice(1).join(' ')}/><i className={state.online ? 'is-online' : ''}/></span><span><strong>{peer.name}</strong><small>{peer.role}</small><small className={`chat-person__presence${state.online ? ' is-online' : ''}`}>{state.text}</small></span>
        </button>; })}{!filteredPeers.length && <p className="chat-people__empty">Xodim topilmadi</p>}</div>
      </aside>
      <section className="chat-thread">
        <header className="chat-thread__head"><span className="chat-people__icon">{selected.type === 'general' ? <Users size={19}/> : <MessageCircle size={19}/>}</span><div><strong>{selected.type === 'general' ? 'Umumiy chat' : selectedPeer?.name || 'Shaxsiy chat'}</strong><small>{selected.type === 'general' ? 'Barcha xodimlar bilan suhbat' : `${selectedPeer?.role || 'Xodim'} · ${presenceLabel(presence, selected.peerKey).text}`}</small></div><button type="button" className="btn btn--secondary btn--sm chat-thread__call" onClick={call.start} disabled={Boolean(call.roomId)}><Video size={16}/><span>{selected.type === 'general' ? 'Video chat' : 'Video qo‘ng‘iroq'}</span></button></header>
        {call.incoming && <div className="chat-incoming"><span><Video size={18}/></span><div><strong>{call.incoming.fromName} video qo‘ng‘iroq qilyapti</strong><small>Javob berish uchun kamerani yoqing.</small></div><button type="button" className="btn btn--secondary btn--sm" onClick={call.reject}>Rad etish</button><button type="button" className="btn btn--primary btn--sm" onClick={call.accept}><Video size={15}/> Qabul qilish</button></div>}
        {call.error && <p className="chat-call-error" role="alert">{call.error}</p>}
        {call.roomId && <div className="chat-call-stage">
          {call.localStream && <VideoTile stream={call.localStream} label={actor.name} muted local/>}
          {call.remoteStreams.map(({ peerKey, stream }) => <VideoTile key={peerKey} stream={stream} label={peers.find((peer) => peer.key === peerKey)?.name || 'Ishtirokchi'}/>)}
          <div className="chat-call-stage__controls"><button type="button" className="icon-btn" onClick={call.toggleMute} aria-label={call.muted ? 'Mikrofonni yoqish' : 'Mikrofonni o‘chirish'}>{call.muted ? <MicOff size={17}/> : <Mic size={17}/>}</button><button type="button" className="icon-btn" onClick={call.toggleCamera} aria-label={call.cameraOff ? 'Kamerani yoqish' : 'Kamerani o‘chirish'}>{call.cameraOff ? <VideoOff size={17}/> : <Video size={17}/>}</button><button type="button" className="btn btn--sm chat-call-end" onClick={call.end}><PhoneOff size={15}/> Yakunlash</button></div>
        </div>}
        <div className="chat-thread__messages">{visibleMessages.map((message) => {
          const mine = message.fromKey === actor.key;
          const readCount = (message.readBy || []).filter((key) => key !== actor.key).length;
          const directRead = selected.type === 'direct' && message.readBy?.includes(selected.peerKey);
          const reactions = Object.entries(message.reactions || {}).filter(([, voters]) => voters.length);
          return <article key={message.id} className={`chat-message${mine ? ' is-mine' : ''}`}>
            <div className="chat-message__meta"><strong>{mine ? 'Siz' : message.fromName}</strong><span>{new Intl.DateTimeFormat('uz-UZ', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(message.createdAt))}</span></div>
            <p>{message.text}</p>
            <div className="chat-message__bottom">
              {mine && <small className={`chat-message__receipt${directRead || readCount ? ' is-read' : ''}`}>{directRead || readCount ? <CheckCheck size={13}/> : <Check size={13}/>} {selected.type === 'direct' ? (directRead ? 'Ko‘rildi' : 'Yuborildi') : readCount ? `${readCount} kishi ko‘rdi` : 'Yuborildi'}</small>}
              <div className="chat-message__reactions">
                {reactions.map(([emoji, voters]) => <button type="button" key={emoji} className={`chat-reaction${voters.includes(actor.key) ? ' is-selected' : ''}`} onClick={() => toggleReaction(message.id, emoji)} aria-pressed={voters.includes(actor.key)} aria-label={`${emoji}, ${voters.length} ta reaksiya`}>{emoji}<span>{voters.length}</span></button>)}
                <div className="chat-sticker-picker">
                  <button type="button" className="chat-sticker-picker__toggle" onClick={() => setReactionPicker(reactionPicker === message.id ? '' : message.id)} aria-label="Stiker bilan reaksiya bildirish" aria-expanded={reactionPicker === message.id}><SmilePlus size={14}/></button>
                  {reactionPicker === message.id && <div className="chat-sticker-picker__menu">{STICKERS.map((emoji) => <button type="button" key={emoji} onClick={() => toggleReaction(message.id, emoji)} aria-label={`${emoji} reaksiyasi`}>{emoji}</button>)}</div>}
                </div>
              </div>
            </div>
          </article>;
        })}{!visibleMessages.length && <div className="chat-thread__empty"><span><MessageCircle size={23}/></span><strong>Hali xabar yo‘q</strong><p>Suhbatni boshlash uchun birinchi xabarni yozing.</p></div>}<div ref={endRef}/></div>
        <form className="chat-compose" onSubmit={send}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`${selected.type === 'general' ? 'Umumiy chatga' : 'Xabar'} yozing...`} rows={1} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(event); } }} /><button type="submit" className="btn btn--primary" disabled={!draft.trim()} aria-label="Xabar yuborish"><Send size={17}/><span>Yuborish</span></button></form>
      </section>
    </Card>
  </div>;
}


