/**
 * Community Forum API Routes
 * Endpoints for forum discussions, posts, and community engagement
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * GET /api/community/forums
 * Get list of community forums by age group
 */
export async function getForums(req: Request, res: Response) {
  try {
    const { ageGroup } = req.query;

    let query = supabase.from('community_forums').select('*');

    if (ageGroup) {
      query = query.eq('age_group', ageGroup);
    }

    const { data: forums, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({
      success: true,
      forums: forums || [],
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/community/forums/:forumId/posts
 * Get posts in a specific forum
 */
export async function getForumPosts(req: Request, res: Response) {
  try {
    const { forumId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const { data: posts, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:user_id(id, username, avatar_url),
        likes:likes(count),
        replies:post_replies(count)
      `)
      .eq('forum_id', forumId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    return res.json({
      success: true,
      posts: posts || [],
      count: posts?.length || 0,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/community/forums/:forumId/posts
 * Create a new forum post
 */
export async function createForumPost(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { forumId } = req.params;
    const { title, content, tags = [] } = req.body;

    if (!userId || !forumId || !title || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: post, error } = await supabase
      .from('community_posts')
      .insert({
        id: uuidv4(),
        forum_id: forumId,
        user_id: userId,
        title,
        content,
        tags,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      post,
      message: 'Post created successfully',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/community/posts/:postId/like
 * Like a forum post
 */
export async function likePost(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId || !postId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if already liked
    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Unlike
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      return res.json({ success: true, liked: false });
    }

    // Like
    const { error } = await supabase
      .from('likes')
      .insert({
        id: uuidv4(),
        post_id: postId,
        user_id: userId,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;

    return res.json({ success: true, liked: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/community/posts/:postId/reply
 * Reply to a forum post
 */
export async function replyToPost(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;
    const { content } = req.body;

    if (!userId || !postId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: reply, error } = await supabase
      .from('post_replies')
      .insert({
        id: uuidv4(),
        post_id: postId,
        user_id: userId,
        content,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      reply,
      message: 'Reply added successfully',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/community/playdates
 * Create a playdate event
 */
export async function createPlaydateEvent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { title, description, location, datetime, babyAge, maxAttendees } = req.body;

    if (!userId || !title || !location || !datetime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: event, error } = await supabase
      .from('playdate_events')
      .insert({
        id: uuidv4(),
        created_by: userId,
        title,
        description,
        location,
        datetime,
        baby_age_range: babyAge,
        max_attendees: maxAttendees || 10,
        current_attendees: 1,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Add creator as attendee
    await supabase.from('playdate_attendees').insert({
      id: uuidv4(),
      playdate_id: event.id,
      user_id: userId,
      joined_at: new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      event,
      message: 'Playdate created successfully',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/community/playdates/nearby
 * Get nearby playdate events
 */
export async function getNearbyPlaydates(req: Request, res: Response) {
  try {
    const { latitude, longitude, radiusKm = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Location required' });
    }

    // Fetch events and calculate distance
    const { data: events, error } = await supabase
      .from('playdate_events')
      .select(`
        *,
        creator:created_by(username, avatar_url),
        attendees:playdate_attendees(count)
      `)
      .gt('datetime', new Date().toISOString());

    if (error) throw error;

    // Filter by distance (simplified - use PostGIS in production)
    const nearby = (events || [])
      .map(event => ({
        ...event,
        distance: calculateDistance(
          Number(latitude),
          Number(longitude),
          event.latitude,
          event.longitude
        ),
      }))
      .filter(e => e.distance <= Number(radiusKm))
      .sort((a, b) => a.distance - b.distance);

    return res.json({
      success: true,
      playdates: nearby,
      count: nearby.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/community/playdates/:playdateId/join
 * Join a playdate event
 */
export async function joinPlaydate(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { playdateId } = req.params;

    if (!userId || !playdateId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if already joined
    const { data: existing } = await supabase
      .from('playdate_attendees')
      .select('id')
      .eq('playdate_id', playdateId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already joined this playdate' });
    }

    // Add attendee
    const { error } = await supabase
      .from('playdate_attendees')
      .insert({
        id: uuidv4(),
        playdate_id: playdateId,
        user_id: userId,
        joined_at: new Date().toISOString(),
      });

    if (error) throw error;

    // Update attendee count
    await supabase
      .from('playdate_events')
      .update({
        current_attendees: supabase.rpc('increment_attendees', {
          playdate_id: playdateId,
        }),
      });

    return res.json({
      success: true,
      message: 'Joined playdate successfully',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// Helper function - calculate distance between coordinates
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

router.get('/forums', getForums);
router.get('/forums/:forumId/posts', getForumPosts);
router.post('/forums/:forumId/posts', createForumPost);
router.post('/posts/:postId/like', likePost);
router.post('/posts/:postId/reply', replyToPost);
router.post('/playdates', createPlaydateEvent);
router.get('/playdates/nearby', getNearbyPlaydates);
router.post('/playdates/:playdateId/join', joinPlaydate);

export default router;
