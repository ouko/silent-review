export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  passwordHash?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  rating: number;
  caption?: string | null;
  productTag?: string | null;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeUser {
  id: string;
  email: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  role: string;
  createdAt: string;
}

export interface ReviewWithAuthor extends Review {
  user: SafeUser;
}

export interface PublicProfile extends SafeUser {
  reviewCount: number;
  followerCount: number;
  followingCount: number;
}
