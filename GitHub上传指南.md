# GitHub 上传指南

## 📋 准备工作

### 1. 安装 Git（如果未安装）

- 下载地址：https://git-scm.com/download/win
- 安装后，在命令行输入 `git --version` 验证安装

### 2. 创建 GitHub 账号和仓库

1. 访问 https://github.com
2. 注册/登录账号
3. 点击右上角 "+" → "New repository"
4. 填写仓库信息：
   - Repository name: `本地独立刷题系统` 或 `exam-system`（推荐英文名）
   - Description: `离线刷题与模拟考试系统`
   - 选择 Public（公开）或 Private（私有）
   - **不要**勾选 "Initialize this repository with a README"
5. 点击 "Create repository"

## 🚀 上传步骤

### 步骤 1：初始化 Git 仓库

在项目根目录打开 PowerShell 或命令提示符，执行：

```powershell
cd "D:\代码\刷题系统"
git init
```

### 步骤 2：配置 Git 用户信息（首次使用需要）

```powershell
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的邮箱@example.com"
```

### 步骤 3：添加文件到暂存区

```powershell
git add .
```

### 步骤 4：提交文件

```powershell
git commit -m "Initial commit: 本地独立刷题系统"
```

### 步骤 5：连接远程仓库

将 `YOUR_USERNAME` 和 `YOUR_REPO_NAME` 替换为你的实际信息：

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

例如：
```powershell
git remote add origin https://github.com/yangyutong/exam-system.git
```

### 步骤 6：推送到 GitHub

```powershell
git branch -M main
git push -u origin main
```

如果提示输入用户名和密码：
- 用户名：你的 GitHub 用户名
- 密码：使用 Personal Access Token（不是 GitHub 密码）

### 步骤 7：创建 Personal Access Token（如果需要）

如果使用 HTTPS 推送，需要创建 Token：

1. 登录 GitHub
2. 点击右上角头像 → Settings
3. 左侧菜单选择 "Developer settings"
4. 选择 "Personal access tokens" → "Tokens (classic)"
5. 点击 "Generate new token" → "Generate new token (classic)"
6. 填写信息：
   - Note: `Git Push Token`
   - Expiration: 选择过期时间
   - 勾选 `repo` 权限
7. 点击 "Generate token"
8. **复制生成的 Token**（只显示一次）
9. 推送时，密码处输入这个 Token

## 🔄 后续更新

如果修改了代码，需要更新到 GitHub：

```powershell
# 1. 查看修改的文件
git status

# 2. 添加修改的文件
git add .

# 3. 提交修改
git commit -m "更新说明：描述你的修改内容"

# 4. 推送到 GitHub
git push
```

## 📝 常用 Git 命令

```powershell
# 查看状态
git status

# 查看提交历史
git log

# 查看远程仓库
git remote -v

# 拉取远程更新
git pull

# 查看差异
git diff
```

## ⚠️ 注意事项

1. **不要上传敏感信息**：确保 `.gitignore` 文件正确配置
2. **大文件问题**：GitHub 单个文件限制 100MB，仓库总大小建议不超过 1GB
3. **示例题库**：如果 `示例题库.xlsx` 文件较大，可以考虑不上传（已在 `.gitignore` 中注释）
4. **依赖文件**：`libs/` 目录中的文件需要上传，确保离线运行

## 🎯 快速命令集合

```powershell
# 完整的上传流程（首次）
cd "D:\代码\刷题系统"
git init
git add .
git commit -m "Initial commit: 本地独立刷题系统"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## 🔍 故障排查

**问题：推送时提示认证失败**
- 检查用户名和 Token 是否正确
- 确认 Token 有 `repo` 权限
- 尝试使用 SSH 方式（需要配置 SSH key）

**问题：提示文件过大**
- 检查是否有大文件（>100MB）
- 使用 `git-lfs` 处理大文件
- 或从 `.gitignore` 中排除大文件

**问题：推送被拒绝**
- 先执行 `git pull` 拉取远程更新
- 解决冲突后再推送

---

**提示**：如果遇到问题，可以查看 GitHub 官方文档或使用 GitHub Desktop 图形化工具。

