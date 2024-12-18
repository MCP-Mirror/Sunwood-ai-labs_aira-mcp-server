<div align="center">
  <img src="assets/header.svg" alt="Aira MCP Server" width="800" />

  # aira-mcp-server MCP Server

  <a href="README.md"><img src="https://img.shields.io/badge/english-document-white.svg" alt="EN doc"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/ドキュメント-日本語-white.svg" alt="JA doc"/></a>
</div>

Git のステージされたファイルからコミットメッセージを作成するための Model Context Protocol サーバー

これは Git 操作を支援する TypeScript ベースの MCP サーバーです。以下のような機能を提供します：

- Git ステータス情報の取得
- Conventional Commit 形式でのコミットメッセージ作成
- Gitflow の初期化と管理
- ブランチ操作（作成、マージ、一覧表示）

## 🚀 機能

- 📝 Conventional Commit 形式のメッセージ生成
- 🌳 Gitflow ワークフローのサポート
- 🔍 Git ステータスの確認
- 🔄 ブランチ管理

## 🛠️ インストール

```bash
npm install
npm run build
```

## 📖 使用方法

設定ファイルに MCP サーバーを追加してください：

```json
{
  "mcpServers": {
    "aira": {
      "command": "node",
      "args": ["path/to/aira-mcp-server/build/index.js"]
    }
  }
}
```

## 🔧 利用可能なツール

### get_status
Git のステータス情報を取得します。

### create_commit
指定したファイルに対してコミットを作成・実行します。

### init_gitflow
Gitflow の初期化を行います。

### create_branch
新しいブランチを作成します。

### merge_branch
Gitflow に基づいてブランチをマージします。

### list_branches
Gitflow のブランチ一覧を取得します。

## 📄 ライセンス

MIT License
