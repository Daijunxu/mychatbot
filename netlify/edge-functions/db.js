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
    
    // 解析并打印 URI（确保密码被隐藏）
    const mongoUrl = new URL(uri);
    console.log('Connection details:', {
      protocol: mongoUrl.protocol,
      hostname: mongoUrl.hostname,
      pathname: mongoUrl.pathname,
      username: mongoUrl.username,
      // 不打印密码
      search: mongoUrl.search
    });
    
    const client = new MongoClient();
    
    // 尝试使用不同的连接选项
    const connectOptions = {
      tls: true,
      tlsAllowInvalidCertificates: false,
      retryWrites: true,
      w: 'majority',
      authMechanism: 'SCRAM-SHA-1',
      // 添加超时设置
      connectTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    };

    console.log('Connecting with options:', connectOptions);
    
    await client.connect(uri, connectOptions);
    
    console.log('Client connected, getting database instance...');
    
    const dbName = mongoUrl.pathname.substring(1);
    const db = client.database(dbName);
    
    console.log('Testing connection with simple operation...');
    
    // 执行一个简单的命令来测试连接
    const result = await db.runCommand({ ping: 1 });
    console.log('Connection test result:', result);
    
    cachedDb = db;
    console.log('Database connection cached successfully');
    
    return { db };
  } catch (error) {
    console.error('Detailed MongoDB connection error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      // 添加更多错误属性
      code: error.code,
      codeName: error.codeName,
      errorLabels: error.errorLabels,
    });

    // 尝试解析错误消息中的 JSON
    try {
      if (error.message.includes('{')) {
        const errorJson = JSON.parse(error.message.substring(error.message.indexOf('{')));
        console.error('Parsed error details:', errorJson);
      }
    } catch (e) {
      console.error('Could not parse error JSON:', e);
    }

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