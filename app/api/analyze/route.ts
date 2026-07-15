import { NextRequest, NextResponse } from "next/server";

type RawReport = {
  verdict?: string;
  truth_score?: number;
  summary?: string;
  key_points?: string[];
  evidence?: { title?: string; url?: string; note?: string }[];
  uncertainties?: string[];
  recommendation?: string;
};

const models = [
  { id: "moonshotai/Kimi-K2.6", name: "Kimi-K2.6", role: "事实调查员" },
  { id: "MiniMaxAI/MiniMax-M2.7", name: "MiniMax-M2.7", role: "反方审计员" },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const claim = typeof body.claim === "string" ? body.claim.trim().slice(0, 8000) : "";
    const sourceUrl = typeof body.url === "string" ? body.url.trim() : "";
    if (!claim && !sourceUrl) return NextResponse.json({ error: "请提供待核验文本或公开网页链接。" }, { status: 400 });

    const apiKey = process.env.GONKA_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "服务尚未配置 Gonka API Key。" }, { status: 503 });

    let pageText = "";
    if (sourceUrl) pageText = await extractPublicPage(sourceUrl);
    const material = [claim && `用户提供的主张：\n${claim}`, pageText && `公开网页实时提取内容：\n${pageText}`].filter(Boolean).join("\n\n");
    const reports = await Promise.all(models.map((model) => callGonka(apiKey, model, material, sourceUrl)));

    const a = reports[0].truthScore;
    const b = reports[1].truthScore;
    const disagreementPenalty = Math.min(10, Math.abs(a - b) * 0.2);
    const truthScore = Math.max(0, Math.min(100, Math.round((a + b) / 2 - disagreementPenalty)));
    const label = truthScore >= 75 ? "较为可信" : truthScore >= 45 ? "仍然存疑" : "高风险误导";
    const summary = truthScore >= 75
      ? "两个模型总体支持该信息，但仍建议查看下方证据与适用边界。"
      : truthScore >= 45
        ? "两个模型发现证据不足、语境缺失或判断分歧，不建议直接转发。"
        : "两个模型均发现明显事实冲突或误导性表达，建议停止传播并核对权威来源。";
    const recommendation = reports.map((r) => r.recommendation).filter(Boolean)[0] || "在转发前查找权威机构、一手文件或原始研究进行复核。";

    return NextResponse.json({ truthScore, label, summary, recommendation, analyzedAt: new Date().toISOString(), sourceUrl: sourceUrl || undefined, reports });
  } catch (error) {
    const message = error instanceof Error ? error.message : "核验失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function callGonka(apiKey: string, model: typeof models[number], material: string, sourceUrl: string) {
  const roleInstruction = model.role === "事实调查员"
    ? "你是严谨的事实调查员。先拆解可核验主张，再判断证据是否支持，无法确认时必须明确说未知。"
    : "你是独立的反方审计员。主动寻找反例、偷换概念、时间错位、来源缺陷和模型可能误判的地方。";
  const prompt = `${roleInstruction}\n\n请核验以下材料。${sourceUrl ? `材料来自实时抓取的公开链接：${sourceUrl}` : "用户未提供原始链接，请降低来源可靠度，禁止假装已浏览互联网。"}\n\n${material}\n\n只输出一个合法 JSON 对象，不要 Markdown，不要前后解释。字段必须为：\n{"verdict":"不超过18字的结论","truth_score":0到100的整数,"summary":"80字以内摘要","key_points":["2到4条关键判断"],"evidence":[{"title":"证据名称","url":"仅填写你确信存在的公开URL，否则留空","note":"证据与主张的关系"}],"uncertainties":["0到3条不确定性"],"recommendation":"给普通用户的一条具体建议"}\ntruth_score 表示主张为真的可能程度；证据不足时应在 35-65 区间，严禁编造来源。`;

  const response = await fetch("https://api.gonkarouter.io/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: model.id, max_tokens: 2048, temperature: 0.2, messages: [{ role: "user", content: prompt }] }),
  });
  if (!response.ok) throw new Error(`Gonka ${model.name} 暂时不可用（${response.status}）`);
  const data = await response.json();
  const text = Array.isArray(data.content) ? data.content.filter((x: { type?: string }) => x.type === "text").map((x: { text?: string }) => x.text || "").join("") : "";
  const parsed = parseJson(text);
  return normalizeReport(parsed, model, String(data.id || "unavailable"));
}

function parseJson(text: string): RawReport {
  const clean = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(clean); } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("模型返回内容无法解析，请重试。");
    return JSON.parse(match[0]);
  }
}

function normalizeReport(raw: RawReport, model: typeof models[number], requestId: string) {
  const truthScore = Math.max(0, Math.min(100, Math.round(Number(raw.truth_score) || 50)));
  return {
    model: model.name,
    role: model.role,
    requestId,
    verdict: String(raw.verdict || "证据不足"),
    truthScore,
    summary: String(raw.summary || "模型未能形成完整摘要。"),
    keyPoints: Array.isArray(raw.key_points) ? raw.key_points.slice(0, 4).map(String) : [],
    evidence: Array.isArray(raw.evidence) ? raw.evidence.slice(0, 4).map((e) => ({ title: String(e.title || "参考信息"), url: validHttpUrl(e.url) ? e.url : undefined, note: String(e.note || "") })) : [],
    uncertainties: Array.isArray(raw.uncertainties) ? raw.uncertainties.slice(0, 3).map(String) : [],
    recommendation: String(raw.recommendation || "继续查阅权威一手来源。"),
  };
}

async function extractPublicPage(input: string) {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("网页链接格式不正确。"); }
  if (!/^https?:$/.test(url.protocol) || isPrivateHost(url.hostname)) throw new Error("只支持公开的 HTTP 或 HTTPS 网页。");
  const response = await fetch(url, { headers: { "user-agent": "Hululu-TruthLens/1.0 (+public fact-checking demo)" }, redirect: "follow", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`无法读取该网页（${response.status}），可直接粘贴正文进行核验。`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("text/plain")) throw new Error("该链接不是可读取的文本网页，请直接粘贴正文。");
  const html = (await response.text()).slice(0, 350000);
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
  if (text.length < 80) throw new Error("网页正文过少，请直接粘贴需要核验的文字。");
  return text.slice(0, 12000);
}

function isPrivateHost(host: string) {
  const h = host.toLowerCase();
  return h === "localhost" || h === "::1" || h.endsWith(".local") || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
}

function validHttpUrl(value?: string) {
  if (!value) return false;
  try { return /^https?:$/.test(new URL(value).protocol); } catch { return false; }
}
