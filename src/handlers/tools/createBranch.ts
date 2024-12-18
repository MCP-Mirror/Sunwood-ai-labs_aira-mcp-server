import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { GITFLOW_CONFIG } from '../../config/gitflowConfig.js';
import { GitflowService } from '../../services/gitflowService.js';
import { isCreateWorkBranchArgs } from '../../types/gitflow.js';
import { ToolHandler } from '../../types/handlers.js';

export function createCreateBranchHandler(gitflowService: GitflowService): ToolHandler {
  return {
    name: "create_branch",
    description: "ブランチを作成します。typeがcustomの場合は任意のブランチ名を指定できます",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: Object.keys(GITFLOW_CONFIG.workBranches),
          description: "ブランチの種類（custom: 任意のブランチ名、その他: Gitflowの種類）"
        },
        name: {
          type: "string",
          description: "ブランチ名（typeがcustom以外の場合はプレフィックスを除く）"
        }
      },
      required: ["type", "name"]
    },
    handler: async (args) => {
      if (!isCreateWorkBranchArgs(args)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Invalid arguments: type and name are required"
        );
      }

      try {
        const branchName = await gitflowService.createWorkBranch(args.type, args.name);
        return {
          content: [{
            type: "text",
            text: `Successfully created branch: ${branchName}`
          }]
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to create branch: ${error}`
        );
      }
    }
  };
}