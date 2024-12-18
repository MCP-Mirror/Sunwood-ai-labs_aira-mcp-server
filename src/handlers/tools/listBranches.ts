import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { GitflowService } from '../../services/gitflowService.js';
import { ToolHandler } from '../../types/handlers.js';

export function createListBranchesHandler(gitflowService: GitflowService): ToolHandler {
  return {
    name: "list_branches",
    description: "Gitflowのブランチ一覧を取得します",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    },
    handler: async () => {
      try {
        const branches = await gitflowService.listBranches();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(branches, null, 2)
          }]
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to list branches: ${error}`
        );
      }
    }
  };
}