import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { LiveChat } from './components/LiveChat';
import { WhyItMatters } from './components/WhyItMatters';
import { Playground } from './components/Playground';
import { Comparison } from './components/Comparison';
import { Features } from './components/Features';
import { Performance } from './components/Performance';
import { GetStarted } from './components/GetStarted';
import { Footer } from './components/Footer';

export function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Hero />
      <LiveChat />
      <div id="why">
        <WhyItMatters />
      </div>
      <Playground />
      <Comparison />
      <div id="features">
        <Features />
      </div>
      <div id="performance">
        <Performance />
      </div>
      <div id="get-started">
        <GetStarted />
      </div>
      <Footer />
    </div>
  );
}
