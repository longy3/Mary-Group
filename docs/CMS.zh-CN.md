# Mary Group 网页写作后台

本地入口为 http://localhost:4321/admin/ 。上线目标为 https://longy3.github.io/Mary-Group/admin/ 。后台静态页面可以公开加载。Worker 核对 GitHub 数字用户 ID 和目标仓库写权限后，才会把凭证交给指定来源的后台。GitHub 自身的仓库协作者权限独立管理。

## 首次配置

1. 在 Cloudflare Workers 创建名为 mary-group-oauth 的 Worker，记下实际 HTTPS 地址。在 oauth 目录运行 `npx wrangler deploy` 可部署项目内的 Worker。使用独立的 Worker 主机名，关闭 Worker 的请求正文和响应正文采集。
2. 在 GitHub 的 Settings → Developer settings → OAuth Apps 新建 OAuth App。Homepage URL 填写 https://longy3.github.io/Mary-Group/admin/ ，Authorization callback URL 填写实际 Worker 地址加 /callback。
3. 在 oauth 目录分别运行 `npx wrangler secret put CLIENT_ID`、`npx wrangler secret put CLIENT_SECRET` 和 `npx wrangler secret put OWNER_ID`，按交互提示输入值。OWNER_ID 是 longy3 的 GitHub 数字 ID，可用 `gh api users/longy3 --jq .id` 查询。Worker 使用 public_repo 权限，适用于公开仓库。GitHub OAuth App 的该授权范围涵盖登录者有权操作的公开仓库，CMS 的内容目标固定为 longy3/Mary-Group。
4. 核对 oauth/wrangler.toml 的 ALLOWED_ORIGINS，仅列出自己控制的来源。GitHub Pages 同一用户名的所有项目共享一个浏览器 origin，应信任该账号下的其他 Pages 站点。完成本地联调后可移除 localhost。
5. 在 GitHub 仓库 Settings → Secrets and variables → Actions → Variables 添加 PUBLIC_CMS_OAUTH_ORIGIN，值为实际 Worker 的 HTTPS origin。本地联调可在项目根目录被 Git 忽略的 .env.local 设置同名变量，然后重启 pnpm dev。本地真实登录也会修改同一 GitHub 仓库。
6. 仓库 Settings → Pages → Build and deployment 选择 GitHub Actions。由站长审核并推送项目到 main 后，pages.yml 会构建并部署。main 分支需要允许站长通过 GitHub API 提交内容。先确认 Actions 部署成功，再打开线上后台完成真实登录。

## 写作

选择「文章」新建，其他文章子目录各自列为可编辑集合。正文支持富文本、Markdown 源码和编辑预览。图片可在媒体库上传，封面和正文共用 public/uploads。已被文章引用的图片应在移除引用后再从媒体库删除。

开启「草稿」并保存（Decap 按钮可能显示为「发布」）会提交含 draft: true 的 Markdown。正式发布时关闭草稿再保存。撤回已发布文章时重新开启草稿并保存，等待 Actions 新版上线。每次保存提交到 main，无数据库。公开仓库中的草稿源码公开可读，编辑器内预览用于排版，最终页面由 Astro 渲染。更新已有文章直接编辑后保存；在文章操作菜单中删除时，需再次确认。

本地 /admin/?demo=1 提供独立的测试后端，仅用于试用编辑界面。真实写入、图片上传到 GitHub、删除以及自动部署需在以上平台配置完成后用一篇临时文章联验。退出共用设备前使用后台的退出登录。
