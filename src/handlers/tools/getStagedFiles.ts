import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { GitService } from '../../services/gitService.js';
import { ToolHandler } from '../../types/handlers.js';

export function createGetStagedFilesHandler(gitService: GitService): ToolHandler {
  return {
    name: "get_staged_files",
    description: "ステージされたファイルの一覧を取得します",
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
        const stagedFiles = await gitService.getStagedFiles(path);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(stagedFiles, null, 2)
          }]
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to get staged files: ${error}`
        );
      }
    }
  };
}
