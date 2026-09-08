# Scene Words · 影视双语台词英语学习

按提供的 MVP PRD 实现：中英文包含搜索、大小写归一化、双语高亮、电影时间戳、卡片内真实片段播放和 Replay。首期素材为《怦然心动》，不需要上传、账号或 API Key。

## 启动

双击本目录的 **启动网页.cmd**，保持窗口打开，然后访问 http://127.0.0.1:8765 。关闭服务用 Ctrl+C。前端已构建，正常使用只需启动这一个服务。

首次使用需要 Python 3.11+；启动脚本会在本目录建立 `.venv` 并安装 Python 依赖。如前端构建产物丢失，还需要 Node.js 18+ 和 npm，脚本会自动构建。依赖首次安装需要网络，安装完成后可离线使用。

## 使用

- 输入 `leave me alone`、`喜欢` 或 `beautiful`，回车或点“寻找台词”。
- 搜索结果在桌面端每行展示 3 张视频卡片，较窄屏幕显示 2 列，手机显示 1 列。每张直接显示真实静止预览画面；单击画面后原地播放，首次生成片段通常需要几秒。浏览器若限制播放，点播放器播放按钮。
- 点击 Replay 从头重播；播放另一张卡片会暂停当前片段，所有卡片始终保持展开。预览图按可见区域懒加载，搜索不会自动播放或批量生成完整片段。
- 结果超过 30 条时点击底部继续加载。空查询不返回全片，未找到会显示提示。

## 素材与片段规则

默认读取项目上级目录中的 `flipped.ass` 和 `怦然心动.Flipped.2010.Bluray.1080p.mkv`，不修改源素材。也可用环境变量 `SCENE_WORDS_MEDIA` 指定素材目录。

ASS 是搜索文案、时间轴和视频烧录字幕的唯一来源。复用原 `verify_flipped.py` 的 `{\rEng}` 双语拆分规则，保留有效短台词，略过歌词和非双语标题。索引写入 `data/subtitles.json`，服务每次启动重新解析。

片段严格以每条字幕 start/end 为边界，不固定加前后时间。FFmpeg 输入精确 seek，滤镜先恢复原始时间轴，烧录原 ASS 的副本，再归零，输出 H.264/AAC MP4（1280 宽、原始宽高比）。帧率与音频编码会产生一帧左右的时长量化误差。外层播放器保持 16:9。没有独立字幕偏移；若源 ASS 与影片版本不同步，需要校准源文件。

首次点击按需切片，缓存位于 `data/clips`。同一台词并发请求合并，最多同时转码两个片段，写入成功才发布 MP4。源视频或字幕更新并重启后自动使用新的缓存版本，旧版本可在停止服务后手动删除。

FFmpeg 优先读取 `FFMPEG_PATH`，其次系统 PATH，最后 Windows WinGet 的 Gyan.FFmpeg 安装目录。例如在 PowerShell 中设置 `$env:FFMPEG_PATH = '完整路径\ffmpeg.exe'` 后运行 `./start.ps1`。

## 开发与验证

后端：`.venv\Scripts\python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port 8765 --reload`

前端：`cd frontend`，`npm ci`，`npm run dev`；Vite 将 `/api` 代理到 8765。正式构建：`npm run build`。

测试依赖：`.venv\Scripts\python.exe -m pip install -r requirements-dev.txt`

自动测试：`.venv\Scripts\python.exe -m pytest tests -q`

真实媒体验证：`.venv\Scripts\python.exe scripts\verify_media.py`，生成前、中、后三个片段及 `data/verification/report.json` 与抽帧图。

API：`GET /api/search?q=喜欢&offset=0&limit=30`；`POST /api/clips/{id}` 生成并返回 URL；`GET /api/clips/{id}/video` 支持 Range 播放；`GET /api/health` 返回索引数。

仅绑定本机回环地址。首次片段生成失败时页面可重试，详细错误在服务窗口。项目不含登录、收藏、AI 解释或多电影功能。
