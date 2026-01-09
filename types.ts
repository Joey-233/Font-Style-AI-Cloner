
export interface StyleTransferParameters {
  referenceImage: string;
  fontTemplate: string;
  targetText: string;
  isHighQuality: boolean;
  selectedRatio: string;
}

export interface GeneratedItem extends StyleTransferParameters {
  id: string;
  imageUrl: string | null;
  status: 'generating' | 'success' | 'error';
  timestamp: number;
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING', // 用于主界面按钮状态
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
