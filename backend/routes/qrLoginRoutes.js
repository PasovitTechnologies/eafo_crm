const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';

// Example users stored in memory (in a real app, use a database)
const users = [
  {
    _id: '1',
    email: 'sasinarayanan2003@gmail.com',
    role: 'admin',
    password: bcrypt.hashSync('Sasikumar@2003', 10), // Example hashed password
  },
  {
    _id: '2',
    email: 'test@gmail.com',
    role: 'user',
    password: bcrypt.hashSync('Test@1234', 10),
  },
  {
    _id: '3',
    email: 'user@example.com',
    role: 'user',
    password: bcrypt.hashSync('User@1234', 10),
  },
];

// POST route to handle login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Generate JWT
  const token = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '4h' }
  );

  // Respond with token
  res.status(200).json({
    message: 'Login successful',
    success: true,
    token,
    user: {
      _id: user._id,
      email: user.email,
      role: user.role,
    }
  });
});

module.exports = router;
