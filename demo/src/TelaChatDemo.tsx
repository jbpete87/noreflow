import { useState, useCallback, useRef } from 'react';
import { Canvas, View, Text, ScrollView, Pressable, TextInput } from 'tela';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const SAMPLE_RESPONSES = [
  "Noreflow computes layout as a pure function. No DOM, no reflow, no jank. Every streaming token gets pixel-perfect positioning in microseconds.",
  "The stack is simple: Pretext measures text, noreflow computes layout, nopointer handles events, and Tela ties it all together as a React renderer targeting Canvas.",
  "This entire chat UI is rendered to a single <canvas> element. Zero DOM nodes for messages. The React reconciler manages the component tree, and noreflow computes the layout on every commit.",
  "Traditional chat UIs cause layout thrashing on every token — the browser recalculates positions for the entire page. Here, layout is just a function call that returns pixel coordinates.",
];

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View
        style={{
          flexDirection: 'column',
          paddingTop: 3,
          paddingBottom: 3,
          paddingLeft: 72,
          paddingRight: 16,
          alignItems: 'flex-end',
        }}
      >
        <View
          style={{
            flexDirection: 'column',
            backgroundColor: '#059669',
            borderRadius: 12,
            paddingLeft: 14,
            paddingRight: 14,
            paddingTop: 7,
            paddingBottom: 7,
          }}
        >
          <Text
            font="400 13.5px Inter, system-ui, sans-serif"
            lineHeight={18}
            color="#ffffff"
          >
            {message.text}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'column',
        paddingTop: 6,
        paddingBottom: 6,
        paddingLeft: 20,
        paddingRight: 56,
      }}
    >
      <Text
        font="400 13.5px Inter, system-ui, sans-serif"
        lineHeight={22}
        color="#e2e8f0"
      >
        {message.text}
      </Text>
    </View>
  );
}

export function TelaChatDemo() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', text: 'Welcome to the Tela demo. This entire UI is rendered to Canvas — zero DOM nodes for the chat. Try sending a message.' },
  ]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const responseIdxRef = useRef(0);

  const simulateStream = useCallback((responseText: string) => {
    const words = responseText.split(' ');
    const msgId = Date.now().toString();
    setMessages(prev => [...prev, { id: msgId, role: 'assistant', text: '' }]);
    setIsStreaming(true);

    let wordIdx = 0;
    const interval = setInterval(() => {
      wordIdx += Math.ceil(Math.random() * 3);
      if (wordIdx >= words.length) {
        wordIdx = words.length;
        clearInterval(interval);
        setIsStreaming(false);
      }
      const partial = words.slice(0, wordIdx).join(' ');
      setMessages(prev =>
        prev.map(m => (m.id === msgId ? { ...m, text: partial } : m)),
      );
    }, 50);
  }, []);

  const handleSend = useCallback(() => {
    if (isStreaming) return;
    const text = inputText.trim();
    if (!text) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    const response = SAMPLE_RESPONSES[responseIdxRef.current % SAMPLE_RESPONSES.length]!;
    responseIdxRef.current++;

    setTimeout(() => simulateStream(response), 300);
  }, [isStreaming, inputText, simulateStream]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, gap: 20 }}>
      <h2 style={{ color: '#e2e8f0', margin: 0, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500, fontSize: 20, letterSpacing: '-0.02em' }}>
        Tela — Canvas-Rendered Chat
      </h2>
      <p style={{ color: '#64748b', margin: 0, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13 }}>
        Everything inside the canvas below is rendered with Tela. Zero DOM nodes.
      </p>
      <Canvas width={420} height={640}>
        <View style={{ width: 420, height: 640, flexDirection: 'column', backgroundColor: '#0b1120' }}>
          {/* Header */}
          <View
            style={{
              height: 56,
              flexShrink: 0,
              paddingLeft: 20,
              paddingRight: 20,
              alignItems: 'center',
              flexDirection: 'row',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#059669',
                justifyContent: 'center',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <Text font="700 14px Inter, system-ui, sans-serif" lineHeight={16} color="#ffffff" textAlign="center">
                T
              </Text>
            </View>
            <View style={{ flexDirection: 'column', gap: 1, flexGrow: 1 }}>
              <Text font="600 14px Inter, system-ui, sans-serif" lineHeight={18} color="#f1f5f9">
                Tela
              </Text>
              <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399', flexShrink: 0 }} />
                <Text font="400 11px Inter, system-ui, sans-serif" lineHeight={14} color="#64748b">
                  Online
                </Text>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={{ height: 1, flexShrink: 0, backgroundColor: '#141c2e' }} />

          {/* Messages */}
          <ScrollView style={{ flexGrow: 1, flexDirection: 'column' }}>
            <View style={{ height: 12, flexShrink: 0 }} />
            {messages.map(m => (
              <ChatMessage key={m.id} message={m} />
            ))}
            <View style={{ height: 12, flexShrink: 0 }} />
          </ScrollView>

          {/* Input bar */}
          <View
            style={{
              maxHeight: 160,
              flexShrink: 0,
              paddingLeft: 16,
              paddingRight: 16,
              paddingTop: 10,
              paddingBottom: 10,
              flexDirection: 'row',
              gap: 10,
              alignItems: 'flex-end',
            }}
          >
            <View
              style={{
                flexGrow: 1,
                borderRadius: 18,
                borderTop: 1,
                borderColor: '#253247',
                paddingLeft: 16,
                paddingRight: 16,
                paddingTop: 9,
                paddingBottom: 9,
              }}
            >
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                onSubmit={handleSend}
                placeholder={isStreaming ? 'Streaming...' : 'Message...'}
                placeholderColor="#475569"
                font="400 13px Inter, system-ui, sans-serif"
                lineHeight={18}
                color="#e2e8f0"
                style={{ flexGrow: 1 }}
              />
            </View>
            <Pressable
              onPress={handleSend}
              style={{
                width: 36,
                height: 36,
                flexShrink: 0,
                backgroundColor: isStreaming ? '#1e293b' : '#059669',
                borderRadius: 18,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text font="500 15px Inter, system-ui, sans-serif" lineHeight={18} color="#ffffff" textAlign="center">
                ↑
              </Text>
            </Pressable>
          </View>
        </View>
      </Canvas>
    </div>
  );
}
