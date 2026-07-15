"use client";

import { FormEvent, useState } from "react";

type Evidence = { title: string; url?: string; note: string };
type ModelReport = {
  model: string;
  role: string;
  requestId: string;
  verdict: string;
  truthScore: number;
  summary: string;
  keyPoints: string[];
  evidence: Evidence[];
  uncertainties: string[];
};
type Analysis = {
  truthScore: number;
  label: string;
  summary: string;
  recommendation: string;
  analyzedAt: string;
  sourceUrl?: string;
  reports: ModelReport[];
};

const examples = [
  "网传：长城是唯一能从月球上用肉眼看到的人造建筑。",
  "网传：只要关闭手机蓝牙，就可以完全阻止应用追踪位置。",
  "网传：人类大脑只使用了自身能力的 10%。",
];

export function TruthLensApp() {
  const [claim, setClaim] = useState("");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!claim.trim() && !url.trim()) {
      setError("请先粘贴一段待核验信息或公开网页链接。");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/test01/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ claim: claim.trim(), url: url.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "核验暂时失败，请稍后重试。");
      setResult(payload);
      setTimeout(() => document.getElementById("report")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "核验暂时失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="呼噜噜 TruthLens 首页">
          <span className="brand-mark">呼</span>
          <span>呼噜噜 <b>TruthLens</b></span>
        </a>
        <div className="top-actions">
          <a href="#how">工作原理</a>
          <div className="network-status"><i /> Gonka Network 在线</div>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span>AI FACT CHECKING · OPEN & TRACEABLE</span></div>
            <h1>让事实，<br /><em>经得起交叉验证。</em></h1>
            <p className="lead">输入一段传言或公开链接。两种独立模型将从正反视角交叉核验，给出清晰结论、证据线索和可追溯的 Truth Score。</p>
            <div className="hero-badges"><span>双模型独立判断</span><span>真实推理凭证</span><span>约 60 秒出结果</span></div>
          </div>
          <div className="signal-card" aria-hidden="true">
            <div className="signal-top"><span>LIVE VERIFICATION</span><b><i /> NETWORK READY</b></div>
            <div className="orbit">
              <div className="orbit-ring ring-one" />
              <div className="orbit-ring ring-two" />
              <div className="core"><span>TRUTH</span><strong>✓</strong><small>LENS</small></div>
              <div className="node node-a"><b>K</b><span>Kimi<br />调查员</span></div>
              <div className="node node-b"><b>M</b><span>MiniMax<br />审计员</span></div>
            </div>
            <div className="signal-foot"><span><b>2</b> models</span><span><b>1</b> verdict</span><span><b>100%</b> traceable</span></div>
          </div>
        </div>

        <form className="checker" onSubmit={submit}>
          <div className="checker-head">
            <span className="step">01</span>
            <div><strong>今天想核验什么？</strong><small>输入新闻、传言、社交媒体内容，或补充一个公开来源</small></div>
          </div>
          <label className="sr-only" htmlFor="claim">待核验文本</label>
          <textarea id="claim" value={claim} onChange={(e) => setClaim(e.target.value)} placeholder="例如：网传某项研究已经证明……" maxLength={8000} />
          <div className="url-row">
            <span aria-hidden="true">↗</span>
            <label className="sr-only" htmlFor="url">来源链接</label>
            <input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="可选：粘贴公开网页来源 https://..." />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="checker-actions">
            <span>不会保存你的输入 · 结果仅供信息参考</span>
            <button disabled={loading} type="submit">
              {loading ? <><i className="spinner" /> 双模型正在交叉核验</> : <>开始核验 <b>→</b></>}
            </button>
          </div>
        </form>

        <div className="examples">
          <span>试试示例</span>
          {examples.map((example, i) => <button key={example} onClick={() => { setClaim(example); setResult(null); }}>{String(i + 1).padStart(2, "0")} {example.slice(3, 24)}…</button>)}
        </div>
      </section>

      <section className="method" id="how">
        <div><span>①</span><strong>Kimi 独立调查</strong><small>提取主张与支持证据</small></div>
        <b>×</b>
        <div><span>②</span><strong>MiniMax 反方审计</strong><small>寻找漏洞与不确定性</small></div>
        <b>=</b>
        <div><span>③</span><strong>透明评分</strong><small>分歧惩罚，拒绝拍脑袋</small></div>
      </section>

      {result && <Report result={result} />}

      <footer>
        <div className="brand footer-brand"><span className="brand-mark">呼</span><span>呼噜噜 <b>TruthLens</b></span></div>
        <p>让每一次 AI 判断都有迹可循。</p>
        <span>Built for AI³ Growth Hackathon · Gonka: AI for Society</span>
      </footer>
    </main>
  );
}

function Report({ result }: { result: Analysis }) {
  const level = result.truthScore >= 75 ? "good" : result.truthScore >= 45 ? "warn" : "bad";
  return (
    <section className="report" id="report">
      <div className="report-kicker"><span>核验报告</span><time>{new Date(result.analyzedAt).toLocaleString("zh-CN")}</time></div>
      <div className="score-card">
        <div className={`score-ring ${level}`} style={{ "--score": `${result.truthScore * 3.6}deg` } as React.CSSProperties}>
          <div><strong>{result.truthScore}</strong><span>/ 100</span></div>
        </div>
        <div className="score-copy"><small>TRUTH SCORE</small><h2>{result.label}</h2><p>{result.summary}</p><div className="formula">综合分 = 双模型均值 − 结论分歧惩罚</div></div>
      </div>

      <div className="model-grid">
        {result.reports.map((report, index) => (
          <article className="model-card" key={report.requestId}>
            <div className="model-head"><span>0{index + 1}</span><div><small>{report.role}</small><h3>{report.model}</h3></div><b>{report.truthScore}</b></div>
            <p className="verdict">{report.verdict}</p>
            <p>{report.summary}</p>
            <h4>关键判断</h4>
            <ul>{report.keyPoints.map((item) => <li key={item}>{item}</li>)}</ul>
            {report.evidence.length > 0 && <><h4>参考证据</h4><div className="evidence-list">{report.evidence.map((item, i) => item.url ? <a key={`${item.title}-${i}`} href={item.url} target="_blank" rel="noreferrer"><strong>{item.title}</strong><span>{item.note}</span></a> : <div key={`${item.title}-${i}`}><strong>{item.title}</strong><span>{item.note}</span></div>)}</div></>}
            {report.uncertainties.length > 0 && <><h4>不确定性</h4><ul className="uncertain">{report.uncertainties.map((item) => <li key={item}>{item}</li>)}</ul></>}
            <div className="request-id"><span><i /> GONKA REQUEST ID</span><code>{report.requestId}</code></div>
          </article>
        ))}
      </div>

      <div className="recommendation"><span>下一步建议</span><p>{result.recommendation}</p></div>
      <p className="disclaimer">AI 核验可能出错。对医疗、法律、金融及公共安全信息，请继续查阅权威一手来源。</p>
    </section>
  );
}
