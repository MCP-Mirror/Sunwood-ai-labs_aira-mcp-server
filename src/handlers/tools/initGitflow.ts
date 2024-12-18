import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { GitflowService } from '../../services/gitflowService.js';
import { ToolHandler } from '../../types/handlers.js';

export function createInitGitflowHandler(gitflowService: GitflowService): ToolHandler {
  return {
    name: "init_gitflow",
    description: "Gitflowの初期化を行います",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    },
    handler: async () => {
      try {
        await gitflowService.initializeGitflow();
        return {
          content: [{
            type: "text",
            text: "Successfully initialized gitflow"
          }]
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to initialize gitflow: ${error}`
        );
      }
    }
  };
}