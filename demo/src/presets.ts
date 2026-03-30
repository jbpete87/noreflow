import type { FlexNode } from 'noreflow';

export interface Preset {
  name: string;
  description: string;
  node: FlexNode;
  cssEquivalent?: string;
}

export const presets: Preset[] = [
  {
    name: 'Mobile App',
    description: 'Full mobile app screen: status bar, header, scrollable content, and tab bar — one JS object.',
    node: {
      style: {
        width: 375,
        height: 667,
        flexDirection: 'column',
      },
      children: [
        { style: { height: 44, flexShrink: 0 } },
        {
          style: { height: 56, flexShrink: 0, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
          children: [
            { style: { width: 32, height: 32 } },
            { style: { flexGrow: 1, height: 20 } },
            { style: { width: 32, height: 32 } },
          ],
        },
        {
          style: { flexGrow: 1, flexDirection: 'column', padding: 16, gap: 12 },
          children: [
            { style: { height: 180, flexShrink: 0 } },
            { style: { height: 72, flexShrink: 0 } },
            { style: { height: 72, flexShrink: 0 } },
            { style: { height: 72, flexShrink: 0 } },
          ],
        },
        {
          style: { height: 83, flexShrink: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', padding: 8 },
          children: [
            { style: { width: 48, height: 48 } },
            { style: { width: 48, height: 48 } },
            { style: { width: 48, height: 48 } },
            { style: { width: 48, height: 48 } },
          ],
        },
      ],
    },
    cssEquivalent: `<!-- app.html -->
<div class="app">
  <div class="status-bar"></div>
  <div class="header">
    <div class="menu-icon"></div>
    <div class="title"></div>
    <div class="action-icon"></div>
  </div>
  <div class="content">
    <div class="hero-card"></div>
    <div class="list-item"></div>
    <div class="list-item"></div>
    <div class="list-item"></div>
  </div>
  <div class="tab-bar">
    <div class="tab"></div>
    <div class="tab"></div>
    <div class="tab"></div>
    <div class="tab"></div>
  </div>
</div>

/* app.css */
.app {
  display: flex;
  flex-direction: column;
  width: 375px;
  height: 667px;
}
.status-bar { height: 44px; flex-shrink: 0; }
.header {
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 12px;
  gap: 12px;
}
.menu-icon { width: 32px; height: 32px; }
.title { flex-grow: 1; height: 20px; }
.action-icon { width: 32px; height: 32px; }
.content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 12px;
}
.hero-card { height: 180px; flex-shrink: 0; }
.list-item { height: 72px; flex-shrink: 0; }
.tab-bar {
  height: 83px;
  flex-shrink: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px;
}
.tab { width: 48px; height: 48px; }`,
  },
  {
    name: 'Chat UI',
    description: 'Messaging interface with sidebar, message bubbles, and input — zero CSS, zero HTML templates.',
    node: {
      style: {
        width: 500,
        height: 400,
        flexDirection: 'row',
      },
      children: [
        {
          style: { width: 140, flexDirection: 'column', padding: 8, gap: 6 },
          children: [
            { style: { height: 36, flexShrink: 0 } },
            { style: { height: 44, flexShrink: 0 } },
            { style: { height: 44, flexShrink: 0 } },
            { style: { height: 44, flexShrink: 0 } },
          ],
        },
        {
          style: { flexGrow: 1, flexDirection: 'column' },
          children: [
            { style: { height: 48, flexShrink: 0 } },
            {
              style: { flexGrow: 1, flexDirection: 'column', padding: 12, gap: 8, justifyContent: 'flex-end' },
              children: [
                {
                  style: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', alignSelf: 'flex-start' },
                  children: [
                    { style: { width: 28, height: 28, flexShrink: 0 } },
                    { style: { width: 180, height: 36 } },
                  ],
                },
                {
                  style: { alignSelf: 'flex-end' },
                  children: [
                    { style: { width: 140, height: 36 } },
                  ],
                },
                {
                  style: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', alignSelf: 'flex-start' },
                  children: [
                    { style: { width: 28, height: 28, flexShrink: 0 } },
                    { style: { width: 200, height: 52 } },
                  ],
                },
              ],
            },
            {
              style: { height: 52, flexShrink: 0, flexDirection: 'row', padding: 8, gap: 8, alignItems: 'center' },
              children: [
                { style: { flexGrow: 1, height: 36 } },
                { style: { width: 36, height: 36, flexShrink: 0 } },
              ],
            },
          ],
        },
      ],
    },
    cssEquivalent: `<!-- chat.html -->
<div class="chat-app">
  <div class="sidebar">
    <div class="search"></div>
    <div class="contact"></div>
    <div class="contact"></div>
    <div class="contact"></div>
  </div>
  <div class="chat-area">
    <div class="header"></div>
    <div class="messages">
      <div class="msg incoming">
        <div class="avatar"></div>
        <div class="bubble"></div>
      </div>
      <div class="msg outgoing">
        <div class="bubble"></div>
      </div>
      <div class="msg incoming">
        <div class="avatar"></div>
        <div class="bubble"></div>
      </div>
    </div>
    <div class="input-bar">
      <div class="text-input"></div>
      <div class="send-btn"></div>
    </div>
  </div>
</div>

/* chat.css */
.chat-app { display: flex; width: 500px; height: 400px; }
.sidebar {
  width: 140px;
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 6px;
}
.search { height: 36px; flex-shrink: 0; }
.contact { height: 44px; flex-shrink: 0; }
.chat-area {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}
.header { height: 48px; flex-shrink: 0; }
.messages {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 8px;
  justify-content: flex-end;
}
.msg { display: flex; gap: 8px; align-items: flex-end; }
.msg.incoming { align-self: flex-start; }
.msg.outgoing { align-self: flex-end; }
.avatar { width: 28px; height: 28px; flex-shrink: 0; }
.input-bar {
  height: 52px;
  flex-shrink: 0;
  display: flex;
  padding: 8px;
  gap: 8px;
  align-items: center;
}
.text-input { flex-grow: 1; height: 36px; }
.send-btn { width: 36px; height: 36px; flex-shrink: 0; }`,
  },
  {
    name: 'Holy Grail',
    description: 'The classic header/sidebar/content/footer — a single object replaces what took CSS engineers years to master.',
    node: {
      style: {
        width: 500,
        height: 400,
        flexDirection: 'column',
      },
      children: [
        { style: { height: 50 } },
        {
          style: { flexGrow: 1, flexDirection: 'row' },
          children: [
            { style: { width: 80 } },
            { style: { flexGrow: 1 } },
            { style: { width: 80 } },
          ],
        },
        { style: { height: 40 } },
      ],
    },
    cssEquivalent: `<!-- holy-grail.html -->
<div class="holy-grail">
  <header></header>
  <div class="body">
    <aside class="left"></aside>
    <main></main>
    <aside class="right"></aside>
  </div>
  <footer></footer>
</div>

/* holy-grail.css */
.holy-grail {
  display: flex;
  flex-direction: column;
  width: 500px;
  height: 400px;
}
header { height: 50px; }
.body {
  flex-grow: 1;
  display: flex;
}
.left { width: 80px; }
main { flex-grow: 1; }
.right { width: 80px; }
footer { height: 40px; }`,
  },
  {
    name: 'Dashboard Grid',
    description: 'CSS Grid with spanning — impossible in Yoga, trivial in Noreflow.',
    node: {
      style: {
        display: 'grid',
        width: 500,
        height: 350,
        gridTemplateColumns: [120, '1fr'],
        gridTemplateRows: [48, '1fr', '1fr'],
        gap: 6,
      },
      children: [
        { style: { gridColumnStart: 1, gridColumnEnd: 3 } },
        { style: { gridRowStart: 2, gridRowEnd: 4 } },
        { style: {} },
        { style: {} },
      ],
    },
    cssEquivalent: `<!-- dashboard.html -->
<div class="dashboard">
  <div class="header"></div>
  <div class="sidebar"></div>
  <div class="content"></div>
  <div class="widget"></div>
</div>

/* dashboard.css */
.dashboard {
  display: grid;
  width: 500px;
  height: 350px;
  grid-template-columns: 120px 1fr;
  grid-template-rows: 48px 1fr 1fr;
  gap: 6px;
}
.header { grid-column: 1 / 3; }
.sidebar { grid-row: 2 / 4; }

/* In Yoga: NOT POSSIBLE.
   Grid support requested in 2018.
   Still not shipped. */`,
  },
  {
    name: 'Card Layout',
    description: 'Wrapping flex cards — a common UI pattern defined in one short object.',
    node: {
      style: {
        width: 480,
        height: 360,
        flexWrap: 'wrap',
        gap: 12,
        padding: 16,
        alignContent: 'flex-start',
      },
      children: [
        { style: { width: 140, height: 100 } },
        { style: { width: 140, height: 100 } },
        { style: { width: 140, height: 100 } },
        { style: { width: 140, height: 100 } },
        { style: { width: 140, height: 100 } },
        { style: { width: 140, height: 100 } },
      ],
    },
    cssEquivalent: `<!-- cards.html -->
<div class="grid">
  <div class="card"></div>
  <div class="card"></div>
  <div class="card"></div>
  <div class="card"></div>
  <div class="card"></div>
  <div class="card"></div>
</div>

/* cards.css */
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px;
  width: 480px;
  height: 360px;
  align-content: flex-start;
}
.card {
  width: 140px;
  height: 100px;
}`,
  },
  {
    name: 'Photo Gallery',
    description: 'Grid gallery with a 2x2 hero span — zero CSS, just coordinates.',
    node: {
      style: {
        display: 'grid',
        width: 500,
        height: 400,
        gridTemplateColumns: ['1fr', '1fr', '1fr'],
        gridTemplateRows: ['1fr', '1fr', '1fr'],
        gap: 6,
        padding: 6,
      },
      children: [
        { style: { gridColumnStart: 1, gridColumnEnd: 3, gridRowStart: 1, gridRowEnd: 3 } },
        { style: {} },
        { style: {} },
        { style: {} },
        { style: {} },
        { style: {} },
      ],
    },
    cssEquivalent: `<!-- gallery.html -->
<div class="gallery">
  <div class="hero"></div>
  <div class="thumb"></div>
  <div class="thumb"></div>
  <div class="thumb"></div>
  <div class="thumb"></div>
  <div class="thumb"></div>
</div>

/* gallery.css */
.gallery {
  display: grid;
  width: 500px;
  height: 400px;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  gap: 6px;
  padding: 6px;
}
.hero {
  grid-column: 1 / 3;
  grid-row: 1 / 3;
}

/* Also impossible in Yoga. */`,
  },
  {
    name: 'Centered Box',
    description: 'Perfect centering — the task that haunted CSS developers for a decade.',
    node: {
      style: {
        width: 400,
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
      },
      children: [
        { style: { width: 120, height: 120 } },
      ],
    },
    cssEquivalent: `<!-- center.html -->
<div class="container">
  <div class="box"></div>
</div>

/* center.css */
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 400px;
  height: 300px;
}
.box {
  width: 120px;
  height: 120px;
}`,
  },
  {
    name: 'Aspect Ratio',
    description: 'Cards with 1:1, 16:9, 3:4, and 2:1 ratios — computed automatically.',
    node: {
      style: {
        width: 500,
        height: 250,
        gap: 12,
        padding: 12,
        alignItems: 'flex-start',
      },
      children: [
        { style: { width: 100, aspectRatio: 1 } },
        { style: { width: 100, aspectRatio: 16 / 9 } },
        { style: { width: 100, aspectRatio: 3 / 4 } },
        { style: { width: 100, aspectRatio: 2 } },
      ],
    },
    cssEquivalent: `<!-- ratios.html -->
<div class="row">
  <div class="card square"></div>
  <div class="card wide"></div>
  <div class="card portrait"></div>
  <div class="card ultrawide"></div>
</div>

/* ratios.css */
.row {
  display: flex;
  gap: 12px;
  padding: 12px;
  align-items: flex-start;
  width: 500px;
  height: 250px;
}
.card { width: 100px; }
.square { aspect-ratio: 1; }
.wide { aspect-ratio: 16/9; }
.portrait { aspect-ratio: 3/4; }
.ultrawide { aspect-ratio: 2; }`,
  },
  {
    name: 'Flex + Grid',
    description: 'Flex column with a CSS Grid child — layout composability Yoga cannot express.',
    node: {
      style: {
        width: 500,
        height: 400,
        flexDirection: 'column',
        gap: 8,
      },
      children: [
        { style: { height: 50 } },
        {
          style: {
            display: 'grid',
            flexGrow: 1,
            gridTemplateColumns: ['1fr', '2fr'],
            gridTemplateRows: ['1fr', '1fr'],
            gap: 8,
          },
          children: [
            { style: { gridRowStart: 1, gridRowEnd: 3 } },
            { style: {} },
            { style: {} },
          ],
        },
        { style: { height: 40 } },
      ],
    },
    cssEquivalent: `<!-- page.html -->
<div class="page">
  <header></header>
  <div class="grid-body">
    <div class="sidebar"></div>
    <div class="content"></div>
    <div class="widget"></div>
  </div>
  <footer></footer>
</div>

/* page.css */
.page {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 500px;
  height: 400px;
}
header { height: 50px; }
.grid-body {
  display: grid;
  flex-grow: 1;
  grid-template-columns: 1fr 2fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
}
.sidebar { grid-row: 1 / 3; }
footer { height: 40px; }

/* Yoga: can't nest grid inside flex. */`,
  },
  {
    name: 'Absolute Overlay',
    description: 'Absolute positioned overlays — tooltips, modals, badges. Pure coordinates.',
    node: {
      style: {
        width: 400,
        height: 300,
        padding: 20,
      },
      children: [
        { style: { flexGrow: 1 } },
        {
          style: {
            position: 'absolute',
            width: 100,
            height: 60,
            top: 20,
            right: 20,
          },
        },
        {
          style: {
            position: 'absolute',
            width: 80,
            height: 80,
            bottom: 20,
            left: 20,
          },
        },
      ],
    },
    cssEquivalent: `<!-- overlay.html -->
<div class="container">
  <div class="background"></div>
  <div class="tooltip"></div>
  <div class="badge"></div>
</div>

/* overlay.css */
.container {
  position: relative;
  width: 400px;
  height: 300px;
  padding: 20px;
}
.background { flex-grow: 1; }
.tooltip {
  position: absolute;
  width: 100px;
  height: 60px;
  top: 20px;
  right: 20px;
}
.badge {
  position: absolute;
  width: 80px;
  height: 80px;
  bottom: 20px;
  left: 20px;
}`,
  },
];
