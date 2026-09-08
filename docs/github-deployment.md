# GitHub Pages 上线

现有本地 API 模式保留。线上使用 `VITE_DATA_MODE=static`，在浏览器搜索 `subtitles.json`，通过对象存储播放预生成的视频，不需要 Python 服务器。

## 1. 导出视频

在项目目录运行 `.venv\Scripts\python.exe scripts\export_static.py`。
输出：`frontend/public/subtitles.json`、`release/media/<id>.mp4` 和 `<id>.jpg`。
进度记录在 `release/export-status.json`。完成要求 completed=1637、failed=[]、full_catalog=true。
中断后重跑会复用生成成功的缓存；不要把 `release`、原视频或密钥提交 Git。

## 2. 配置视频存储

注册并登录 Cloudflare，进入 R2，按页面说明完成开通。涉及服务条款或付款信息的步骤由账号所有者操作。
创建专用存储桶 `scene-words-media`，将 `release/media` 中所有文件上传到桶的 `flipped-v1/` 目录。
为公开访问配置专用域名和 HTTPS。R2 提供的 r2.dev 公共地址仅适合开发测试；正式发布使用自定义域名。
最终视频地址应类似 `https://media.your-domain.com/flipped-v1/1.mp4`，预览图为同目录 `1.jpg`。
保持正确 Content-Type：MP4 为 video/mp4，JPG 为 image/jpeg。验证视频支持 Range 请求。
不要把管理 API 密钥填写到前端或 GitHub 的 MEDIA_BASE_URL；该变量只填公开视频目录 URL。

如果使用其他对象存储，同样提供公开 HTTPS 目录即可，无需改动 UI。

## 3. GitHub 仓库

GitHub Free 的 Pages 使用公开仓库；私有仓库发布 Pages 需要支持该功能的套餐。也可保持私有仓库，改用其他静态托管服务。
在 GitHub 创建 `scene-words` 仓库，不额外生成 README，然后按仓库显示的地址添加 origin 并推送 main。

```powershell
git remote add origin https://github.com/YOUR_USERNAME/scene-words.git
git push -u origin main
```

推送时通过 GitHub 的正常登录流程认证，不把密码或 Token 放进命令、源代码或聊天。

## 4. 启用发布

- Settings → Pages → Build and deployment → Source 选择 GitHub Actions。
- Settings → Secrets and variables → Actions → Variables 添加 `MEDIA_BASE_URL`，值为上面公开视频目录（包含 `flipped-v1`）。
- Actions → Publish GitHub Pages → Run workflow，或向 main 推送更新。
- 发布成功后，访问 workflow environment 中显示的 page_url。

资源使用相对路径，兼容 `https://用户名.github.io/scene-words/`。
工作流会检查 HTTPS 视频目录配置、运行搜索测试、构建并发布。媒体上传需先完成，部署成功不等同于所有视频已上传。

## 5. 验收

使用海外可访问网络打开正式网址，测试 `hello`、`喜欢`、`beautiful`；确认预览图、播放、Replay、单视频播放及手机布局。
打开开发者工具，确认静态模式不会请求 `/api/health`、`/api/search` 或 `/api/clips`。
检查至少前、中、后各一个 MP4，确认字幕和声音正常。未通过播放检查时不要把仅网页可打开标记为上线完成。

官方说明：https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
