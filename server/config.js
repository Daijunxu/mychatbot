const config = {
  mongodb: {
    uri: process.env.MONGODB_URI
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '24h'
  },
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://gilded-cucurucho-a6bf54.netlify.app'
      : 'http://localhost:5173'
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID
  },
  email: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_APP_PASSWORD
  }
};

module.exports = { config }; 