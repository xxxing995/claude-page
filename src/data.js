export const MODELS = [
  { id: 'fable', name: 'Claude Fable 5.2', desc: '更深入，适合复杂的事' },
  { id: 'opus', name: 'Claude Opus 5.5', desc: '细腻周到，适合写作与思考' },
  { id: 'sonnet', name: 'Claude Sonnet 5.5', desc: '日常陪伴，快而稳' },
  { id: 'haiku', name: 'Claude Haiku 5.5', desc: '轻快，适合随手问' },
]

export const INITIAL_CHATS = [
  { id: 'c1', group: '今天', title: '周日的晚餐灵感' },
  { id: 'c2', group: '今天', title: '阳台那盆绿萝' },
  { id: 'c3', group: '昨天', title: '给妈妈的生日小惊喜' },
  { id: 'c4', group: '昨天', title: '周末大扫除清单' },
  { id: 'c5', group: '更早', title: '新家的窗帘颜色' },
  { id: 'c6', group: '更早', title: '睡前小故事' },
]

export const INITIAL_MESSAGES = {
  c1: [
    { id: 1, role: 'user', text: '今天有点累，不太想做饭，有什么简单又暖胃的主意吗？' },
    {
      id: 2,
      role: 'assistant',
      blocks: [
        { type: 'p', text: '辛苦啦，先歇一会儿。天凉的周日，我会推荐一碗番茄鸡蛋面：一口锅，十来分钟就好。' },
        { type: 'p', text: '先把番茄炒出汁，加水煮开，下面条，最后淋上蛋液。冰箱里要是还有一把青菜，一起丢进去就更完整了。' },
        { type: 'p', text: '想的话，我可以帮你排一份这周的轻松晚餐。' },
      ],
    },
    { id: 3, role: 'user', text: '好呀，要那种洗碗也不麻烦的。' },
    {
      id: 4,
      role: 'assistant',
      blocks: [
        { type: 'p', text: '好，按“一口锅，一个碗”的原则来排：' },
        {
          type: 'list',
          rows: [
            ['周一', '番茄鸡蛋面'],
            ['周二', '蘑菇鸡肉粥'],
            ['周三', '南瓜豆腐味噌汤，配米饭'],
            ['周四', '鸡蛋火腿炒饭'],
          ],
        },
        { type: 'p', text: '需要的话，我再把买菜清单整理出来。' },
      ],
    },
  ],
}
