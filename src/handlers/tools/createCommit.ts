import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { COMMIT_TYPES } from '../../config/commitTypes.js';
import { GitService } from '../../services/gitService.js';
import { isCreateCommitArgs } from '../../types/git.js';
import { ToolHandler } from '../../types/handlers.js';

export function createCreateCommitHandler(gitService: GitService): ToolHandler {
  return {
    name: "create_commit",
    description: "指定したファイルに対してコミットを作成・実行します。※1度に1ファイルのみコミット可能です",
    inputSchema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          description: "コミット対象のファイルパス（1ファイルのみ指定可能）"
        },
        path: {
          type: "string",
          description: "Gitリポジトリの絶対パス"
        },
        type: {
          type: "string",
          enum: Object.keys(COMMIT_TYPES),
          description: "コミットの種類"
        },
        emoji: {
          type: "string",
          description: "コミットメッセージに使用する絵文字"
        },
        title: {
          type: "string",
          description: "コミットのタイトル"
        },
        body: {
          type: "string",
          description: "コミットの本文（オプション）"
        },
        footer: {
          type: "string",
          description: "コミットのフッター（オプション）"
        },
        language: {
          type: "string",
          enum: ["ja", "en"],
          description: "コミットメッセージの言語（デフォルト: ja）"
        },
        issueNumber: {
          type: "number",
          description: "GitHub Issue番号（オプション）"
        }
      },
      required: ["file", "path", "type", "emoji", "title"]
    },
    handler: async (args) => {
      if (!isCreateCommitArgs(args)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Invalid arguments: file, path, type, emoji, and title are required"
        );
      }

      try {
        const commitMessage = await gitService.createCommit(args);
        return {
          content: [{
            type: "text",
            text: `Successfully committed ${args.file} with message:\n${commitMessage}`
          }]
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to create commit: ${error}`
        );
      }
    }
  };
}
