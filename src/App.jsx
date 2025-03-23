import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Chat from './components/Chat';
import PrivateRoute from './components/PrivateRoute.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route 
          path="/chat" 
          element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/chat" replace />} />
      </Routes>
    </Router>
  );
}

export default App; 