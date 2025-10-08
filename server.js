require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dbConnect = require('./config/dbConnect');

const path = require('path');
const router = require('./routes');


const app = express();
app.use(express.urlencoded({ extended: true }));

// ✅ Enable CORS
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://bestitembuy.com',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);


// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware to parse JSON
app.use(express.json());

// Routes
app.use(router);

// Connect to database
dbConnect();

// Home route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Use PORT from .env or default to 3000
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
