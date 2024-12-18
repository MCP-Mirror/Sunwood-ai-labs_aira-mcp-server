import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { GitService } from '../../services/gitService.js';
import { ToolHandler } from '../../types/handlers.js';

interface StageFileArgs {
  file: string;
  path?: string;
}

function isStageFileArgs(obj: unknown): obj is StageFileArgs {
  if (typeof obj !== 'object' || obj === null) return false;
  const args = obj as Record<string, unknown>;
  return (
    typeof args.file === 'string' &&
    (args.path === undefined || typeof args.path === 'string')
  );
}

export function createStageFileHandler(gitService: GitService): ToolHandler {
  return {
    name: "stage_file",
    description: "指定したファイルをステージングエリアに追加します",
    inputSchema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          description: "ステージングするファイルのパス"
        },
        path: {
          type: "string",
          description: "Gitリポジトリの絶対パス（指定がない場合は現在のディレクトリ）"
        }
      },
      required: ["file"]
    },
    handler: async (args) => {
      if (!isStageFileArgs(args)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Invalid arguments: file is required"
        );
      }

      try {
        await gitService.stageFile(args.file, args.path);
        return {
          content: [{
            type: "text",
            text: `Successfully staged file: ${args.file}`
          }]
        };
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to stage file: ${error}`
        );
      }
    }
  };
}
