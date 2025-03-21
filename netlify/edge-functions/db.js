import { MongoClient } from 'https://deno.land/x/mongo@v0.31.1/mod.ts';

let cachedDb = null;

export async function connectToDatabase() {
  if (cachedDb) {
    console.log('Using cached database connection');
    return { db: cachedDb };
  }

  try {
    const uri = Deno.env.get('MONGODB_URI');
    if (!uri) {
      console.error('MONGODB_URI is not defined');
      throw new Error('Please define the MONGODB_URI environment variable');
    }

    console.log('MongoDB URI found, attempting to connect...');
    
    // 解析 URI 来检查格式
    const mongoUrl = new URL(uri);
    console.log('Database name:', mongoUrl.pathname.substring(1));
    
    const client = new MongoClient();
    
    // 添加连接前的日志
    console.log('Initializing MongoDB client...');
    
    // 使用基本连接选项
    await client.connect(uri);
    
    console.log('Client connected, getting database instance...');
    
    const dbName = mongoUrl.pathname.substring(1);
    const db = client.database(dbName);
    
    console.log('Database instance obtained, testing connection...');
    
    // 简单的连接测试
    const collections = await db.listCollections();
    console.log('Connection test successful, available collections:', collections);
    
    cachedDb = db;
    console.log('Database connection cached');
    
    return { db };
  } catch (error) {
    console.error('Detailed MongoDB connection error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw new Error(`Unable to connect to MongoDB Atlas: ${error.message}`);
  }
}

export async function findUser(db, email) {
  try {
    const users = db.collection('users');
    return await users.findOne({ email });
  } catch (error) {
    console.error('Find user error:', error);
    throw error;
  }
}

export async function createUser(db, userData) {
  try {
    const users = db.collection('users');
    const result = await users.insertOne(userData);
    return result;
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}

export async function saveChatMessage(db, messageData) {
  try {
    const messages = db.collection('messages');
    const result = await messages.insertOne(messageData);
    return result;
  } catch (error) {
    console.error('Save message error:', error);
    throw error;
  }
}

export async function getChatHistory(db, userId) {
  try {
    const messages = db.collection('messages');
    return await messages.find({ userId }).sort({ timestamp: -1 }).toArray();
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

// 添加默认导出
export default async function handler(request, context) {
  try {
    const { db } = await connectToDatabase();
    return new Response(JSON.stringify({ status: 'Connected to database' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 