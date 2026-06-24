const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const staffRoutes = require('./routes/staff');
const analyticsRoutes = require('./routes/analytics');
const duplicateRoutes = require('./routes/duplicateRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/duplicates', duplicateRoutes);
const shiftReportRoutes = require('./routes/shiftReportRoutes');
app.use('/api/shift-reports', shiftReportRoutes);
const nightWardenRoutes = require('./routes/nightWardenRoutes');
app.use('/api/night-complaints', nightWardenRoutes);

// Test route
app.get('/', (req, res) => res.json({ message: 'Hostel Complaint System API running' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    require('./utils/cronJobs');
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => console.log('MongoDB connection error:', err));