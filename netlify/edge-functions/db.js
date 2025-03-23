import { MongoClient } from "https://deno.land/x/mongo@v0.28.0/mod.ts";

let cachedDb = null;

export async function connectToDatabase() {
  if (cachedDb) {
    console.log('Using cached database connection');
    return { db: cachedDb };
  }

  try {
    const uri = Deno.env.get('MONGODB_URI');
    if (!uri) {
      throw new Error('Please define the MONGODB_URI environment variable');
    }

    console.log('Attempting to connect to MongoDB...');
    
    const client = new MongoClient();
    
    // 使用完整的连接字符串
    await client.connect(uri);
    
    console.log('Connected to MongoDB');
    
    // 从 URI 获取数据库名称
    const dbName = new URL(uri).pathname.substring(1);
    const db = client.database(dbName);
    
    // 简单的连接测试
    console.log('Testing connection...');
    await db.listCollections();
    
    console.log('Connection test successful');
    cachedDb = db;
    
    return { db };
  } catch (error) {
    console.error('Database connection error:', {
      name: error.name,
      message: error.message
    });
    throw error;
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
    return await users.insertOne(userData);
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}

export async function saveChatMessage(db, messageData) {
  try {
    const messages = db.collection('messages');
    return await messages.insertOne(messageData);
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