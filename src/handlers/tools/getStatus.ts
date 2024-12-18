import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { GitService } from '../../services/gitService.js';
import { ToolHandler } from '../../types/handlers.js';

export function createGetStatusHandler(gitService: GitService): ToolHandler {
  return {
    name: "get_status",
    description: "Gitのステータス情報を取得します",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Gitリポジトリの絶対パス（指定がない場合は現在のディレクトリ）"
        }
      },
      required: []
    },
    handler: async (args) => {
      try {
        const path = args && typeof args === 'object' && 'path' in args ? args.path as string : undefined;
        const status = await gitService.getStatus(path);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(status, null, 2)
          }]
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to get git status: ${error}`
        );
      }
    }
  };
}
