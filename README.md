# YouTube 历史频道 Brief 工具

这是一个 AI 辅助创作工具，用来把热点事件或每周选题雷达里的候选新闻，转化成面向北美观众的历史时政 YouTube 长视频脚本 Brief。

## 当前 MVP

当前版本不追求一口气生成完整视频，而是专注做好正式写作前的创意开发：

```text
每周雷达报告或手动输入热点 -> 生成创作角度评估 -> 选择一个角度 -> 生成 Codex 脚本 Brief
```

正式英文脚本和中文审稿版交给 Codex 的 `youtube-history-scriptwriter` skill 精写。

## 如何启动

最简单的方式：

1. 打开桌面上的项目文件夹。
2. 双击 `Start App.command`。
3. 在浏览器里打开这个地址：

```text
http://localhost:5123
```

手动方式：

1. 打开 Terminal。
2. 进入项目文件夹：

```bash
cd ~/Desktop/youtube-history-script-tool
```

3. 启动应用：

```bash
npm start
```

4. 在浏览器里打开：

```text
http://localhost:5123
```

5. 在页面左下角的「设置」里选择模型供应商，粘贴对应 API Key，然后点击「保存设置」。

也可以根据 `.env.example` 创建本地 `.env` 文件，但第一版建议直接用页面里的设置框。

## 支持的模型供应商

目前支持：

- DeepSeek：推荐 `deepseek-v4-flash` 或 `deepseek-v4-pro`
- MiniMax：推荐 `MiniMax-M2.7`、`MiniMax-M2.7-highspeed`、`MiniMax-M2.5`
- OpenAI：推荐 `gpt-5-mini`、`gpt-5`

如果使用 MiniMax，工具会自动分段生成并拼接结果，减少长脚本被截断的概率。

## 这个工具会生成什么

现在采用简化后的 Brief 工作流：

1. 每周雷达报告
   - 龙虾生成的 Markdown 报告放在 `radar/` 文件夹
   - 页面可以读取报告列表并打开查看
   - 创作者从报告里挑一个候选题，再复制到热点输入框

2. 阶段一：创作角度评估
   - 事件简报
   - 3-5 个可选创作角度
   - 角度评分
   - 推荐优先级

3. 阶段二：Codex 脚本 Brief
   - 给 Codex 的写作任务
   - 核心创作判断
   - 英文标题、缩略图文字、Hook
   - 6-8 段脚本结构 Brief
   - 历史案例与中国视角说明
   - 类比边界
   - 事实核查清单
   - 可直接复制给 Codex 的最终写作指令

这个设计避免了“文案未定就生成视频方案”和“工具输出半成品脚本导致正式脚本质量不稳定”的问题。

## 项目记忆

产品规划文档放在 `docs/` 里。

以后继续项目时，先读这些文件：

- `docs/README.md`
- `docs/product-brief.md`
- `docs/mvp-requirements.md`
- `docs/content-framework.md`
- `docs/roadmap.md`
- `docs/decision-log.md`

## 下一步建设方向

接下来可以继续完善：

- 让龙虾把每周 Markdown 报告自动保存到 `radar/` 文件夹。
- 自动解析 radar 报告里的 Top 10 候选题，点击即可带入输入框。
- 保存每一次 Brief 生成记录。
- 把输出拆成更清晰的标签页。
- 增加资料来源和事实核查工作流。
- 正式脚本确认后，再单独建设制作辅助模块：分镜、图片提示词、Ken Burns 镜头表、素材清单。
