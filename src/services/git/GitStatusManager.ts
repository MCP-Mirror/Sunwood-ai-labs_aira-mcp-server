import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { GitStatus, StagedFile } from '../../types/git.js';
import { GitCommandExecutor } from './GitCommandExecutor.js';

export class GitStatusManager {
  private gitExecutor: GitCommandExecutor;

  constructor(baseDir: string) {
    this.gitExecutor = new GitCommandExecutor(baseDir);
  }

  /**
   * Gitのステータス情報をパースする
   */
  private parseGitStatus(statusOutput: string): GitStatus[] {
    return statusOutput.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [index, working] = line.substring(0, 2);
        const path = line.substring(3).replace(/^"(.+)"$/, '$1').replace(/\\?"$/, '');
        const status = index === ' ' ? working : index;

        return {
          path,
          index,
          working,
          status,
          isStaged: index !== ' ' && index !== '?',
          isDeleted: status === 'D'
        };
      });
  }

  /**
   * Gitのステータス情報を取得する
   */
  async getStatus(path?: string): Promise<GitStatus[]> {
    try {
      const output = await this.gitExecutor.execGitWithError(
        'status --porcelain',
        path,
        'ステータス情報の取得に失敗しました'
      );

      return this.parseGitStatus(output);
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get git status: ${error}`
      );
    }
  }

  /**
   * ファイルをステージングエリアに追加する
   */
  async stageFile(file: string, customPath?: string): Promise<void> {
    const workingDir = customPath || process.cwd();
    await this.gitExecutor.execGitWithError(
      `add "${file}"`,
      workingDir,
      `Failed to stage file: ${file}`
    );
  }

  /**
   * ファイルがステージされているか確認する
   */
  async isFileStaged(file: string, workingDir: string): Promise<boolean> {
    const status = await this.gitExecutor.execGitWithError('status --porcelain', workingDir);
    return this.parseGitStatus(status)
      .some(({ path, isStaged }) => path === file && isStaged);
  }
}
