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

  private async execGit(command: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`git ${command}`, { cwd: this.baseDir });
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

  async getStagedFiles(): Promise<StagedFile[]> {
    try {
      // git statusの出力を取得
      const output = await this.execGit('status --porcelain');
      const stagedFiles: StagedFile[] = [];
      
      // 各行を処理
      for (const line of output.split('\n')) {
        if (!line) continue;
        
        // ステータスの最初の2文字を取得
        const [index, working] = line.substring(0, 2);
        const path = line.substring(3);
        
        // インデックスがステージされているファイルのみを処理
        if (index !== ' ' && index !== '?' && index !== '?') {
          stagedFiles.push({
            path,
            type: index,
            isDeleted: index === 'D'
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

  async createCommit(args: CreateCommitArgs): Promise<string> {
    try {
      const targetBranch = args.branch || GITFLOW_CONFIG.branches.develop.name;
      
      // ブランチの存在確認
      const branches = await this.execGit('branch');
      if (!branches.includes(targetBranch)) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Branch ${targetBranch} does not exist.`
        );
      }

      // ブランチの切り替えと最新化
      await this.execGit(`checkout ${targetBranch}`);
      await this.execGit(`pull origin ${targetBranch}`);

      // ステージングされているファイルの確認
      const status = await this.execGit('status --porcelain');
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
      await this.execGit(`commit -m "${commitMessage}" -- "${args.file}"`);

      // リモートにプッシュ
      await this.execGit(`push origin ${targetBranch}`);

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
