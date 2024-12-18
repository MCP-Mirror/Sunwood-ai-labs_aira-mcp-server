import { WorkBranchType } from '../config/gitflowConfig.js';

export interface CreateWorkBranchArgs {
  type: WorkBranchType;
  name: string;
}

export function isCreateWorkBranchArgs(obj: unknown): obj is CreateWorkBranchArgs {
  if (typeof obj !== 'object' || obj === null) return false;
  const args = obj as Record<string, unknown>;
  return (
    typeof args.type === 'string' &&
    typeof args.name === 'string' &&
    ['feature', 'release', 'hotfix'].includes(args.type)
  );
}

export interface MergeWorkBranchArgs {
  type: WorkBranchType;
  name: string;
}

export function isMergeWorkBranchArgs(obj: unknown): obj is MergeWorkBranchArgs {
  return isCreateWorkBranchArgs(obj); // 同じ検証ロジックを使用
}