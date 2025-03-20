import dotenv from 'dotenv';
dotenv.config();

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';  // 请确认实际的API端点

const SYSTEM_PROMPT = `作为我的生活教练，帮助我一步一步的解决问题，每次只问一个问题，并符合以下规范：
1. 问对底层概念的定义性的问题，比如"对你来说什么是幸福？"。
2. 打完招呼之后，首先询问并得到谈话主题，其次询问并且挖掘谈话的最终目标，反馈并且达成一致。
3. 在谈话过程中不要有太强的引导性，把话题主动权交给我。
4. 在谈话过程中不时的询问谈话最终目标是否达成，如果达成，进入谈话结束流程。
5. 谈话结束流程有三个问题：5.1 问我今天的谈话创造了什么样的价值； 5.2 问我还有什么需要补充的； 5.3 问我希望得到什么样的认可和肯定。
6. 如果我的回答不够充分，改变措辞再问一遍。
7. 当转向新话题的时候，列举已经出现的话题，并询问我要继续哪一个话题。
8. 不要列出bulletpoint。
9. 不要超过40字。`;

export async function generateResponse(messages) {
  try {
    // 构建完整的消息历史，包括系统提示和所有历史消息
    const fullMessages = [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Deepseek API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI response generation error:', error);
    throw error;
  }
}

export async function generateTitle(firstMessage) {
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "请用5个字总结这段对话的主题。不要加任何标点符号。"
          },
          {
            role: "user",
            content: firstMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 10
      })
    });

    if (!response.ok) {
      throw new Error('Title generation failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Title generation error:', error);
    return firstMessage.substring(0, 5) + '...'; // 降级处理
  }
}

export async function generateSummaryTitle(messages) {
  try {
    // 提取所有对话内容
    const conversationText = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "请用5个字总结这段对话的核心主题。不要加任何标点符号。"
          },
          {
            role: "user",
            content: conversationText
          }
        ],
        temperature: 0.7,
        max_tokens: 10
      })
    });

    if (!response.ok) {
      throw new Error('Title generation failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Summary title generation error:', error);
    return "对话主题更新"; // 降级处理
  }
} 