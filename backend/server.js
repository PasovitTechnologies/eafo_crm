require('./routes/paymentStatusCron');

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const { GridFSBucket } = require('mongodb');
const path = require('path');

dotenv.config();
const app = express();

// CORS Configuration
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Role'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "1gb" }));
app.use(express.urlencoded({ limit: "1gb", extended: true }));

// MongoDB Connection Function
const connectMongoDB = async () => {
  try {
    // Removed deprecated options
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const conn = mongoose.connection;

    // Setup GridFS for file uploads
    let gfs, gridFSBucket;

    conn.once('open', () => {
      console.log('GridFS initializing...');

      try {
        // Initialize GridFS
        gfs = Grid(conn.db, mongoose.mongo);
        gfs.collection('uploads');

        gridFSBucket = new GridFSBucket(conn.db, {
          bucketName: 'uploads'
        });

        

        // Attach GridFSBucket to each request
        app.use((req, res, next) => {
          req.gridFSBucket = gridFSBucket;
          req.gfs = gfs;
          next();
        });

      } catch (error) {
        console.error('Error initializing GridFS:', error);
      }
    });

  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);  // Stop the server if DB connection fails
  }
};

// Connect to MongoDB
connectMongoDB();

// Import Routes
const formRoutes = require('./routes/formRoutes');
const courseRoutes = require("./routes/courseRoutes");
const couponRoutes = require('./routes/couponRoutes');
const userRoutes = require('./routes/userRoutes');
const webinarRoutes = require('./routes/webinarRoutes');
const paymentRoutes = require("./routes/paymentRoutes");
const stripeRoutes = require("./routes/stripeRoutes");
const emailRoutes = require("./routes/emailSenderRoutes");
const telegramRoutes = require("./routes/telegramRoutes");
const whatsappRoutes = require("./routes/whatsappRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const notificationRoutes = require("./routes/notificationsRoutes");
const preCourseRoutes = require("./routes/preCourseRoutes");
const groups = require('./routes/groups');
const candidates = require('./routes/candidates');


//qr app
const qrLoginRoutes = require('./routes/qrLoginRoutes');


// Base URL Configuration
const baseUrl = process.env.BASE_URL || 'http://localhost:4000';

// Use Routes
app.use(`/api/invoices`, formRoutes);
app.use(`/api/form`, formRoutes);
app.use(`/api/courses`, courseRoutes);
app.use(`/api/coupons`, couponRoutes);
app.use(`/api/user`, userRoutes);
app.use(`/api/webinars`, webinarRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/stripe", stripeRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/precourse", preCourseRoutes);
app.use('/api/groups', groups);
app.use('/api/candidates', candidates);

//qr app
app.use('/api/qr', qrLoginRoutes);


// Serve Static Files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Root Route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).send('Something went wrong!');
});

//Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
