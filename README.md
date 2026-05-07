# YouTube 历史时政脚本工具

这是一个 AI 辅助创作工具，用来把你手动输入的热点事件，转化成面向北美观众的历史时政 YouTube 长视频选题方案和脚本。

## 当前 MVP

手动输入热点事件 -> 生成选题方向 -> 选择一个方向 -> 生成视频方案 -> 生成英文/中文脚本 -> 生成制作包。

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

- MiniMax：推荐 `MiniMax-M2.7`、`MiniMax-M2.7-highspeed`、`MiniMax-M2.5`
- OpenAI：推荐 `gpt-5-mini`、`gpt-5`

如果使用 MiniMax，工具会自动分段生成并拼接结果，减少长脚本被截断的概率。

## 这个工具会生成什么

现在采用分阶段工作流：

1. 阶段一：选题雷达
   - 事件简报
   - 6 个选题方向
   - 选题评分
   - 推荐优先级

2. 阶段二：视频方案
   - 核心论点
   - YouTube 标题、Hook、缩略图文字
   - 历史案例
   - 中国历史/文化视角
   - 长视频大纲
   - 类比边界

3. 阶段三：脚本
   - 英文正式脚本草稿
   - 中文审稿版
   - 录制前修改建议

4. 阶段四：制作包
   - 分段剪辑表
   - B-roll 搜索关键词
   - 素材清单
   - Shorts 切片
   - 发布包
   - 最终核查清单

这个设计避免了“还没选题就直接写脚本”的工作流冲突。

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

- 保存每一次生成记录。
- 把输出拆成更清晰的标签页。
- 增加资料来源和事实核查工作流。
- 增加缩略图提示词。
- 增加 Shorts 批量生成。
