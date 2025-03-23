import { MongoClient } from "https://deno.land/x/mongo@v0.29.4/mod.ts";

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
    
    // 解析 URI 并打印部分信息（不包含敏感信息）
    const parsedUri = new URL(uri);
    console.log('Connection info:', {
      protocol: parsedUri.protocol,
      hostname: parsedUri.hostname,
      database: parsedUri.pathname.substr(1),
      username: parsedUri.username
    });
    
    // 创建客户端
    const client = new MongoClient();
    
    // 添加连接选项
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      tls: true,
      tlsAllowInvalidCertificates: false,
    };
    
    console.log('Connecting with options:', options);
    
    // 连接到数据库
    await client.connect(uri);
    
    console.log('Connected to database, getting instance...');
    
    // 获取数据库实例
    const dbName = parsedUri.pathname.substring(1);
    const db = client.database(dbName);
    
    // 测试连接
    console.log('Testing connection...');
    const collections = await db.listCollections();
    console.log('Available collections:', collections);
    
    cachedDb = db;
    console.log('Connection successful and cached');
    
    return { db };
  } catch (error) {
    // 详细的错误日志
    console.error('Database connection error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      // 尝试解析嵌套的错误信息
      details: error.message.includes('{') 
        ? JSON.parse(error.message.substring(error.message.indexOf('{')))
        : null
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