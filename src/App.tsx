// src/App.jsx
import { Routes, Route } from 'react-router-dom';

import Footer from './components/Footer';
import Navbar from './components/Navbar';
import routes from './routes';

export default function App() {
  return (
    <div className="grid grid-rows-[0fr_1fr_0fr] h-screen sm:w-md md:w-lg lg:w-xl xl:w-2xl mx-auto">
      <Navbar />
      <article>
        <Routes>
          {routes.map((route, i) =>
            <Route key={i} path={route.link} element={route.component} />
          )}
        </Routes>
      </article>
      <Footer />
    </div>
  );
}
