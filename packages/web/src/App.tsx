import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Browse from './pages/Browse';
import GeneDetail from './pages/GeneDetail';
import Home from './pages/Home';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="browse" element={<Browse />} />
          <Route path="genes/:slug" element={<GeneDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
