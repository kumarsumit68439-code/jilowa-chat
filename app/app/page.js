'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { sb } from '@/lib/supabase-browser';
import { chatCompletion } from '@/lib/gateway';
import Link from 'next/link';

export default function ChatApp() {
  const [user, setUser] = useState(null);
  const [servers, setServers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [gatewayKey, setGatewayKey] = useState('');
  const [mobilePanel, setMobilePanel] = useState('chat'); // rail | channels | chat
  const bottomRef = useRef(null);

  useEffect(() => {
    sb().auth.getUser().then(({ data }) => setUser(data?.user || null));
    const { data: sub } = sb().auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    try {
      setGatewayKey(localStorage.getItem('jilowa_gateway_key') || '');
    } catch {}
    return () => sub?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await sb().from('chat_servers').select('*').order('created_at');
      if (error) {
        console.error(error);
        return;
      }
      if (data?.length) {
        setServers(data);
        setActiveServer(data[0]);
      } else {
        const { data: s } = await sb()
          .from('chat_servers')
          .insert({ name: 'Jilowa HQ', icon: '⚡', owner_id: user.id })
          .select()
          .single();
        if (s) {
          await sb().from('chat_members').insert({ server_id: s.id, user_id: user.id, role: 'owner' });
          await sb().from('chat_channels').insert([
            { server_id: s.id, name: 'general', topic: 'General chat' },
            { server_id: s.id, name: 'ai-assistant', topic: 'AI via Gateway', is_ai: true },
            { server_id: s.id, name: 'announcements', topic: 'News' },
          ]);
          setServers([s]);
          setActiveServer(s);
        }
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!activeServer) return;
    (async () => {
      const { data } = await sb()
        .from('chat_channels')
        .select('*')
        .eq('server_id', activeServer.id)
        .order('created_at');
      setChannels(data || []);
      if (data?.length) setActiveChannel(data[0]);
      else setActiveChannel(null);
    })();
  }, [activeServer]);

  useEffect(() => {
    if (!activeChannel) {
      setMessages([]);
      return;
    }
    (async () => {
      const { data } = await sb()
        .from('chat_messages')
        .select('*')
        .eq('channel_id', activeChannel.id)
        .order('created_at', { ascending: true })
        .limit(200);
      setMessages(data || []);
    })();

    const room = sb()
      .channel(`msg:${activeChannel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${activeChannel.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      sb().removeChannel(room);
    };
  }, [activeChannel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async () => {
    const content = text.trim();
    if (!content || !activeChannel || !user || sending) return;
    setSending(true);
    setText('');

    const author = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

    const { error } = await sb().from('chat_messages').insert({
      channel_id: activeChannel.id,
      user_id: user.id,
      author_name: author,
      content,
      is_ai: false,
    });

    if (error) {
      alert(error.message);
      setSending(false);
      return;
    }

    if (activeChannel.is_ai) {
      try {
        const key = gatewayKey || localStorage.getItem('jilowa_gateway_key');
        const history = [
          {
            role: 'system',
            content: 'You are the AI assistant in Jilowa Chat, powered by AI Gateway Hub.',
          },
          ...messages.slice(-12).map((m) => ({
            role: m.is_ai ? 'assistant' : 'user',
            content: m.content,
          })),
          { role: 'user', content },
        ];
        const json = await chatCompletion({
          apiKey: key,
          messages: history,
          model: 'llama-3.3-70b-versatile',
        });
        const reply =
          json?.choices?.[0]?.message?.content ||
          json?.choices?.[0]?.text ||
          '(empty)';
        await sb().from('chat_messages').insert({
          channel_id: activeChannel.id,
          user_id: null,
          author_name: 'AI Gateway',
          content: reply,
          is_ai: true,
        });
      } catch (e) {
        await sb().from('chat_messages').insert({
          channel_id: activeChannel.id,
          user_id: null,
          author_name: 'System',
          content: `AI error: ${e.message}. Set sk-gw- key in Settings.`,
          is_ai: true,
        });
      }
    }

    setSending(false);
  }, [text, activeChannel, user, sending, gatewayKey, messages]);

  async function createChannel() {
    const name = prompt('Channel name:');
    if (!name || !activeServer) return;
    const isAi = confirm('AI channel? (uses AI Gateway)');
    const { data, error } = await sb()
      .from('chat_channels')
      .insert({
        server_id: activeServer.id,
        name: name.replace(/\s+/g, '-').toLowerCase(),
        is_ai: isAi,
        topic: isAi ? 'AI via Gateway' : '',
      })
      .select()
      .single();
    if (error) alert(error.message);
    else setChannels((c) => [...c, data]);
  }

  async function createServer() {
    const name = prompt('Server name:');
    if (!name || !user) return;
    const { data: s, error } = await sb()
      .from('chat_servers')
      .insert({ name, icon: '🎮', owner_id: user.id })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return;
    }
    await sb().from('chat_members').insert({ server_id: s.id, user_id: user.id, role: 'owner' });
    await sb().from('chat_channels').insert({ server_id: s.id, name: 'general' });
    setServers((x) => [...x, s]);
    setActiveServer(s);
  }

  async function logout() {
    await sb().auth.signOut();
    window.location.href = '/login';
  }

  function pickChannel(ch) {
    setActiveChannel(ch);
    setMobilePanel('chat');
  }

  if (!user) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--mute)' }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="no-scroll" style={S.shell}>
      {/* Server rail */}
      <nav
        style={{
          ...S.rail,
          ...(typeof window !== 'undefined' && window.innerWidth < 768 && mobilePanel !== 'rail'
            ? { display: 'none' }
            : {}),
        }}
        className="app-rail"
      >
        {servers.map((s) => (
          <button
            key={s.id}
            type="button"
            title={s.name}
            style={{ ...S.serverBtn, ...(activeServer?.id === s.id ? S.serverBtnOn : {}) }}
            onClick={() => {
              setActiveServer(s);
              setMobilePanel('channels');
            }}
          >
            {s.icon || s.name[0]}
          </button>
        ))}
        <button type="button" style={S.serverBtn} onClick={createServer} title="Add server">
          +
        </button>
        <div style={S.railSep} />
        <Link href="/discover" style={S.serverBtn} title="Discover">
          🧭
        </Link>
        <Link href="/nitro" style={S.serverBtn} title="Premium">
          💎
        </Link>
        <Link href="/botfather" style={S.serverBtn} title="BotFather">
          🤖
        </Link>
        <Link href="/friends" style={S.serverBtn} title="Friends">
          👥
        </Link>
        <Link href="/settings" style={S.serverBtn} title="Settings">
          ⚙️
        </Link>
      </nav>

      {/* Channels */}
      <aside style={S.sidebar} className="app-sidebar">
        <div style={S.sidebarHead}>
          <button type="button" style={S.mobileOnly} onClick={() => setMobilePanel('rail')}>
            ☰
          </button>
          <strong style={{ flex: 1 }}>{activeServer?.name || 'Server'}</strong>
        </div>
        <div className="scroll-y" style={S.channelList}>
          <div style={S.cat}>
            TEXT CHANNELS
            <button type="button" style={S.plus} onClick={createChannel}>
              +
            </button>
          </div>
          {channels.map((ch) => (
            <button
              key={ch.id}
              type="button"
              style={{ ...S.channel, ...(activeChannel?.id === ch.id ? S.channelOn : {}) }}
              onClick={() => pickChannel(ch)}
            >
              <span style={{ opacity: 0.7 }}>{ch.is_ai ? '✦' : '#'}</span> {ch.name}
            </button>
          ))}
        </div>
        <div style={S.userBar}>
          <div style={S.avatar}>{(user.email || 'U')[0].toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email?.split('@')[0]}
            </div>
            <div style={{ fontSize: 11, color: 'var(--mute)' }}>Online</div>
          </div>
          <button type="button" style={S.iconBtn} onClick={logout}>
            ⎋
          </button>
        </div>
      </aside>

      {/* Chat */}
      <main style={S.main} className="app-main">
        <header style={S.top}>
          <button type="button" style={S.mobileOnly} onClick={() => setMobilePanel('channels')}>
            ←
          </button>
          <span style={{ fontWeight: 700 }}>
            {activeChannel ? (activeChannel.is_ai ? '✦' : '#') : ''}{' '}
            {activeChannel?.name || 'Select channel'}
          </span>
          {activeChannel?.is_ai && <span style={S.badge}>AI Gateway</span>}
        </header>

        <div className="scroll-y" style={S.messages}>
          {messages.map((m) => (
            <div key={m.id} style={S.msg}>
              <div
                style={{
                  ...S.msgAvatar,
                  background: m.is_ai
                    ? 'linear-gradient(135deg,#7c5cff,#22d3ee)'
                    : '#5865f2',
                }}
              >
                {m.is_ai ? 'AI' : (m.author_name || '?')[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <strong>{m.author_name}</strong>
                  <time style={{ fontSize: 11, color: 'var(--mute)' }}>
                    {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
                  </time>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div style={S.composerWrap}>
          <div style={S.composer}>
            <input
              style={S.composerInput}
              placeholder={activeChannel ? `Message #${activeChannel.name}` : 'Select a channel'}
              value={text}
              disabled={!activeChannel || sending}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button type="button" style={S.sendBtn} disabled={!text.trim() || sending} onClick={send}>
              Send
            </button>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .app-rail, .app-sidebar, .app-main { min-height: 0; }
        @media (max-width: 767px) {
          .app-rail {
            display: ${mobilePanel === 'rail' ? 'flex' : 'none'} !important;
            width: 72px !important;
          }
          .app-sidebar {
            display: ${mobilePanel === 'channels' || mobilePanel === 'rail' ? 'flex' : 'none'} !important;
            width: ${mobilePanel === 'rail' ? '0' : '100%'} !important;
            flex: ${mobilePanel === 'channels' ? '1' : 'none'} !important;
          }
          .app-main {
            display: ${mobilePanel === 'chat' ? 'flex' : 'none'} !important;
            flex: 1 !important;
          }
        }
        @media (min-width: 768px) {
          .mobile-only-btn { display: none !important; }
        }
      `}</style>
    </div>
  );
}

const S = {
  shell: {
    display: 'flex',
    height: '100%',
    height: '100dvh',
    width: '100%',
    maxWidth: '100vw',
    background: 'var(--bg)',
    overflow: 'hidden',
    paddingTop: 'var(--sat)',
    paddingBottom: 'var(--sab)',
  },
  rail: {
    width: 72,
    flex: 'none',
    background: 'var(--bg4)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 0',
    gap: 8,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  serverBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    border: 0,
    background: 'var(--bg2)',
    color: 'var(--text)',
    fontSize: 20,
    display: 'grid',
    placeItems: 'center',
    textDecoration: 'none',
    cursor: 'pointer',
    flex: 'none',
  },
  serverBtnOn: { borderRadius: 14, background: 'var(--accent)' },
  railSep: { width: 32, height: 2, background: 'var(--line)', margin: '4px 0', flex: 'none' },
  sidebar: {
    width: 240,
    flex: 'none',
    background: 'var(--bg2)',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
  },
  sidebarHead: {
    padding: '12px 14px',
    borderBottom: '1px solid var(--line)',
    fontSize: 15,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 'none',
  },
  mobileOnly: {
    border: 0,
    background: 'transparent',
    color: 'var(--text)',
    fontSize: 18,
    padding: 4,
    display: 'none',
  },
  channelList: { flex: 1, padding: 8, minHeight: 0 },
  cat: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 11,
    letterSpacing: '0.06em',
    color: 'var(--mute)',
    padding: '8px 8px 4px',
    fontWeight: 700,
  },
  plus: { border: 0, background: 'transparent', color: 'var(--mute)', fontSize: 18, cursor: 'pointer' },
  channel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    textAlign: 'left',
    padding: '8px',
    border: 0,
    borderRadius: 4,
    background: 'transparent',
    color: 'var(--mute)',
    fontSize: 15,
    cursor: 'pointer',
  },
  channelOn: { background: 'rgba(255,255,255,.06)', color: 'var(--text)' },
  userBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    background: 'var(--bg4)',
    flex: 'none',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 50,
    background: 'var(--accent)',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 700,
    fontSize: 13,
    flex: 'none',
  },
  iconBtn: { border: 0, background: 'transparent', color: 'var(--mute)', fontSize: 16, cursor: 'pointer' },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    background: 'var(--bg3)',
    overflow: 'hidden',
  },
  top: {
    height: 48,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 12px',
    borderBottom: '1px solid var(--line)',
    flex: 'none',
  },
  badge: {
    marginLeft: 'auto',
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 99,
    background: 'rgba(124,92,255,.25)',
    color: '#c4b5fd',
  },
  messages: { flex: 1, padding: '12px 0', minHeight: 0 },
  msg: { display: 'flex', gap: 12, padding: '8px 12px' },
  msgAvatar: {
    width: 36,
    height: 36,
    borderRadius: 50,
    display: 'grid',
    placeItems: 'center',
    fontWeight: 700,
    fontSize: 13,
    flex: 'none',
    color: '#fff',
  },
  composerWrap: {
    padding: '0 12px',
    paddingBottom: 'calc(12px + var(--sab))',
    flex: 'none',
  },
  composer: {
    display: 'flex',
    gap: 8,
    background: 'var(--bg2)',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  composerInput: {
    flex: 1,
    border: 0,
    background: 'transparent',
    color: 'var(--text)',
    outline: 'none',
    padding: 8,
    minWidth: 0,
  },
  sendBtn: {
    border: 0,
    borderRadius: 6,
    padding: '10px 14px',
    background: 'var(--accent)',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    flex: 'none',
  },
};
