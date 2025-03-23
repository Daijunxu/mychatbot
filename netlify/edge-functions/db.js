import { MongoClient } from "https://deno.land/x/mongo@v0.31.2/mod.ts";

let cachedDb = null;
let client = null;

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

    // 创建新的客户端实例
    client = new MongoClient();

    // 基本连接，不使用任何额外选项
    await client.connect({
      db: "mychatbot",     // 直接指定数据库名
      tls: true,           // 启用 TLS
      servers: [{
        host: "cluster0.frwzn.mongodb.net",
        port: 27017
      }],
      credential: {
        username: "netlifyuser",  // 使用新创建的用户名
        password: Deno.env.get('MONGODB_PASSWORD'),  // 从环境变量获取密码
        db: "mychatbot",
        mechanism: "SCRAM-SHA-1"
      }
    });

    console.log('Connected to MongoDB');

    const db = client.database("mychatbot");
    cachedDb = db;

    // 测试连接
    const collections = await db.listCollections();
    console.log('Available collections:', collections);

    return { db };
  } catch (error) {
    console.error('Database connection error:', {
      name: error.name,
      message: error.message,
      cause: error.cause
    });
    throw error;
  }
}

// 添加关闭连接的函数
export async function closeConnection() {
  if (client) {
    await client.close();
    client = null;
    cachedDb = null;
    console.log('Database connection closed');
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