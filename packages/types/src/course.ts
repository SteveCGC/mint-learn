// 课程状态
export type CourseStatus = 'active' | 'inactive';

// 课程基础信息
export interface Course {
  id: string;
  chainId: number | null;
  authorAddress: string;
  authorNickname: string | null;
  title: string;
  description: string | null;
  price: string;            // MT 最小单位，字符串避免精度丢失
  coverImageUrl: string | null;
  metaHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseDetail extends Course {
  purchaseCount: number;
}

// 课程列表项（精简字段）
export interface CourseListItem {
  id: string;
  chainId: number | null;
  authorAddress: string;
  authorNickname: string | null;
  title: string;
  price: string;
  coverImageUrl: string | null;
  isActive: boolean;
  purchaseCount: number;
  createdAt: Date;
}

// 课程购买记录
export interface PurchaseRecord {
  id: string;
  userAddress: string;
  courseId: string;
  txHash: string;
  price: string;
  purchasedAt: Date;
}

// 作者视角的课程（含收益）
export interface AuthoredCourse extends CourseListItem {
  totalEarned: string;   // 累计收益 MT
}
