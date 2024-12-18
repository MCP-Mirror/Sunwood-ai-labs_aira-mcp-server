import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { CreateCommitArgs } from '../../types/git.js';
import { GITFLOW_CONFIG } from '../../config/gitflowConfig.js';
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
    const { type, emoji, title, body, footer, language = 'ja' } = args;
    const titleTemplate = `${emoji} [${type}] ${title}`;
    
    const parts = [titleTemplate];
    if (body) parts.push(body);
    if (footer) parts.push(footer);
    
    return parts.join('\n\n');
  }

  /**
   * ブランチの存在を確認し、必要に応じて作成する
   */
  private async ensureBranchExists(branch: string, workingDir: string): Promise<void> {
    const branches = await this.gitExecutor.execGitWithError('branch', workingDir);
    const remoteBranchExists = await this.gitExecutor.doesRemoteBranchExist(branch, workingDir);

    if (!branches.includes(branch)) {
      if (remoteBranchExists) {
        // リモートブランチが存在する場合は、それをチェックアウト
        await this.gitExecutor.execGitWithError(`checkout -b ${branch} origin/${branch}`, workingDir);
        console.log(`Checked out existing remote branch: ${branch}`);
      } else {
        // リモートブランチが存在しない場合は、新規作成
        await this.gitExecutor.execGitWithError('checkout main', workingDir);
        await this.gitExecutor.execGitWithError(`checkout -b ${branch}`, workingDir);
        try {
          await this.gitExecutor.execGitWithError(`push -u origin ${branch}`, workingDir);
          console.log(`Created and pushed new branch: ${branch}`);
        } catch (error) {
          // pushに失敗した場合でもローカルブランチは作成
          console.log(`Created local branch: ${branch} (push failed)`);
        }
      }
    } else if (!remoteBranchExists) {
      // ローカルブランチは存在するがリモートブランチが存在しない場合
      try {
        await this.gitExecutor.execGitWithError(`push -u origin ${branch}`, workingDir);
        console.log(`Pushed existing local branch: ${branch}`);
      } catch (error) {
        console.log(`Local branch exists: ${branch} (push failed)`);
      }
    }
  }

  /**
   * コミットを作成する
   */
  async createCommit(args: CreateCommitArgs & { path?: string }): Promise<string> {
    try {
      const targetBranch = args.branch || GITFLOW_CONFIG.branches.develop.name;
      const workingDir = args.path || process.cwd();

      // ブランチの存在確認と作成
      await this.ensureBranchExists(targetBranch, workingDir);

      // ブランチの切り替えと最新化
      await this.gitExecutor.execGitWithError(`checkout ${targetBranch}`, workingDir);
      try {
        await this.gitExecutor.execGitWithError(`pull origin ${targetBranch}`, workingDir);
      } catch (error) {
        console.log(`Warning: Failed to pull from origin/${targetBranch}`);
      }

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

      // リモートにプッシュ
      try {
        await this.gitExecutor.execGitWithError(`push origin ${targetBranch}`, workingDir);
      } catch (error) {
        console.log(`Warning: Failed to push to origin/${targetBranch}`);
      }

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
