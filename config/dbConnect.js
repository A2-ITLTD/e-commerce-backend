const mongoose = require('mongoose');

const dbConnect = async () => {
  try {
    await mongoose.connect(
      'mongodb+srv://A2It-E-commerce:XyHZ0nwXW2t13rOW@cluster0.stqul5u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
    );
    console.log('✅ MongoDB Connected!');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
  }
};

module.exports = dbConnect;
