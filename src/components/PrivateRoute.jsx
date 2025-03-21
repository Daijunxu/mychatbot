import { Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout.jsx';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

export default PrivateRoute; 