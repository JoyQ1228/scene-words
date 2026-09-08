# Scene Words 实现计划

目标：按素材目录中的既定 PRD，交付 Windows 本地双语搜索和带外部字幕的真实片段播放。

架构：React/Vite 构建静态页面，FastAPI 同源提供页面、搜索和 MP4。仅监听 127.0.0.1。ASS 是唯一字幕真源；保留所有有效双语对白，包括短于 0.55 秒的台词。切片按原始 start/end，采用输入精确寻址，滤镜恢复原始时间后烧录完整 ASS，再将输出时间归零。视频按需生成并缓存；同一片段加锁、最多两个同时转码、临时文件成功后原子替换。

文件职责：backend/subtitles.py 解析与搜索；backend/clips.py 转码与缓存；backend/app.py HTTP 与静态资源；frontend/src/App.jsx 页面状态；frontend/src/style.css 视觉样式；tests/test_core.py 字幕和接口验收；scripts/verify_media.py 实际切片验证；start.ps1 本机启动；README.md 使用说明。

- [x] 先运行 tests/test_core.py，确认缺少实现导致失败；覆盖中文、大小写、逗号、ASS 标签、短台词及无结果。
- [x] 实现解析，输出 data/subtitles.json；运行 pytest tests -q，检查全部通过。
- [x] 实现准确切片和 FastAPI；验证空查询、分页、非法 ID、MP4 范围请求。
- [x] 实现浅灰单列卡片、大搜索框、关键词高亮、加载/空/错误状态、原地播放器和 Replay；npm run build。
- [x] 生成开头、中段、后段至少三个真实片段，ffprobe 检查 H.264/AAC、时长误差小于 0.15 秒，抽帧查看中文与英文烧录。
- [x] 浏览器验证至少三个搜索案例、播放和 Replay，交付启动脚本和 README。

