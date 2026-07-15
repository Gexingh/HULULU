# 呼噜噜 TruthLens｜投稿材料

## 一句话介绍

呼噜噜 TruthLens 通过 Gonka Router 调用 Kimi 与 MiniMax 进行双模型交叉核验，为中文网络信息生成带完整 Request ID 的可追溯 Truth Score。

## 项目简介

普通用户每天都会遇到来源不明的网络传言。传统 AI 问答通常只给出一个看似确定的答案，用户既看不到模型之间的分歧，也无法确认推理请求来自哪里。

呼噜噜 TruthLens 将核验过程拆成两个相互独立的角色：Kimi-K2.6 负责事实调查，提取主张并评估支持证据；MiniMax-M2.7 负责反方审计，主动寻找反例、语境缺失和来源风险。两次推理均通过 Gonka Router 完成，页面公开展示模型名称、分析结果与 Gonka Request ID。系统再通过透明公式综合两个模型的分数，并对分歧进行扣分，生成 0–100 Truth Score。

产品当前支持中文文本和公开网页链接，不保存用户输入，面向需要快速判断“是否值得转发”的普通中文用户。

## Sponsor 技术接入

- 推理入口：Gonka Router `POST /v1/messages`
- 模型一：`moonshotai/Kimi-K2.6`
- 模型二：`MiniMaxAI/MiniMax-M2.7`
- 所有 AI 分析均通过 Gonka Router 运行
- 每份模型报告展示 API 返回的真实 `msg_...` Request ID
- 未接入第三方大模型 API

## 核心架构

1. 用户提交文本或公开链接。
2. 服务端校验 URL 并实时提取网页正文。
3. 同一材料并行发送给 Gonka Router 上的 Kimi 与 MiniMax。
4. 两个模型分别返回结构化核验报告和 Request ID。
5. 应用使用确定性公式计算最终 Truth Score。
6. 页面展示结论、证据、不确定性与完整推理轨迹。

## 评分公式

`Truth Score = round((Kimi 分数 + MiniMax 分数) / 2 − min(10, |两模型分差| × 0.2))`

该设计让模型分歧直接降低最终置信度，避免第三个模型随意生成总分。

## 产品亮点

- 双模型对质，而非单模型自说自话
- 显示真实 Gonka Request ID，可追溯每一次推理
- 确定性透明评分，不隐藏模型分歧
- 中文优先、输入门槛低
- 无账号、无数据库、默认不保存用户内容

## 后续计划

- 图片与截图 OCR
- 权威信源白名单与来源质量评级
- 增加更多 Gonka 模型
- 生成可分享的核验报告链接
- 浏览器和社交平台插件

## 投稿链接

- 在线 Demo：https://www.asihg.com/test01/
- GitHub：待创建
- 演示视频：待上传
