import type { ReactNode } from 'react';

import Footer from './components/Footer';
import Navbar from './components/Navbar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-rows-[0fr_1fr_0fr] h-screen container mx-auto">
      <Navbar />
      <article className="sm:w-md mx-auto">{children}</article>
      <Footer />
    </div>
  );
}
