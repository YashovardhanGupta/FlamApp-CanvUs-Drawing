import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/LandingPage';
import CanvasPage from './pages/CanvasPage';

function App() {
  return (
    <Router>
      
      <Toaster position="top-center" reverseOrder={false} />
      
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/canvas" element={<CanvasPage />} />
      </Routes>
    </Router>
  );
}

export default App;