import axios from 'axios';

const API = axios.create({ baseURL: 'https://hosteliq-backend.onrender.com/api' });

// Attach token to every request automatically
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export default API;
