import type { ReactNode } from 'react';

import Footer from './components/Footer';
import Navbar from './components/Navbar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-rows-[0fr_1fr_0fr] h-screen sm:w-md md:w-lg lg:w-xl xl:w-2xl mx-auto">
      <Navbar />
      <article>{children}</article>
      <Footer />
    </div>
  );
}
