// 用户基础信息（对应 Supabase users 表）
export interface User {
  id: string;
  address: string;       // 钱包地址（小写）
  nickname: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 他人可见的公开档案
export interface UserProfile {
  address: string;
  nickname: string | null;
  avatarUrl: string | null;
  authoredCoursesCount: number;
  joinedAt: Date;
}

// 当前用户完整信息（JWT 鉴权后可见）
export interface MyProfile extends UserProfile {
  purchasedCoursesCount: number;
  totalEarnings: string;      // 累计收益 MT，字符串表示避免精度丢失
  aaveStakedAmount: string;   // 当前质押余额（链上实时查询）
}
