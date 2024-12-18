import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { GITFLOW_CONFIG } from '../../config/gitflowConfig.js';
import { GitflowService } from '../../services/gitflowService.js';
import { isMergeWorkBranchArgs } from '../../types/gitflow.js';
import { ToolHandler } from '../../types/handlers.js';

export function createMergeBranchHandler(gitflowService: GitflowService): ToolHandler {
  return {
    name: "merge_branch",
    description: "Gitflowに基づいてブランチをマージします",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: Object.keys(GITFLOW_CONFIG.workBranches),
          description: "ブランチの種類"
        },
        name: {
          type: "string",
          description: "ブランチ名（プレフィックスを除く）"
        }
      },
      required: ["type", "name"]
    },
    handler: async (args) => {
      if (!isMergeWorkBranchArgs(args)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Invalid arguments: type and name are required"
        );
      }

      try {
        const results = await gitflowService.mergeWorkBranch(args.type, args.name);
        return {
          content: [{
            type: "text",
            text: results.join('\n')
          }]
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to merge branch: ${error}`
        );
      }
    }
  };
}