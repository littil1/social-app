"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FeedPost } from "@/types/feed";
import PostCard from "@/app/components/posts/PostCard";

type Props = {
  initialPosts: FeedPost[];
  followersCount: number;
  followingCount: number;
  username: string;
};

export default function UserProfileContent({
  initialPosts,
  followersCount,
  followingCount,
  username,
}: Props) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);

  const totalLikes = useMemo(
    () => posts.reduce((sum, post) => sum + post.likes_count, 0),
    [posts]
  );

  function handleLikeUpdated(postId: number, liked: boolean) {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;

        return {
          ...post,
          viewer_has_liked: liked,
          likes_count: liked
            ? post.likes_count + 1
            : Math.max(0, post.likes_count - 1),
        };
      })
    );
  }

  function handleCommentCreated(postId: number) {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, comments_count: post.comments_count + 1 }
          : post
      )
    );
  }

  function handlePostDeleted(postId: number) {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  }

  return (
    <>
      <div className="flex flex-wrap gap-6 text-sm text-gray-600">
        <span>{posts.length} Posts</span>

        <Link href={`/u/${username}/followers`} className="hover:underline">
          {followersCount} Followers
        </Link>

        <Link href={`/u/${username}/following`} className="hover:underline">
          {followingCount} Following
        </Link>

        <span>{totalLikes} Likes</span>
      </div>

      <div className="mt-6 space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onLikeUpdated={handleLikeUpdated}
            onCommentCreated={handleCommentCreated}
            onPostDeleted={handlePostDeleted}
          />
        ))}

        {posts.length === 0 && (
          <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
            No posts yet.
          </div>
        )}
      </div>
    </>
  );
}