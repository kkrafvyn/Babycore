import { supabase } from './supabase';

export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  content_type: 'article' | 'video' | 'tip' | 'guide' | 'podcast';
  age_groups: string[];
  category: string;
  content_url?: string;
  thumbnail_url?: string;
  duration_minutes?: number;
  is_premium: boolean;
  source?: string;
  created_at: string;
}

export interface CommunityForum {
  id: string;
  forum_name: string;
  age_group?: string;
  description?: string;
  is_anonymous: boolean;
  member_count: number;
}

export interface CommunityPost {
  id: string;
  forum_id: string;
  user_id: string;
  title: string;
  content: string;
  tags?: string[];
  likes_count: number;
  replies_count: number;
  created_at: string;
}

export interface PlaydateEvent {
  id: string;
  user_id: string;
  title: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  event_date: string;
  age_range?: string;
  description?: string;
  max_attendees?: number;
  attendee_ids: string[];
}

/**
 * Get content from library filtered by age and category
 */
export async function getContentLibrary(
  ageGroups?: string[],
  category?: string,
  includeFreePremium: boolean = true
): Promise<ContentItem[]> {
  try {
    let query = supabase.from('content_library').select('*');

    if (ageGroups && ageGroups.length > 0) {
      // Filter by age overlap
      query = query.overlaps('age_groups', ageGroups);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (!includeFreePremium) {
      query = query.eq('is_premium', false);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching content library:', err);
    return [];
  }
}

/**
 * Save content to user's library
 */
export async function saveContent(userId: string, contentId: string): Promise<boolean> {
  try {
    const { data: prefs } = await supabase
      .from('user_content_preferences')
      .select('saved_content_ids')
      .eq('user_id', userId)
      .single();

    const savedIds = prefs?.saved_content_ids || [];

    if (!savedIds.includes(contentId)) {
      const { error } = await supabase
        .from('user_content_preferences')
        .update({ saved_content_ids: [...savedIds, contentId] })
        .eq('user_id', userId);

      if (error) throw error;
    }

    return true;
  } catch (err) {
    console.error('Error saving content:', err);
    return false;
  }
}

/**
 * Mark content as read
 */
export async function markContentAsRead(userId: string, contentId: string): Promise<boolean> {
  try {
    const { data: prefs } = await supabase
      .from('user_content_preferences')
      .select('read_content_ids')
      .eq('user_id', userId)
      .single();

    const readIds = prefs?.read_content_ids || [];

    if (!readIds.includes(contentId)) {
      const { error } = await supabase
        .from('user_content_preferences')
        .update({ read_content_ids: [...readIds, contentId] })
        .eq('user_id', userId);

      if (error) throw error;
    }

    return true;
  } catch (err) {
    console.error('Error marking as read:', err);
    return false;
  }
}

/**
 * Get community forums
 */
export async function getCommunityForums(): Promise<CommunityForum[]> {
  try {
    const { data, error } = await supabase
      .from('community_forums')
      .select('*')
      .order('member_count', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching forums:', err);
    return [];
  }
}

/**
 * Get forum by age group
 */
export async function getForumByAgeGroup(ageGroup: string): Promise<CommunityForum | null> {
  try {
    const { data, error } = await supabase
      .from('community_forums')
      .select('*')
      .eq('age_group', ageGroup)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching forum:', err);
    return null;
  }
}

/**
 * Get posts from a forum
 */
export async function getForumPosts(
  forumId: string,
  limit = 20,
  offset = 0
): Promise<CommunityPost[]> {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .eq('forum_id', forumId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching forum posts:', err);
    return [];
  }
}

/**
 * Create community post
 */
export async function createCommunityPost(
  forumId: string,
  userId: string,
  title: string,
  content: string,
  tags?: string[]
): Promise<CommunityPost | null> {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        forum_id: forumId,
        user_id: userId,
        title,
        content,
        tags: tags || [],
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error creating post:', err);
    return null;
  }
}

/**
 * Like a community post
 */
export async function likePost(postId: string): Promise<boolean> {
  try {
    const { data: post } = await supabase
      .from('community_posts')
      .select('likes_count')
      .eq('id', postId)
      .single();

    if (!post) return false;

    const { error } = await supabase
      .from('community_posts')
      .update({ likes_count: post.likes_count + 1 })
      .eq('id', postId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error liking post:', err);
    return false;
  }
}

/**
 * Delete community post
 */
export async function deletePost(postId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting post:', err);
    return false;
  }
}

/**
 * Create playdate event
 */
export async function createPlaydateEvent(
  userId: string,
  event: Omit<PlaydateEvent, 'id' | 'user_id' | 'attendee_ids'>
): Promise<PlaydateEvent | null> {
  try {
    const { data, error } = await supabase
      .from('playdate_events')
      .insert({
        user_id: userId,
        ...event,
        attendee_ids: [userId],
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error creating playdate:', err);
    return null;
  }
}

/**
 * Get nearby playdate events
 */
export async function getNearbyPlaydates(
  latitude: number,
  longitude: number,
  radiusKm: number = 10,
  ageRange?: string
): Promise<PlaydateEvent[]> {
  try {
    // Note: Real geospatial query would use PostGIS
    // For now, this is a simplified version
    let query = supabase
      .from('playdate_events')
      .select('*')
      .gt('event_date', new Date().toISOString())
      .order('event_date', { ascending: true });

    if (ageRange) {
      query = query.eq('age_range', ageRange);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter by distance (simplified - use Haversine formula)
    if (data) {
      return data.filter((event) => {
        if (!event.latitude || !event.longitude) return false;
        const distance = calculateDistance(latitude, longitude, event.latitude, event.longitude);
        return distance <= radiusKm;
      });
    }

    return [];
  } catch (err) {
    console.error('Error fetching nearby playdates:', err);
    return [];
  }
}

/**
 * Join playdate event
 */
export async function joinPlaydate(eventId: string, userId: string): Promise<boolean> {
  try {
    const { data: event } = await supabase
      .from('playdate_events')
      .select('attendee_ids')
      .eq('id', eventId)
      .single();

    if (!event) return false;

    const attendees = event.attendee_ids || [];
    if (!attendees.includes(userId)) {
      attendees.push(userId);
    }

    const { error } = await supabase
      .from('playdate_events')
      .update({ attendee_ids: attendees })
      .eq('id', eventId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error joining playdate:', err);
    return false;
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
