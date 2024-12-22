import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { CreateCommitArgs } from '../../types/git.js';
import { GitCommandExecutor } from './GitCommandExecutor.js';
import { GitStatusManager } from './GitStatusManager.js';

export class GitCommitManager {
  private gitExecutor: GitCommandExecutor;
  private statusManager: GitStatusManager;

  constructor(baseDir: string) {
    this.gitExecutor = new GitCommandExecutor(baseDir);
    this.statusManager = new GitStatusManager(baseDir);
  }

  /**
   * コミットメッセージを生成する
   */
  private generateCommitMessage(args: CreateCommitArgs): string {
    const { type, emoji, title, body, footer, language = 'ja', issueNumber } = args;
    const titleTemplate = `${emoji} [${type}]${issueNumber ? ` #${issueNumber}:` : ':'} ${title}`;
    
    const parts = [titleTemplate];
    if (body) parts.push(body);
    if (footer) parts.push(footer);
    
    return parts.join('\n\n');
  }

  /**
   * コミットを作成する
   */
  async createCommit(args: CreateCommitArgs & { path?: string }): Promise<string> {
    try {
      const targetBranch = args.branch || 'develop';
      const workingDir = args.path || process.cwd();

      // ファイルのステージング状態を確認し、必要に応じてステージング
      if (!(await this.statusManager.isFileStaged(args.file, workingDir))) {
        await this.statusManager.stageFile(args.file, workingDir);
        console.log(`Automatically staged file: ${args.file}`);
      }

      // コミットメッセージの生成とコミット実行
      const commitMessage = this.generateCommitMessage(args);
      await this.gitExecutor.execGitWithError(
        `commit -m "${commitMessage}" -- "${args.file}"`,
        workingDir
      );

      return `[${targetBranch}] ${commitMessage}`;
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create commit: ${error}`
      );
    }
  }
}
