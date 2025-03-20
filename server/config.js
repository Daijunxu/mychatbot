export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority'
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID
  },
  email: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_APP_PASSWORD
  },
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173'
  }
}; 