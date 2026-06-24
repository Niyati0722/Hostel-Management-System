import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/axios';

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'student',
    roomNumber: '', floor: '', managedFloor: ''
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!form.email || !form.password) return toast.error('Email and password required');
    setLoading(true);
    try {
      if (isRegister) {
        await API.post('/auth/register', form);
        toast.success('Registered! Please login.');
        setIsRegister(false);
      } else {
        const { data } = await API.post('/auth/login', { email: form.email, password: form.password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success(`Welcome, ${data.user.name}!`);
        const routes = { student: '/student', floor_warden: '/floor-warden', main_warden: '/main-warden', night_warden: '/night-warden' };
        navigate(routes[data.user.role] || '/login');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>🏠 Hostel System</h1>
        <p className="subtitle">Smart complaint management with priority routing</p>

        <div className="tabs">
          <button className={`tab ${!isRegister ? 'active' : ''}`} onClick={() => setIsRegister(false)}>Login</button>
          <button className={`tab ${isRegister ? 'active' : ''}`} onClick={() => setIsRegister(true)}>Register</button>
        </div>

        {isRegister && (
          <div className="form-group">
            <label>Full Name</label>
            <input name="name" placeholder="Your name" onChange={handleChange} />
          </div>
        )}

        <div className="form-group">
          <label>Email</label>
          <input name="email" type="email" placeholder="you@hostel.com" onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input name="password" type="password" placeholder="Password" onChange={handleChange} />
        </div>

        {isRegister && (
          <>
            <div className="form-group">
              <label>Role</label>
              <select name="role" onChange={handleChange} value={form.role}>
                <option value="student">Student</option>
                <option value="floor_warden">Floor Warden</option>
                <option value="main_warden">Main Warden</option>
                <option value="night_warden">Night Warden</option>
              </select>
            </div>

            {form.role === 'student' && (
              <>
                <div className="form-group">
                  <label>Room Number</label>
                  <input name="roomNumber" placeholder="e.g. 204" onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Floor</label>
                  <input name="floor" type="number" placeholder="e.g. 2" onChange={handleChange} />
                </div>
              </>
            )}

            {form.role === 'floor_warden' && (
              <div className="form-group">
                <label>Manages Floor</label>
                <input name="managedFloor" type="number" placeholder="e.g. 2" onChange={handleChange} />
              </div>
            )}
          </>
        )}

        <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Login'}
        </button>
      </div>
    </div>
  );
}
