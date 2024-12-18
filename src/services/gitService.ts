import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { CreateCommitArgs, StagedFile } from '../types/git.js';
import { GITFLOW_CONFIG } from '../config/gitflowConfig.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
export class GitService {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private async execGit(command: string, customPath?: string): Promise<string> {
    try {
      const workingDir = customPath || this.baseDir;
      
      // Gitリポジトリかどうかを確認
      try {
        await execAsync('git rev-parse --git-dir', { cwd: workingDir });
      } catch (error) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `指定されたパス '${workingDir}' はGitリポジトリではありません。`
        );
      }

      const { stdout } = await execAsync(`git ${command}`, { cwd: workingDir });
      return stdout.trim();
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Git command failed: ${error.message}`
      );
    }
  }

  generateCommitMessage(args: CreateCommitArgs): string {
    const { type, emoji, title, body, footer, language } = args;

    const titleTemplate = language === 'en'
      ? `${emoji} [${type}] ${title}`
      : `${emoji} [${type}] ${title}`;

    let message = titleTemplate;
    
    if (body) {
      message += `\n\n${body}`;
    }
    
    if (footer) {
      message += `\n\n${footer}`;
    }

    return message;
  }

  async getStagedFiles(path?: string): Promise<StagedFile[]> {
    try {
      // git statusの出力を取得
      const output = await this.execGit('status --porcelain', path);
      const stagedFiles: StagedFile[] = [];
      
      // 各行を処理
      for (const line of output.split('\n')) {
        if (!line) continue;
        
        // ステータスの最初の2文字を取得
        const [index, working] = line.substring(0, 2);
        // パスからダブルクォートを削除
        const path = line.substring(3).replace(/^"(.+)"$/, '$1').replace(/\\?"$/, '');
        
        // インデックスまたはワーキングツリーの状態を確認
        const status = index === ' ' ? working : index;
        
        // ステージされているファイルのみを処理（'?'以外）
        if (status !== '?' && (index !== ' ' || working !== ' ')) {
          stagedFiles.push({
            path,
            type: status,
            isDeleted: status === 'D'
          });
        }
      }

      return stagedFiles;
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get staged files: ${error}`
      );
    }
  }

  async createCommit(args: CreateCommitArgs & { path?: string }): Promise<string> {
    try {
      const targetBranch = args.branch || GITFLOW_CONFIG.branches.develop.name;
      const workingDir = args.path || process.cwd();
      
      // ブランチの存在確認と作成
      const branches = await this.execGit('branch', workingDir);
      if (!branches.includes(targetBranch)) {
        // mainブランチからdevelopブランチを作成
        await this.execGit('checkout main', workingDir);
        await this.execGit(`checkout -b ${targetBranch}`, workingDir);
        await this.execGit(`push -u origin ${targetBranch}`, workingDir);
        console.log(`Created and pushed branch: ${targetBranch}`);
      }

      // ブランチの切り替えと最新化
      await this.execGit(`checkout ${targetBranch}`, workingDir);
      await this.execGit(`pull origin ${targetBranch}`, workingDir);

      // ステージングされているファイルの確認
      const status = await this.execGit('status --porcelain', workingDir);
      const isFileStaged = status.split('\n').some(line => {
        if (!line) return false;
        const [index] = line.substring(0, 2);
        const path = line.substring(3);
        return path === args.file && index !== ' ' && index !== '?';
      });

      if (!isFileStaged) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `File ${args.file} is not staged. Please stage the file using 'git add' or 'git rm' first.`
        );
      }

      // コミットメッセージの生成とコミット実行
      const commitMessage = this.generateCommitMessage(args);
      await this.execGit(`commit -m "${commitMessage}" -- "${args.file}"`, workingDir);

      // リモートにプッシュ
      await this.execGit(`push origin ${targetBranch}`, workingDir);

      return `[${targetBranch}] ${commitMessage}`;
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create commit: ${error}`
      );
    }
  }
}
