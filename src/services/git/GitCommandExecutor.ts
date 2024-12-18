import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { GitCommandResult } from '../../types/git.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GitCommandExecutor {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  /**
   * Gitコマンドを実行する共通メソッド
   */
  async execGit(command: string, customPath?: string): Promise<GitCommandResult> {
    const workingDir = customPath || this.baseDir;
    
    try {
      // Gitリポジトリかどうかを確認
      try {
        await execAsync('git rev-parse --git-dir', { cwd: workingDir });
      } catch (error) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `指定されたパス '${workingDir}' はGitリポジトリではありません。`
        );
      }

      const { stdout, stderr } = await execAsync(`git ${command}`, { cwd: workingDir });
      return {
        success: true,
        output: stdout.trim(),
        error: stderr
      };
    } catch (error: any) {
      if (error instanceof McpError) throw error;
      
      return {
        success: false,
        output: '',
        error: error.message
      };
    }
  }

  /**
   * Gitコマンドを実行し、失敗時にMcpErrorをスローする
   */
  async execGitWithError(command: string, customPath?: string, errorMessage?: string): Promise<string> {
    const result = await this.execGit(command, customPath);
    if (!result.success) {
      throw new McpError(
        ErrorCode.InternalError,
        errorMessage || `Git command failed: ${result.error}`
      );
    }
    return result.output;
  }

  /**
   * リモートブランチの存在を確認する
   */
  async doesRemoteBranchExist(branch: string, workingDir: string): Promise<boolean> {
    try {
      await this.execGitWithError(`ls-remote --heads origin ${branch}`, workingDir);
      return true;
    } catch (error) {
      return false;
    }
  }
}
