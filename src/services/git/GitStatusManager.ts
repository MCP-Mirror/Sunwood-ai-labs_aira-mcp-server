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
   * ステージされたファイルの一覧を取得する
   */
  async getStagedFiles(path?: string): Promise<StagedFile[]> {
    try {
      const output = await this.gitExecutor.execGitWithError(
        'status --porcelain',
        path,
        'ステージされたファイルの取得に失敗しました'
      );

      return this.parseGitStatus(output)
        .filter(status => status.isStaged)
        .map(({ path, status, isDeleted }) => ({
          path,
          type: status,
          isDeleted
        }));
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get staged files: ${error}`
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
