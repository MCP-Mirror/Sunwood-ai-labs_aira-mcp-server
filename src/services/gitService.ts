import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { CreateCommitArgs, StagedFile, GitCommandResult, GitStatus } from '../types/git.js';
import { GITFLOW_CONFIG } from '../config/gitflowConfig.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GitService {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  /**
   * Gitコマンドを実行する共通メソッド
   */
  private async execGit(command: string, customPath?: string): Promise<GitCommandResult> {
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
  private async execGitWithError(command: string, customPath?: string, errorMessage?: string): Promise<string> {
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
   * コミットメッセージを生成する
   */
  generateCommitMessage(args: CreateCommitArgs): string {
    const { type, emoji, title, body, footer, language = 'ja' } = args;
    const titleTemplate = `${emoji} [${type}] ${title}`;
    
    const parts = [titleTemplate];
    if (body) parts.push(body);
    if (footer) parts.push(footer);
    
    return parts.join('\n\n');
  }

  /**
   * ステージされたファイルの一覧を取得する
   */
  async getStagedFiles(path?: string): Promise<StagedFile[]> {
    try {
      const output = await this.execGitWithError(
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
   * リモートブランチの存在を確認する
   */
  private async doesRemoteBranchExist(branch: string, workingDir: string): Promise<boolean> {
    try {
      await this.execGitWithError(`ls-remote --heads origin ${branch}`, workingDir);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * ブランチの存在を確認し、必要に応じて作成する
   */
  private async ensureBranchExists(branch: string, workingDir: string): Promise<void> {
    const branches = await this.execGitWithError('branch', workingDir);
    const remoteBranchExists = await this.doesRemoteBranchExist(branch, workingDir);

    if (!branches.includes(branch)) {
      if (remoteBranchExists) {
        // リモートブランチが存在する場合は、それをチェックアウト
        await this.execGitWithError(`checkout -b ${branch} origin/${branch}`, workingDir);
        console.log(`Checked out existing remote branch: ${branch}`);
      } else {
        // リモートブランチが存在しない場合は、新規作成
        await this.execGitWithError('checkout main', workingDir);
        await this.execGitWithError(`checkout -b ${branch}`, workingDir);
        try {
          await this.execGitWithError(`push -u origin ${branch}`, workingDir);
          console.log(`Created and pushed new branch: ${branch}`);
        } catch (error) {
          // pushに失敗した場合でもローカルブランチは作成
          console.log(`Created local branch: ${branch} (push failed)`);
        }
      }
    } else if (!remoteBranchExists) {
      // ローカルブランチは存在するがリモートブランチが存在しない場合
      try {
        await this.execGitWithError(`push -u origin ${branch}`, workingDir);
        console.log(`Pushed existing local branch: ${branch}`);
      } catch (error) {
        console.log(`Local branch exists: ${branch} (push failed)`);
      }
    }
  }

  /**
   * ファイルをステージングエリアに追加する
   */
  async stageFile(file: string, customPath?: string): Promise<void> {
    const workingDir = customPath || this.baseDir;
    await this.execGitWithError(
      `add "${file}"`,
      workingDir,
      `Failed to stage file: ${file}`
    );
  }

  /**
   * ファイルがステージされているか確認する
   */
  private async isFileStaged(file: string, workingDir: string): Promise<boolean> {
    const status = await this.execGitWithError('status --porcelain', workingDir);
    return this.parseGitStatus(status)
      .some(({ path, isStaged }) => path === file && isStaged);
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
      await this.execGitWithError(`checkout ${targetBranch}`, workingDir);
      try {
        await this.execGitWithError(`pull origin ${targetBranch}`, workingDir);
      } catch (error) {
        console.log(`Warning: Failed to pull from origin/${targetBranch}`);
      }

      // ファイルのステージング状態を確認し、必要に応じてステージング
      if (!(await this.isFileStaged(args.file, workingDir))) {
        await this.stageFile(args.file, workingDir);
        console.log(`Automatically staged file: ${args.file}`);
      }

      // コミットメッセージの生成とコミット実行
      const commitMessage = this.generateCommitMessage(args);
      await this.execGitWithError(
        `commit -m "${commitMessage}" -- "${args.file}"`,
        workingDir
      );

      // リモートにプッシュ
      try {
        await this.execGitWithError(`push origin ${targetBranch}`, workingDir);
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
