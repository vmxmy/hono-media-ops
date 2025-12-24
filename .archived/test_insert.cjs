const { exec } = require('child_process');

const data = {
  execution_id: "test-full-insert-003",
  task_id: "b0c7fdc6-c5e4-ccd5-6e85-be6f2b31b1c3",
  n8n_execution_id: "1320",
  started_at: "2025-06-24T10:30:00.000Z",
  completed_at: "2025-06-24T10:31:25.123Z",
  duration_ms: 85123,
  status: "completed",
  input_snapshot: JSON.stringify({
    topic: "婴儿何时开始需要刷牙",
    keywords: "刷牙,婴儿,口腔护理",
    style: "1. 开场白要贴近生活日常\n2. 语言通俗易懂，像在聊天",
    cover_mode: "text2img"
  }),
  cover_url: "https://pub-e40ee7885e944090879dcfb83f871800.r2.dev/covers/b0c7fdc6-c5e4-ccd5-6e85-be6f2b31b1c3.png",
  wechat_media_id: "IzoyVvHEZT8GH3cYLCgKBKJYU0hOZ7TYiSfkWc76Zn2wGwPWMjVAWiJJ8_xmA",
  wechat_draft_id: "IzoyVvHEZT8GH3cYLCgKBMG1p_UNpwJ7u5f2j-1vu12-yQMqfvMBTxNJyA",
  article_html: `<section style="background-color: #FFF5F5; padding: 25px; border-radius: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"><section style="background: linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; text-align: center;"><h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: bold;">👶 宝宝刷牙时间表</h1><p style="margin: 0; font-size: 14px; opacity: 0.9;">婴儿口腔护理全攻略</p></section><section style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);"><p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.8; color: #333;">家里添了小宝贝，每天看着那张可爱的小脸蛋，是不是觉得时间都变慢了？</p><p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.8; color: #333;">喂奶、换尿布、哄睡觉……忙得不可开交的同时，可能很少有人会想到：这么小的宝宝，嘴里连牙都没几颗，需要开始刷牙吗？</p><p style="margin: 0; font-size: 15px; line-height: 1.8; color: #333;">别急，今天咱们就来聊聊这个事儿——婴儿到底什么时候需要开始刷牙，怎么给小家伙护理口腔。</p></section><section style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);"><h2 style="margin: 0 0 16px 0; font-size: 18px; color: #FF6B6B; display: flex; align-items: center;">🦷 长牙前：用纱布给宝宝"洗嘴巴"</h2><p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.8; color: #333;">很多家长觉得，宝宝没长牙就不用管口腔卫生。其实不然，从宝宝出生开始，口腔里就有细菌了。</p></section></section>`,
  metadata: JSON.stringify({
    n8n_execution_id: "1320",
    chapter_count: 5,
    html_length: 6548
  })
};

// Escape single quotes for SQL
const escapeSQL = (str) => str.replace(/'/g, "''");

const sql = `INSERT INTO task_executions (id, task_id, n8n_execution_id, started_at, completed_at, duration_ms, status, input_snapshot, cover_url, wechat_media_id, wechat_draft_id, article_html, metadata) VALUES ('${escapeSQL(data.execution_id)}', '${escapeSQL(data.task_id)}', '${escapeSQL(data.n8n_execution_id)}', '${escapeSQL(data.started_at)}', '${escapeSQL(data.completed_at)}', ${data.duration_ms}, '${escapeSQL(data.status)}', '${escapeSQL(data.input_snapshot)}', '${escapeSQL(data.cover_url)}', '${escapeSQL(data.wechat_media_id)}', '${escapeSQL(data.wechat_draft_id)}', '${escapeSQL(data.article_html)}', '${escapeSQL(data.metadata)}')`;

console.log("SQL Length:", sql.length);
console.log("\nExecuting INSERT...\n");

exec(`npx wrangler d1 execute DB --remote --command "${sql.replace(/"/g, '\\"')}"`, (error, stdout, stderr) => {
  if (error) {
    console.error("Error:", error.message);
    console.error("Stderr:", stderr);
    return;
  }
  console.log("Result:", stdout);
});
