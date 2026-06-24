import { useNavigate } from 'react-router-dom';

export default function Navbar({ title }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="navbar">
      <div>
        <h2>🏠 {title || 'Hostel Complaint System'}</h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span className="user-info">👤 {user.name} · {user.role?.replace('_', ' ')}</span>
        <button className="btn-logout" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}
