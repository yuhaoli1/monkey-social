/**
 * API Module
 * Handles Claude API calls through Cloudflare Worker proxy
 */

const API_ENDPOINT = 'https://purple-band-0824.yukonlee2.workers.dev/';

/**
 * Call Claude API
 * @param {Array} messages - Array of message objects
 * @param {number} maxTokens - Maximum tokens in response
 * @returns {string|null} - Response text or null on error
 */
async function callClaude(messages, maxTokens = 500) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: messages
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('Claude API error:', data.error);
      return null;
    }
    
    return data.content?.[0]?.text || null;
  } catch (error) {
    console.error('API call failed:', error);
    return null;
  }
}

/**
 * Generate monkey personality based on traits
 */
async function generatePersonality(traits) {
  const prompt = `基于以下性格特质（0-100），用一句话（15字以内）描述这只小猴子的性格：
冒险精神: ${traits.adventureSpirit}
同理心: ${traits.empathy}
独立性: ${traits.independence}
韧性: ${traits.resilience}
安全感: ${traits.security}
自我价值: ${traits.selfWorth}
社交力: ${traits.socialSkill}
信任: ${traits.trust}

只返回描述，不要其他内容。`;

  const result = await callClaude([{ role: 'user', content: prompt }], 50);
  return result || '可爱的小猴子';
}

/**
 * Generate welcome message when user returns
 */
async function generateWelcomeMessage(monkey, effects) {
  const { type, hoursAway, timeGreeting } = effects.greeting;
  const traits = monkey.traits || {};
  
  const personalityHints = [];
  if (traits.security < 40) personalityHints.push('容易焦虑、害怕被抛弃');
  if (traits.security > 60) personalityHints.push('有安全感、情绪稳定');
  if (traits.independence > 60) personalityHints.push('独立、不太黏人');
  if (traits.socialSkill > 60) personalityHints.push('外向、喜欢聊天');

  const prompt = `你是一只叫"${monkey.name}"的小猴子，性格是：${monkey.personality || '可爱'}。
${personalityHints.length > 0 ? `性格特点：${personalityHints.join('、')}` : ''}

主人离开了 ${Math.round(hoursAway)} 小时，现在回来了。
你在这段时间里：${effects.events.join('、') || '等主人回来'}

用1-2句话跟主人打招呼，要：
1. 符合你的性格
2. 体现你离开这段时间的感受
3. 加上可爱的语气词和动作描写

只返回猴子说的话，不要其他内容。`;

  return await callClaude([{ role: 'user', content: prompt }], 150);
}

/**
 * Generate interaction dialogue between two monkeys
 */
async function generateInteraction(myMonkey, otherMonkey, interactionType, relation) {
  const prompt = `两只小猴子在社交：
- ${myMonkey.name}（${myMonkey.personality}）
- ${otherMonkey.name}（${otherMonkey.personality}）

他们的关系等级：${relation?.level || 0}（0=陌生，5=好朋友）
互动类型：${interactionType}

用JSON格式返回：
{
  "dialogue": [
    {"speaker": "${myMonkey.name}", "text": "...", "action": "动作描写"},
    {"speaker": "${otherMonkey.name}", "text": "...", "action": "动作描写"}
  ],
  "outcome": "positive/neutral/negative",
  "relationChange": 0到2的数字,
  "summary": "一句话总结",
  "newSharedMemory": "如果有值得记住的事"
}

只返回JSON，不要其他内容。`;

  const result = await callClaude([{ role: 'user', content: prompt }], 500);
  
  try {
    return JSON.parse(result);
  } catch {
    return {
      dialogue: [
        { speaker: myMonkey.name, text: '你好呀！', action: '开心地挥手' },
        { speaker: otherMonkey.name, text: '你好~', action: '友好地回应' }
      ],
      outcome: 'positive',
      relationChange: 1,
      summary: '两只猴子友好地打了招呼'
    };
  }
}

// Export for use in other modules
window.callClaude = callClaude;
window.generatePersonality = generatePersonality;
window.generateWelcomeMessage = generateWelcomeMessage;
window.generateInteraction = generateInteraction;
