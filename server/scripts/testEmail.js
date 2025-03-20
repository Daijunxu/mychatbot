import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { sendWelcomeEmail } from '../services/email.js';

dotenv.config();

async function sendWelcomeEmailsToAllUsers() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 获取所有用户
    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    // 发送邮件计数
    let successCount = 0;
    let failureCount = 0;

    // 为每个用户发送欢迎邮件
    for (const user of users) {
      try {
        console.log(`Sending email to ${user.email}...`);
        await sendWelcomeEmail(user.email, user.name || user.email.split('@')[0]);
        successCount++;
        console.log(`✓ Email sent successfully to ${user.email}`);
      } catch (error) {
        failureCount++;
        console.error(`✗ Failed to send email to ${user.email}:`, error.message);
      }
      // 添加小延迟以避免触发邮件服务限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 打印结果统计
    console.log('\nEmail sending completed:');
    console.log(`✓ Successfully sent: ${successCount}`);
    console.log(`✗ Failed: ${failureCount}`);
    console.log(`Total users: ${users.length}`);

  } catch (error) {
    console.error('Script error:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// 运行脚本
sendWelcomeEmailsToAllUsers(); 