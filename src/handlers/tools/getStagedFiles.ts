import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { GitService } from '../../services/gitService.js';
import { ToolHandler } from '../../types/handlers.js';

export function createGetStagedFilesHandler(gitService: GitService): ToolHandler {
  return {
    name: "get_staged_files",
    description: "ステージされたファイルの一覧を取得します",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    },
    handler: async () => {
      try {
        const stagedFiles = await gitService.getStagedFiles();
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