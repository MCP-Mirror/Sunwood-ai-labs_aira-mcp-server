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
          description: "Gitリポジトリの絶対パス"
        }
      },
      required: ["path"]
    },
    handler: async (args) => {
      try {
        if (!args || typeof args !== 'object' || !('path' in args) || typeof args.path !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            "path parameter is required and must be a string"
          );
        }

        const status = await gitService.getStatus(args.path);
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
