import { MongoClient } from 'https://deno.land/x/mongo@v0.31.1/mod.ts';

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    const client = new MongoClient();
    await client.connect(Deno.env.get('MONGODB_URI'));
    
    const dbName = new URL(Deno.env.get('MONGODB_URI')).pathname.substring(1);
    const db = client.database(dbName);

    console.log("Successfully connected to MongoDB Atlas");

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw new Error('Unable to connect to MongoDB Atlas');
  }
}

export async function findUser(db, email) {
  try {
    return await db.collection('users').findOne({ 
      email: email.toLowerCase() 
    });
  } catch (error) {
    console.error('Find user error:', error);
    throw error;
  }
}

export async function createUser(db, userData) {
  try {
    const result = await db.collection('users').insertOne({
      ...userData,
      email: userData.email.toLowerCase(),
      createdAt: new Date()
    });
    return result.id;
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}

export async function saveChatMessage(db, message) {
  try {
    return await db.collection('chatHistory').insertOne({
      ...message,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Save chat message error:', error);
    throw error;
  }
}

export async function getChatHistory(db, userId) {
  try {
    return await db.collection('chatHistory')
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
  } catch (error) {
    console.error('Get chat history error:', error);
    throw error;
  }
}

export async function setupIndexes(db) {
  try {
    // 用户集合索引
    await db.collection('users').createIndex(
      { email: 1 }, 
      { unique: true }
    );

    // 聊天历史集合索引
    await db.collection('chatHistory').createIndex(
      { userId: 1, timestamp: -1 }
    );

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Setup indexes error:', error);
    throw error;
  }
} 