// 通用分页响应
export interface PaginatedResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

// 通用成功响应
export interface SuccessResponse {
  success: true;
}

// 通用错误响应
export interface ErrorResponse {
  error: string;
  message?: string;
}

// ─── Auth ────────────────────────────────────────────────────

export interface GetNonceResponse {
  nonce: string;
  message: string;  // 待签名完整消息
}

export interface VerifySignatureRequest {
  address: string;
  nonce: string;
  signature: string;
}

// ─── Content ─────────────────────────────────────────────────

export interface ContentAccessRequest {
  courseId: string;
}

export interface ContentAccessResponse {
  url: string;          // 预签名下载 URL
  expiresIn: number;    // 秒
}

export interface UploadUrlRequest {
  courseId: string;
  filename: string;
  contentType: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  key: string;
}

// ─── AAVE ────────────────────────────────────────────────────

export interface AavePositionRecord {
  id: string;
  userAddress: string;
  asset: string;
  amount: string;
  txHash: string;
  action: 'supply' | 'withdraw';
  createdAt: Date;
}
