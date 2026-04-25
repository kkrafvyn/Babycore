import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Heart, MessageSquare, Plus, Users } from 'lucide-react';
import {
  getCommunityForums,
  getForumPosts,
  createCommunityPost,
  likePost,
  type CommunityForum as CommunityForumType,
  type CommunityPost,
} from '@/lib/community-content-service';
import { useAuthStore } from '@/app/AppContext';

interface CommunityForumProps {
  ageGroup?: string;
}

export function CommunityForum({ ageGroup }: CommunityForumProps) {
  const { user } = useAuthStore();
  const [forums, setForums] = useState<CommunityForumType[]>([]);
  const [selectedForum, setSelectedForum] = useState<CommunityForumType | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadForums();
  }, []);

  const loadForums = async () => {
    setLoading(true);
    const forumList = await getCommunityForums();
    setForums(forumList);

    if (forumList.length > 0) {
      const targetForum = forumList.find((f) => f.age_group === ageGroup) || forumList[0];
      setSelectedForum(targetForum);
      await loadForumPosts(targetForum.id);
    }

    setLoading(false);
  };

  const loadForumPosts = async (forumId: string) => {
    const forumPosts = await getForumPosts(forumId, 20);
    setPosts(forumPosts);
  };

  const handleSelectForum = async (forum: CommunityForumType) => {
    setSelectedForum(forum);
    await loadForumPosts(forum.id);
  };

  const handleCreatePost = async () => {
    if (!user?.id || !selectedForum || !newPostTitle.trim() || !newPostContent.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setPosting(true);
    const post = await createCommunityPost(selectedForum.id, user.id, newPostTitle, newPostContent);

    if (post) {
      setPosts([post, ...posts]);
      setNewPostTitle('');
      setNewPostContent('');
    }

    setPosting(false);
  };

  const handleLikePost = async (postId: string) => {
    const success = await likePost(postId);
    if (success) {
      setPosts(
        posts.map((p) => (p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p))
      );
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading community...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Forums List */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Forums
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {forums.map((forum) => (
            <button
              key={forum.id}
              onClick={() => handleSelectForum(forum)}
              className={`w-full text-left p-2 rounded transition-colors ${
                selectedForum?.id === forum.id
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <div className="font-semibold text-sm">{forum.forum_name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {forum.member_count} members
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Forum Content */}
      <Card className="md:col-span-3">
        <CardHeader>
          <div>
            <CardTitle className="text-base">{selectedForum?.forum_name}</CardTitle>
            <CardDescription>{selectedForum?.description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* New Post Form */}
          {user?.id && (
            <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Input
                placeholder="Post title"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                className="text-sm"
              />
              <Textarea
                placeholder="Share your thoughts or question..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={3}
                className="text-sm"
              />
              <Button
                onClick={handleCreatePost}
                disabled={posting}
                size="sm"
                className="w-full"
              >
                <Plus className="mr-1 h-3 w-3" />
                {posting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          )}

          {/* Posts List */}
          <div className="space-y-2">
            {posts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No posts yet. Be the first to start a discussion!
              </p>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="border">
                  <CardContent className="pt-3">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">{post.title}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{post.content}</p>

                      <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleLikePost(post.id)}
                            className="flex items-center gap-1 hover:text-red-500 transition-colors"
                          >
                            <Heart className="h-3 w-3" />
                            {post.likes_count}
                          </button>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {post.replies_count}
                          </div>
                        </div>
                        <div>{new Date(post.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
