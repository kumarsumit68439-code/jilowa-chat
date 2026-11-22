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
  const bottomRef = useRef(null);
  const channelRef = useRef(null);

  // Auth + load key from localStorage
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

  // Load servers
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await sb().from('chat_servers').select('*').order('created_at');
      if (data?.length) {
        setServers(data);
        setActiveServer(data[0]);
      } else {
        // Bootstrap default server + channels for first user
        const { data: s } = await sb()
          .from('chat_servers')
          .insert({ name: 'Jilowa HQ', icon: '⚡', owner_id: user.id })
          .select()
          .single();
        if (s) {
          await sb().from('chat_members').insert({ server_id: s.id, user_id: user.id, role: 'owner' });
          const ch = [
            { server_id: s.id, name: 'general', topic: 'General chat' },
            { server_id: s.id, name: 'ai-assistant', topic: 'Talk to AI via Gateway', is_ai: true },
            { server_id: s.id, name: 'announcements', topic: 'News' },
          ];
          await sb().from('chat_channels').insert(ch);
          setServers([s]);
          setActiveServer(s);
        }
      }
    })();
  }, [user]);

  // Load channels when server changes
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

  // Load messages + realtime subscribe
  useEffect(() => {
    if (!activeChannel) {
      setMessages([]);
      return;
    }
    channelRef.current = activeChannel;

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

    const author =
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'User';

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

    // AI channel → call Gateway and post reply
    if (activeChannel.is_ai) {
      try {
        const key = gatewayKey || localStorage.getItem('jilowa_gateway_key');
        const history = [
          {
            role: 'system',
            content:
              'You are the AI assistant inside Jilowa Chat, connected to AI Gateway Hub. Be helpful and concise.',
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
          '(empty response)';
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
          content: `AI error: ${e.message}. Set your sk-gw- key in Settings.`,
          is_ai: true,
        });
      }
    }

    setSending(false);
  }, [text, activeChannel, user, sending, gatewayKey, messages]);

  async function createChannel() {
    const name = prompt('Channel name (no spaces preferred):');
    if (!name || !activeServer) return;
    const isAi = confirm('Make this an AI channel? (messages call AI Gateway)');
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

  async function logout() {
    await sb().auth.signOut();
    window.location.href = '/login';
  }

  if (!user) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--mute)' }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={S.shell}>
      {/* Server rail */}
      <nav style={S.rail}>
        {servers.map((s) => (
          <button
            key={s.id}
            type="button"
            title={s.name}
            style={{
              ...S.serverBtn,
              ...(activeServer?.id === s.id ? S.serverBtnOn : {}),
            }}
            onClick={() => setActiveServer(s)}
          >
            {s.icon || s.name[0]}
          </button>
        ))}
        <div style={S.railSep} />
        <Link href="/settings" style={S.serverBtn} title="Settings">
          ⚙️
        </Link>
      </nav>

      {/* Channel list */}
      <aside style={S.sidebar}>
        <div style={S.sidebarHead}>
          <strong>{activeServer?.name || 'Server'}</strong>
        </div>
        <div style={S.channelList}>
          <div style={S.cat}>
            TEXT CHANNELS
            <button type="button" style={S.plus} onClick={createChannel} title="New channel">
              +
            </button>
          </div>
          {channels.map((ch) => (
            <button
              key={ch.id}
              type="button"
              style={{
                ...S.channel,
                ...(activeChannel?.id === ch.id ? S.channelOn : {}),
              }}
              onClick={() => setActiveChannel(ch)}
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
          <button type="button" style={S.iconBtn} onClick={logout} title="Log out">
            ⎋
          </button>
        </div>
      </aside>

      {/* Main chat */}
      <main style={S.main}>
        <header style={S.top}>
          <span style={{ fontWeight: 700 }}>
            {activeChannel ? (activeChannel.is_ai ? '✦' : '#') : ''} {activeChannel?.name || 'Select a channel'}
          </span>
          {activeChannel?.topic && (
            <span style={{ color: 'var(--mute)', fontSize: 13, marginLeft: 12 }}>{activeChannel.topic}</span>
          )}
          {activeChannel?.is_ai && (
            <span style={S.badge}>AI Gateway</span>
          )}
        </header>

        <div style={S.messages}>
          {messages.length === 0 && (
            <div style={{ color: 'var(--mute)', padding: 24 }}>
              {activeChannel?.is_ai
                ? 'This is an AI channel. Messages are sent to AI Gateway Hub and the reply appears here in real time.'
                : 'No messages yet. Say hello!'}
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} style={S.msg}>
              <div
                style={{
                  ...S.msgAvatar,
                  background: m.is_ai
                    ? 'linear-gradient(135deg,#7c5cff,#22d3ee)'
                    : 'var(--accent)',
                }}
              >
                {m.is_ai ? 'AI' : (m.author_name || '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <strong style={{ fontSize: 15 }}>{m.author_name}</strong>
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
              placeholder={
                activeChannel
                  ? `Message ${activeChannel.is_ai ? 'AI · ' : '#'}${activeChannel.name}`
                  : 'Select a channel'
              }
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
              {sending ? '…' : 'Send'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

const S = {
  shell: { display: 'flex', height: '100vh', background: 'var(--bg)' },
  rail: {
    width: 72,
    background: 'var(--bg4)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 0',
    gap: 8,
  },
  serverBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    border: 0,
    background: 'var(--bg2)',
    color: 'var(--text)',
    fontSize: 22,
    display: 'grid',
    placeItems: 'center',
    transition: 'border-radius .15s, background .15s',
    textDecoration: 'none',
  },
  serverBtnOn: {
    borderRadius: 14,
    background: 'var(--accent)',
  },
  railSep: { width: 32, height: 2, background: 'var(--line)', margin: '4px 0' },
  sidebar: {
    width: 240,
    background: 'var(--bg2)',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHead: {
    padding: '16px',
    borderBottom: '1px solid var(--line)',
    fontSize: 15,
  },
  channelList: { flex: 1, overflowY: 'auto', padding: '8px' },
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
  plus: {
    border: 0,
    background: 'transparent',
    color: 'var(--mute)',
    fontSize: 18,
    lineHeight: 1,
    padding: 0,
  },
  channel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    textAlign: 'left',
    padding: '6px 8px',
    border: 0,
    borderRadius: 4,
    background: 'transparent',
    color: 'var(--mute)',
    fontSize: 15,
  },
  channelOn: {
    background: 'rgba(255,255,255,.06)',
    color: 'var(--text)',
  },
  userBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    background: 'var(--bg4)',
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
  },
  iconBtn: {
    border: 0,
    background: 'transparent',
    color: 'var(--mute)',
    fontSize: 16,
    padding: 6,
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg3)' },
  top: {
    height: 48,
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    borderBottom: '1px solid var(--line)',
    boxShadow: '0 1px 0 rgba(0,0,0,.2)',
  },
  badge: {
    marginLeft: 'auto',
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 99,
    background: 'rgba(124,92,255,.25)',
    color: '#c4b5fd',
  },
  messages: { flex: 1, overflowY: 'auto', padding: '16px 0' },
  msg: { display: 'flex', gap: 12, padding: '8px 16px' },
  msgAvatar: {
    width: 40,
    height: 40,
    borderRadius: 50,
    display: 'grid',
    placeItems: 'center',
    fontWeight: 700,
    fontSize: 14,
    flex: 'none',
    color: '#fff',
  },
  composerWrap: { padding: '0 16px 24px' },
  composer: {
    display: 'flex',
    gap: 8,
    background: 'var(--bg2)',
    borderRadius: 8,
    padding: 8,
  },
  composerInput: {
    flex: 1,
    border: 0,
    background: 'transparent',
    color: 'var(--text)',
    outline: 'none',
    padding: '8px',
  },
  sendBtn: {
    border: 0,
    borderRadius: 6,
    padding: '8px 16px',
    background: 'var(--accent)',
    color: '#fff',
    fontWeight: 600,
  },
};
