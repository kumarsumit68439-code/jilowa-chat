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
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [bots, setBots] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [gatewayKey, setGatewayKey] = useState('');
  // mobile: servers | channels | chat | members
  const [view, setView] = useState('channels');
  const [isMobile, setIsMobile] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const mq = () => setIsMobile(window.innerWidth < 900);
    mq();
    window.addEventListener('resize', mq);
    return () => window.removeEventListener('resize', mq);
  }, []);

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
      const { data } = await sb().from('chat_servers').select('*').order('created_at');
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
          await sb().from('chat_members').insert({
            server_id: s.id,
            user_id: user.id,
            role: 'owner',
            display_name: user.email?.split('@')[0],
          });
          await sb().from('chat_roles').insert([
            { server_id: s.id, name: 'Admin', color: '#f23f43', position: 2 },
            { server_id: s.id, name: 'Member', color: '#99aab5', position: 1 },
          ]);
          await sb().from('chat_channels').insert([
            { server_id: s.id, name: 'general', topic: 'General chat', type: 'text' },
            { server_id: s.id, name: 'ai-assistant', topic: 'AI via Gateway', is_ai: true, type: 'text' },
            { server_id: s.id, name: 'Lobby', topic: 'Voice', type: 'voice' },
          ]);
          setServers([s]);
          setActiveServer(s);
        }
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!activeServer || !user) return;
    (async () => {
      const [{ data: ch }, { data: mem }, { data: rol }, { data: bt }] = await Promise.all([
        sb().from('chat_channels').select('*').eq('server_id', activeServer.id).order('created_at'),
        sb().from('chat_members').select('*').eq('server_id', activeServer.id),
        sb().from('chat_roles').select('*').eq('server_id', activeServer.id).order('position', { ascending: false }),
        sb().from('chat_bots').select('id, name, username, is_active').eq('owner_id', user.id),
      ]);
      setChannels(ch || []);
      setMembers(mem || []);
      setRoles(rol || []);
      setBots((bt || []).filter((b) => b.is_active));
      const textCh = (ch || []).filter((c) => (c.type || 'text') !== 'voice');
      if (textCh.length) {
        setActiveChannel((prev) => {
          if (prev && textCh.some((c) => c.id === prev.id)) return prev;
          return textCh[0];
        });
      } else setActiveChannel(null);
    })();
  }, [activeServer, user]);

  useEffect(() => {
    if (!activeChannel || (activeChannel.type || 'text') === 'voice') {
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
    if ((activeChannel.type || 'text') === 'voice') return;
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
          { role: 'system', content: 'You are the AI assistant in Jilowa Chat.' },
          ...messages.slice(-12).map((m) => ({
            role: m.is_ai ? 'assistant' : 'user',
            content: m.content,
          })),
          { role: 'user', content },
        ];
        const json = await chatCompletion({ apiKey: key, messages: history, model: 'llama-3.3-70b-versatile' });
        const reply = json?.choices?.[0]?.message?.content || '(empty)';
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
          content: `AI error: ${e.message}`,
          is_ai: true,
        });
      }
    }
    setSending(false);
  }, [text, activeChannel, user, sending, gatewayKey, messages]);

  async function createServer() {
    const name = prompt('Server name:');
    if (!name || !user) return;
    const { data: s, error } = await sb()
      .from('chat_servers')
      .insert({ name, icon: '🎮', owner_id: user.id })
      .select()
      .single();
    if (error) return alert(error.message);
    await sb().from('chat_members').insert({
      server_id: s.id,
      user_id: user.id,
      role: 'owner',
      display_name: user.email?.split('@')[0],
    });
    await sb().from('chat_channels').insert([
      { server_id: s.id, name: 'general', type: 'text' },
      { server_id: s.id, name: 'General', type: 'voice' },
    ]);
    setServers((x) => [...x, s]);
    setActiveServer(s);
    setView('channels');
  }

  async function createChannel(type) {
    const label = type === 'voice' ? 'Voice channel name:' : 'Text channel name:';
    const name = prompt(label);
    if (!name || !activeServer) return;
    const isAi = type === 'text' ? confirm('AI channel?') : false;
    const { data, error } = await sb()
      .from('chat_channels')
      .insert({
        server_id: activeServer.id,
        name: name.replace(/\s+/g, '-').toLowerCase(),
        type,
        is_ai: isAi,
        topic: isAi ? 'AI via Gateway' : type === 'voice' ? 'Voice' : '',
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

  function selectChannel(ch) {
    setActiveChannel(ch);
    if ((ch.type || 'text') !== 'voice') setView('chat');
  }

  const textChannels = channels.filter((c) => (c.type || 'text') !== 'voice');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  if (!user) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--mute)' }}>
        Loading…
      </div>
    );
  }

  const showRail = !isMobile || view === 'servers';
  const showSidebar = !isMobile || view === 'channels';
  const showChat = !isMobile || view === 'chat';
  const showMembers = !isMobile || view === 'members';

  return (
    <div className="no-scroll" style={S.shell}>
      {/* ===== SERVER RAIL ===== */}
      {showRail && (
        <nav style={S.rail}>
          {servers.map((s) => (
            <button
              key={s.id}
              type="button"
              title={s.name}
              style={{ ...S.serverBtn, ...(activeServer?.id === s.id ? S.serverBtnOn : {}) }}
              onClick={() => {
                setActiveServer(s);
                setView('channels');
              }}
            >
              {s.icon || s.name[0]}
            </button>
          ))}
          <button type="button" style={{ ...S.serverBtn, color: 'var(--green)' }} onClick={createServer} title="Add Server">
            +
          </button>
          <div style={S.railSep} />
          <Link href="/discover" style={S.serverBtn} title="Discover">🧭</Link>
          <Link href="/botfather" style={S.serverBtn} title="BotFather">🤖</Link>
          <Link href="/nitro" style={S.serverBtn} title="Premium">💎</Link>
          <Link href="/settings" style={S.serverBtn} title="Settings">⚙️</Link>
          {isMobile && (
            <button type="button" style={S.serverBtn} onClick={() => setView('channels')}>
              →
            </button>
          )}
        </nav>
      )}

      {/* ===== CHANNEL LIST ===== */}
      {showSidebar && (
        <aside style={S.sidebar}>
          <div style={S.sidebarHead}>
            {isMobile && (
              <button type="button" style={S.iconBtn} onClick={() => setView('servers')}>
                ☰
              </button>
            )}
            <strong style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeServer?.name || 'Server'}
            </strong>
            {isMobile && (
              <button type="button" style={S.iconBtn} onClick={() => setView('members')} title="Members">
                👥
              </button>
            )}
          </div>

          <div className="scroll-y" style={S.channelList}>
            <div style={S.cat}>
              <span>TEXT CHANNELS</span>
              <button type="button" style={S.plus} onClick={() => createChannel('text')} title="Create text channel">
                +
              </button>
            </div>
            {textChannels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                style={{ ...S.channel, ...(activeChannel?.id === ch.id ? S.channelOn : {}) }}
                onClick={() => selectChannel(ch)}
              >
                <span style={{ opacity: 0.75, width: 18 }}>{ch.is_ai ? '✦' : '#'}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.name}</span>
              </button>
            ))}

            <div style={{ ...S.cat, marginTop: 12 }}>
              <span>VOICE CHANNELS</span>
              <button type="button" style={S.plus} onClick={() => createChannel('voice')} title="Create voice channel">
                +
              </button>
            </div>
            {voiceChannels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                style={{ ...S.channel, ...(activeChannel?.id === ch.id ? S.channelOn : {}) }}
                onClick={() => selectChannel(ch)}
              >
                <span style={{ opacity: 0.75, width: 18 }}>🔊</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.name}</span>
              </button>
            ))}
          </div>

          <div style={S.userBar}>
            <div style={S.avatar}>{(user.email || 'U')[0].toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email?.split('@')[0]}
              </div>
              <div style={{ fontSize: 11, color: 'var(--green)' }}>● Online</div>
            </div>
            <button type="button" style={S.iconBtn} onClick={logout} title="Log out">⎋</button>
          </div>
        </aside>
      )}

      {/* ===== MAIN CHAT ===== */}
      {showChat && (
        <main style={S.main}>
          <header style={S.top}>
            {isMobile && (
              <button type="button" style={S.iconBtn} onClick={() => setView('channels')}>
                ←
              </button>
            )}
            <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeChannel
                ? `${(activeChannel.type || 'text') === 'voice' ? '🔊' : activeChannel.is_ai ? '✦' : '#'} ${activeChannel.name}`
                : 'Select channel'}
            </span>
            {activeChannel?.is_ai && <span style={S.badge}>AI</span>}
            {isMobile && (
              <button type="button" style={{ ...S.iconBtn, marginLeft: 'auto' }} onClick={() => setView('members')}>
                👥
              </button>
            )}
            {!isMobile && (
              <button type="button" style={{ ...S.iconBtn, marginLeft: 'auto' }} onClick={() => setView(view === 'members' ? 'chat' : 'members')} title="Member list">
                👥
              </button>
            )}
          </header>

          {(activeChannel?.type || 'text') === 'voice' ? (
            <div style={S.voicePane}>
              <div style={{ fontSize: 48 }}>🔊</div>
              <h2 style={{ margin: '8px 0 4px' }}>{activeChannel?.name}</h2>
              <p style={{ color: 'var(--mute)', textAlign: 'center', maxWidth: 320 }}>
                Voice channel UI (Discord-style). WebRTC voice can be connected later — structure is ready.
              </p>
              <button type="button" style={S.joinBtn}>
                Join Voice
              </button>
            </div>
          ) : (
            <>
              <div className="scroll-y" style={S.messages}>
                {messages.length === 0 && (
                  <div style={{ padding: 24, color: 'var(--mute)' }}>
                    {activeChannel
                      ? `This is the start of #${activeChannel.name}.`
                      : 'Pick a text channel from the list.'}
                  </div>
                )}
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
            </>
          )}
        </main>
      )}

      {/* ===== MEMBER LIST (Discord right panel) ===== */}
      {showMembers && (
        <aside style={S.members}>
          <div style={S.membersHead}>
            {isMobile && (
              <button type="button" style={S.iconBtn} onClick={() => setView('chat')}>
                ←
              </button>
            )}
            <strong>Online — check</strong>
          </div>
          <div className="scroll-y" style={{ flex: 1, padding: '8px 12px' }}>
            {roles.length > 0 && (
              <>
                <div style={S.roleLabel}>ROLES</div>
                {roles.map((r) => (
                  <div key={r.id} style={S.roleRow}>
                    <span style={{ ...S.roleDot, background: r.color || '#99aab5' }} />
                    {r.name}
                  </div>
                ))}
              </>
            )}

            <div style={S.roleLabel}>ONLINE — {members.length + bots.length}</div>
            {members.map((m) => (
              <button
                key={m.user_id}
                type="button"
                style={S.memberRow}
                onClick={() => {
                  setView('members');
                  alert(
                    `Member\nID: ${m.user_id}\nRole: ${m.role}\nName: ${m.display_name || '—'}`
                  );
                }}
              >
                <div style={S.memberAv}>
                  {(m.display_name || 'U')[0].toUpperCase()}
                  <i style={S.onlineDot} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.display_name || m.user_id.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mute)' }}>{m.role}</div>
                </div>
              </button>
            ))}

            {bots.length > 0 && (
              <>
                <div style={S.roleLabel}>BOTS — {bots.length}</div>
                {bots.map((b) => (
                  <Link key={b.id} href="/botfather" style={S.memberRow}>
                    <div style={{ ...S.memberAv, background: '#5865f2' }}>
                      🤖
                      <i style={S.onlineDot} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mute)' }}>@{b.username} · bot</div>
                    </div>
                  </Link>
                ))}
              </>
            )}

            {members.length === 0 && bots.length === 0 && (
              <p style={{ color: 'var(--mute)', fontSize: 13 }}>No members loaded. Run schema.sql if empty.</p>
            )}
          </div>
        </aside>
      )}
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
    padding: '12px 12px',
    borderBottom: '1px solid var(--line)',
    fontSize: 15,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 'none',
    minHeight: 48,
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
  plus: { border: 0, background: 'transparent', color: 'var(--mute)', fontSize: 18, cursor: 'pointer', lineHeight: 1 },
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
  iconBtn: {
    border: 0,
    background: 'transparent',
    color: 'var(--mute)',
    fontSize: 18,
    cursor: 'pointer',
    padding: 4,
    flex: 'none',
  },
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
    minHeight: 48,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 12px',
    borderBottom: '1px solid var(--line)',
    flex: 'none',
  },
  badge: {
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
  composerWrap: { padding: '0 12px 12px', flex: 'none' },
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
    fontSize: 16,
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
  voicePane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  joinBtn: {
    marginTop: 16,
    padding: '12px 24px',
    border: 0,
    borderRadius: 8,
    background: 'var(--green)',
    color: '#fff',
    fontWeight: 700,
  },
  members: {
    width: 240,
    flex: 'none',
    background: 'var(--bg2)',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid var(--line)',
    minWidth: 0,
    overflow: 'hidden',
  },
  membersHead: {
    minHeight: 48,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 12px',
    borderBottom: '1px solid var(--line)',
    flex: 'none',
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: 'var(--mute)',
    margin: '12px 0 6px',
  },
  roleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 0',
    fontSize: 13,
  },
  roleDot: { width: 10, height: 10, borderRadius: 50, flex: 'none' },
  memberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    textAlign: 'left',
    padding: '6px 4px',
    border: 0,
    borderRadius: 6,
    background: 'transparent',
    color: 'var(--text)',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  memberAv: {
    width: 32,
    height: 32,
    borderRadius: 50,
    background: '#5865f2',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 700,
    fontSize: 13,
    position: 'relative',
    flex: 'none',
  },
  onlineDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 10,
    height: 10,
    borderRadius: 50,
    background: 'var(--green)',
    border: '2px solid var(--bg2)',
  },
};
