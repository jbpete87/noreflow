import { useRef, useEffect, useState } from 'react';
import { useStreamLayout } from '@noreflow/stream-ui';
import type { StreamMessage } from '@noreflow/stream-ui';

const CONVERSATIONS: { q: string; a: string }[] = [
  {
    q: 'What causes layout jank in AI chat apps?',
    a: 'Every token that streams in changes the text content, which forces the browser to recalculate the height of the message container. This triggers a forced synchronous layout — also called a "reflow." When it happens 30+ times per second during streaming, you get visible stuttering and scroll jumps.',
  },
  {
    q: 'How does noreflow solve this?',
    a: 'Noreflow runs the entire layout computation in pure TypeScript — no DOM needed. When a new token arrives, we recalculate the message height mathematically and render to Canvas. The browser never has to reflow anything. Zero layout thrashing, zero scroll jumps, buttery smooth streaming.',
  },
  {
    q: 'Can I use it in my own project?',
    a: 'Absolutely. Install noreflow and @noreflow/stream-ui from npm. The useStreamLayout hook gives you a canvas ref, addMessage, and updateMessage functions. Wire it to your streaming API and you get jank-free chat rendering out of the box.',
  },
];

const SIDEBAR_ITEMS = ['Getting started', 'Layout jank explained', 'Performance tuning'];

const TOKEN_INTERVAL = 55;
const PAUSE_BETWEEN_QA = 2000;

export default function StreamTest() {
  const [stats, setStats] = useState({ nodes: 0, layoutMs: 0, tokens: 0, msgs: 0 });
  const tokensRef = useRef(0);
  const msgsRef = useRef(0);
  const convoIdxRef = useRef(0);

  const { canvasRef, addMessage, updateMessage, setStreamingIdx, nodeCount } = useStreamLayout({
    sidebarItems: SIDEBAR_ITEMS,
    title: 'Noreflow AI',
    subtitle: 'stream-ui test',
    placeholder: 'Type a message...',
    onFrame: ({ nodeCount: n, layoutMs }) => {
      setStats(s => ({ ...s, nodes: n, layoutMs }));
    },
  });

  // Store callbacks in refs so the effect never restarts
  const apiRef = useRef({ addMessage, updateMessage, setStreamingIdx });
  apiRef.current = { addMessage, updateMessage, setStreamingIdx };

  useEffect(() => {
    let cancelled = false;

    async function runConversation() {
      while (!cancelled) {
        const convo = CONVERSATIONS[convoIdxRef.current % CONVERSATIONS.length]!;
        const api = apiRef.current;

        const qId = Date.now();
        const qMsg: StreamMessage = { id: qId, role: 'user', text: convo.q };
        api.addMessage(qMsg);
        msgsRef.current++;
        setStats(s => ({ ...s, msgs: msgsRef.current }));
        await sleep(800);

        if (cancelled) break;

        const aId = Date.now() + 1;
        const aMsg: StreamMessage = { id: aId, role: 'assistant', text: '' };
        api.addMessage(aMsg);
        msgsRef.current++;
        const msgIdx = msgsRef.current - 1;
        api.setStreamingIdx(msgIdx);

        const tokens = convo.a.split(' ');
        let accumulated = '';
        for (let i = 0; i < tokens.length; i++) {
          if (cancelled) break;
          accumulated += (i > 0 ? ' ' : '') + tokens[i];
          apiRef.current.updateMessage(aId, accumulated);
          tokensRef.current++;
          setStats(s => ({ ...s, tokens: tokensRef.current, msgs: msgsRef.current }));
          await sleep(TOKEN_INTERVAL);
        }

        apiRef.current.setStreamingIdx(-1);
        convoIdxRef.current++;

        await sleep(PAUSE_BETWEEN_QA);
      }
    }

    runConversation();

    return () => { cancelled = true; };
  }, []); // empty deps — runs exactly once

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0f', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>@noreflow/stream-ui integration test</h1>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          nodes: {stats.nodes} | layout: {stats.layoutMs.toFixed(2)}ms | tokens: {stats.tokens} | messages: {stats.msgs}
        </span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
