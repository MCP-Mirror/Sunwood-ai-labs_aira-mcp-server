interface BranchConfig {
  prefix: string;
  base: string;
  description: string;
  mergeTo: string[];
  deleteAfterMerge: boolean;
}

export const GITFLOW_CONFIG = {
  // メインブランチの設定
  branches: {
    main: {
      name: "main",
      description: "製品リリース用のブランチ。本番環境にデプロイするコードを管理します。"
    },
    develop: {
      name: "develop",
      description: "開発用のブランチ。次回リリースに向けた開発を行います。"
    }
  },
  // 作業ブランチの設定
  workBranches: {
    feature: {
      prefix: "feature/",
      base: "develop",
      description: "新機能開発用のブランチ。developから分岐し、developにマージされます。",
      mergeTo: ["develop"],
      deleteAfterMerge: true
    },
    release: {
      prefix: "release/",
      base: "develop",
      description: "リリース準備用のブランチ。developから分岐し、mainとdevelopにマージされます。",
      mergeTo: ["main", "develop"],
      deleteAfterMerge: true
    },
    hotfix: {
      prefix: "hotfix/",
      base: "main",
      description: "緊急バグ修正用のブランチ。mainから分岐し、mainとdevelopにマージされます。",
      mergeTo: ["main", "develop"],
      deleteAfterMerge: true
    },
    custom: {  // 追加：任意のブランチ用の設定
      prefix: "",
      base: "develop",
      description: "任意のブランチ。developから分岐します。",
      mergeTo: ["develop"],
      deleteAfterMerge: true
    }
  }
} as const;

export type WorkBranchType = keyof typeof GITFLOW_CONFIG.workBranches;