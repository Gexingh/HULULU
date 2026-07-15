# 呼噜噜 TruthLens

> 别急着转发，先让两个 AI 对质。

呼噜噜 TruthLens 是一个基于 Gonka 去中心化推理网络的公共信息核验工具。用户输入网络传言、文本片段或公开网页链接后，系统通过 Gonka Router 分别调用 Kimi-K2.6 与 MiniMax-M2.7，让两个模型以“事实调查员”和“反方审计员”的角色独立分析，最后以透明公式生成 Truth Score，并展示每次推理的 Gonka Request ID。

## 参赛赛道

**Gonka: AI for Society — AI³ Growth Hackathon**

项目关注普通中文用户面对网络传言时的信息判断门槛，希望用低成本、可追溯的多模型核验降低误导信息的传播风险。

## 核心功能

- 支持输入中文文本或公开网页链接
- 通过 Gonka Router 调用两款不同模型进行独立核验
- Kimi-K2.6：提取主张、核查证据、给出初步判断
- MiniMax-M2.7：寻找反例、语境缺失和来源风险
- 使用“双模型均值 − 结论分歧惩罚”生成 0–100 Truth Score
- 展示两次真实 Gonka Request ID、模型结论、证据与不确定性
- 对医疗、法律、金融及公共安全信息提供明确风险提示

## 技术架构

```text
用户文本 / 公开链接
        │
        ├── 网页正文实时提取（可选）
        │
        ├── Gonka Router → Kimi-K2.6 → 事实调查报告 + Request ID
        │
        └── Gonka Router → MiniMax-M2.7 → 反方审计报告 + Request ID
                                 │
                         透明评分公式
                                 │
                    Truth Score + 可追溯报告
```

所有模型推理均通过 `https://api.gonkarouter.io/v1/messages` 完成，未调用其他大模型 API。

## 本地运行

环境要求：Node.js 22.13 或更高版本。

```bash
npm install
```

复制环境变量示例并填入自己的 Gonka Router API Key：

```bash
cp .env.example .env.local
```

```env
GONKA_API_KEY=your_gonka_api_key_here
```

启动开发环境：

```bash
npm run dev
```

打开终端输出的本地网址即可使用。

## 构建

```bash
npm run build
```

## 安全与隐私

- Gonka API Key 只在服务端读取，不会发送到浏览器
- `.env*` 和本地密钥文件均已加入 `.gitignore`
- 当前版本不保存用户输入和核验结果
- 网页提取会拒绝 localhost、局域网地址及非文本资源

## 评分方法

两个模型分别输出主张为真的可能性分数。最终分数为：

```text
Truth Score = round((Kimi 分数 + MiniMax 分数) / 2 − 分歧惩罚)
分歧惩罚 = min(10, |Kimi 分数 − MiniMax 分数| × 0.2)
```

评分仅帮助用户判断是否值得进一步核查，不构成事实裁决或专业建议。

## 后续计划

- 图片与截图 OCR 核验
- 可信来源白名单与来源质量评级
- 更多 Gonka 模型参与交叉验证
- 可分享、可验证的核验报告链接
- 面向浏览器和社交平台的轻量插件

## License

MIT
