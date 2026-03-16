'use client';

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiRequestOptions = {
  method?: ApiMethod;
  body?: unknown;
};

export type AuthUser = {
  address: string;
  nickname: string | null;
};

export type MyProfileResponse = AuthUser & {
  avatarUrl?: string | null;
  authoredCoursesCount?: number;
  purchasedCoursesCount?: number;
  joinedAt?: string;
  totalEarnings?: string;
};

export type CourseSort = 'createdAt_desc' | 'price_asc' | 'price_desc';

export type CourseListItemResponse = {
  id: string;
  chainId: number | null;
  authorAddress: string;
  authorNickname: string | null;
  title: string;
  price: string;
  coverImageUrl: string | null;
  isActive: boolean;
  purchaseCount: number;
  createdAt: string;
};

export type CourseDetailResponse = {
  id: string;
  chainId: number | null;
  authorAddress: string;
  authorNickname: string | null;
  title: string;
  description: string | null;
  price: string;
  coverImageUrl: string | null;
  metaHash: string;
  isActive: boolean;
  purchaseCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedCoursesResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: CourseListItemResponse[];
};

export type PaginatedPurchasedCoursesResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: Array<{
    courseId: string;
    title?: string;
    authorAddress?: string;
    authorNickname?: string | null;
    price?: string;
    purchasedAt?: string;
    coverImageUrl?: string | null;
    purchaseCount?: number;
    isActive?: boolean;
    createdAt?: string;
  }>;
};

export type PaginatedAuthoredCoursesResponse = {
  total: number;
  page?: number;
  pageSize?: number;
  totalEarned?: string;
  dailyEarnings?: Array<{
    date: string;
    amount: string;
  }>;
  items: Array<{
    courseId: string;
    title: string;
    price: string;
    coverImageUrl?: string | null;
    isActive: boolean;
    purchaseCount: number;
    totalEarned: string;
    createdAt: string;
  }>;
};

export type AavePositionRecordResponse = {
  id: string;
  userAddress: string;
  asset: string;
  amount: string;
  txHash: string;
  action: 'supply' | 'withdraw';
  createdAt: string;
};

type GetNonceResponse = {
  nonce: string;
  message: string;
};

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

export type UpdateProfilePayload = {
  nickname?: string;
  avatarUrl?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';

function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;
  const response = await fetch(buildApiUrl(path), {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let payload: ApiErrorPayload | null = null;

    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = null;
    }

    const errorMessage =
      payload?.message ?? payload?.error ?? `Request failed with status ${response.status}`;
    const error = new Error(errorMessage) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

export function getNonce(address: string) {
  const params = new URLSearchParams({ address });
  return apiRequest<GetNonceResponse>(`/auth/nonce?${params.toString()}`);
}

export function verifySignature(address: string, nonce: string, signature: string) {
  return apiRequest<{ success: true }>('/auth/verify', {
    method: 'POST',
    body: { address, nonce, signature },
  });
}

export function logout() {
  return apiRequest<{ success: true }>('/auth/logout', {
    method: 'POST',
  });
}

export function getMe() {
  return apiRequest<AuthUser & { avatarUrl?: string | null }>('/users/me');
}

export function getMyProfile() {
  return apiRequest<MyProfileResponse>('/users/me');
}

export function getCourses(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: CourseSort;
}) {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.pageSize) {
    searchParams.set('pageSize', String(params.pageSize));
  }

  if (params.search) {
    searchParams.set('search', params.search);
  }

  if (params.sort) {
    searchParams.set('sort', params.sort);
  }

  const query = searchParams.toString();

  return apiRequest<PaginatedCoursesResponse>(`/courses${query ? `?${query}` : ''}`);
}

export function getCourseById(id: string) {
  return apiRequest<CourseDetailResponse>(`/courses/${id}`);
}

export function getMyCourses(params: { page?: number; pageSize?: number } = {}) {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.pageSize) {
    searchParams.set('pageSize', String(params.pageSize));
  }

  const query = searchParams.toString();

  return apiRequest<PaginatedPurchasedCoursesResponse>(`/users/me/courses${query ? `?${query}` : ''}`);
}

export function getMyAuthored(params: { page?: number; pageSize?: number } = {}) {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.pageSize) {
    searchParams.set('pageSize', String(params.pageSize));
  }

  const query = searchParams.toString();

  return apiRequest<PaginatedAuthoredCoursesResponse>(
    `/users/me/authored${query ? `?${query}` : ''}`
  );
}

export function updateProfile(data: UpdateProfilePayload) {
  return apiRequest<MyProfileResponse>('/users/me', {
    method: 'PUT',
    body: data,
  });
}

export function createPurchaseRecord(payload: { courseId: string; price: string; txHash: string }) {
  return apiRequest<{ success: boolean; id?: string }>('/purchases', {
    method: 'POST',
    body: payload,
  });
}

export function getAavePositions() {
  return apiRequest<{ positions: AavePositionRecordResponse[] }>('/aave/positions');
}

export function createAavePositionRecord(payload: {
  asset: string;
  amount: string;
  txHash: string;
  action: 'supply' | 'withdraw';
}) {
  return apiRequest<{ success: boolean; id?: string }>('/aave/positions', {
    method: 'POST',
    body: payload,
  });
}

export function getCourseContentAccess(courseId: string) {
  return apiRequest<{ url: string; key: string; expiresIn: number }>('/content/access', {
    method: 'POST',
    body: { courseId },
  });
}

export function getContentUrl(courseId: string) {
  return apiRequest<{ url: string; key: string; expiresIn: number }>('/content/access', {
    method: 'POST',
    body: { courseId },
  });
}
