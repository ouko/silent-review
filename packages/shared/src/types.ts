import type { User, Review, Guess, Like, Comment, Follow } from "@prisma/client";

export type {
  User,
  Review,
  Guess,
  Like,
  Comment,
  Follow,
};

export type SafeUser = Pick<
  User,
  "id" | "email" | "username" | "displayName" | "avatarUrl" | "createdAt"
>;

export interface ReviewWithAuthor extends Review {
  user: SafeUser;
}

export interface PublicProfile extends SafeUser {
  reviewCount: number;
  followerCount: number;
  followingCount: number;
}
