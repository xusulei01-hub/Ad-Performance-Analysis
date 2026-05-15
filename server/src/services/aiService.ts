import crypto from 'crypto'
import https from 'node:https'

const DEEPSEEK_BASE = 'https://api.deepseek.com'

const httpsAgent = new https.Agent({ rejectUnauthorized: false })

interface DashboardSnapshot {
  daily: {
    date: string
    cost: number
    activations: number
    accounts: number
    roi: number
    ctr: number
    cpa: number
    formalActivations: number
    leads: number
    costChange: number
    activationsChange: number
    accountsChange: number
    roiChange: number
  }
  weekly: {
    startDate: string
    endDate: string
    cost: number
    activations: number
    accounts: number
    roi: number
    ctr: number
    cpa: number
    targetCost: number
    targetActivations: number
    targetAccounts: number
    targetRoi: number
  }
  monthly: {
    month: string
    cost: number
    activations: number
    accounts: number
    roi: number
    ctr: number
    cpa: number
    formalActivations: number
    leads: number
    targetCost: number
    targetActivations: number
    targetAccounts: number
    targetRoi: number
  }
  rankings: {
    costRanking: { channel: string; cost: number }[]
    performanceRanking: { channel: string; roi: number; cpa: number; activations: number }[]
  }
}

const SYSTEM_PROMPT = `你是一位资深的广告投放数据分析师，负责为运营团队提供数据洞察和操作建议。

数据指标说明：
- 花费(cost)：广告投放消耗金额（元）
- 激活(activations)：用户激活数量
- 开户(accounts)：完成开户的用户数
- ROI：投资回报率 = (开户数 × 3100) / 花费
- CTR：点击率 = 点击 / 曝光
- CPA：单次激活成本 = 花费 / 激活
- 转正(formalActivations)：完成转正的用户数
- 留资(leads)：留资用户数
- 渠道：hihonor、oppo、vivo、xiaomi、wangyi 等

分析规则：
1. 环比变化 > 30% 视为异常波动，需重点关注
2. 目标完成度 < 50%（周期已过半）或 < 80%（周期已过 80%）需预警
3. ROI < 1 时渠道处于亏损状态
4. CPA 异常上升意味着获客效率下降
5. CTR 下降可能表示广告素材疲劳

输出格式要求：
- 使用 ## 数据结论 和 ## 投放建议 两个二级标题
- 结论部分用无序列表，每条一个要点，**粗体**标注关键数字
- 建议部分用有序列表，每条建议具体可操作（包含调整方向和数值参考）
- 总字数控制在 300-500 字
- 如果数据正常无明显异常，简洁说明即可`

function fingerprint(data: DashboardSnapshot): string {
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex')
}

const cache = new Map<string, { text: string; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000

async function deepseekChat(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('未配置 DEEPSEEK_API_KEY')

  const body = JSON.stringify({
    model: 'deepseek-v4-flash',
    messages,
    temperature: 0.3,
    max_tokens: 4096,
  })

  return new Promise((resolve, reject) => {
    const req = https.request(
      `${DEEPSEEK_BASE}/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        agent: httpsAgent,
        timeout: 25000,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              reject(new Error(`DeepSeek API 返回错误 ${res.statusCode}: ${data.slice(0, 300)}`))
              return
            }
            const json: any = JSON.parse(data)
            const text = json.choices?.[0]?.message?.content?.trim()
            const finishReason = json.choices?.[0]?.finish_reason
            const usage = json.usage
            console.log('[AI] DeepSeek response finish_reason:', finishReason, 'usage:', JSON.stringify(usage))
            if (!text) {
              reject(new Error('DeepSeek 返回内容为空'))
              return
            }
            if (finishReason === 'length') {
              console.warn('[AI] Warning: response truncated due to max_tokens limit')
            }
            resolve(text)
          } catch (err) {
            reject(err)
          }
        })
      },
    )

    req.on('error', (err) => reject(new Error(`DeepSeek API 请求失败: ${err.message}`)))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('AI 分析超时，请稍后重试'))
    })

    req.write(body)
    req.end()
  })
}

export async function analyzeDashboard(data: DashboardSnapshot): Promise<string> {
  const fp = fingerprint(data)
  const cached = cache.get(fp)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.text
  }

  const text = await deepseekChat([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(data, null, 2) },
  ])

  cache.set(fp, { text, ts: Date.now() })
  return text
}
