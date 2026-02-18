/**
 * YouTube Data API v3 integration service
 *
 * Uses playlistItems.list (1 unit) instead of search.list (100 units)
 * for quota-efficient video fetching. Every channel has a hidden "Uploads"
 * playlist: replace the "UC" prefix in channelId with "UU".
 */

import type { ExtractedItem } from '../types/feed.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/** Parsed result from a YouTube URL */
export interface YouTubeUrlInfo {
  type: 'channel' | 'handle' | 'user' | 'playlist';
  id: string;
}

/** Resolved channel info with uploads playlist */
export interface YouTubeChannelInfo {
  channelId: string;
  uploadsPlaylistId: string;
  channelTitle: string;
}

/** Video item from YouTube API */
interface YouTubePlaylistItem {
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    resourceId: {
      videoId: string;
    };
    thumbnails?: {
      default?: { url: string };
      medium?: { url: string };
    };
  };
}

/**
 * Parse a YouTube URL to extract the identifier type and value.
 * Supports: channel IDs, handles (@), custom URLs (/c/), usernames, and playlist IDs.
 */
export function parseYouTubeUrl(url: string): YouTubeUrlInfo | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.replace('www.', '');
  if (hostname !== 'youtube.com' && hostname !== 'm.youtube.com' && hostname !== 'youtu.be') {
    return null;
  }

  const path = parsed.pathname;

  // /channel/UCxxxxxxxx
  const channelMatch = path.match(/^\/channel\/(UC[\w-]+)/);
  if (channelMatch) {
    return { type: 'channel', id: channelMatch[1] };
  }

  // /@handle
  const handleMatch = path.match(/^\/@([\w.-]+)/);
  if (handleMatch) {
    return { type: 'handle', id: handleMatch[1] };
  }

  // /c/CustomName
  const customMatch = path.match(/^\/c\/([\w.-]+)/);
  if (customMatch) {
    return { type: 'handle', id: customMatch[1] };
  }

  // /user/username
  const userMatch = path.match(/^\/user\/([\w.-]+)/);
  if (userMatch) {
    return { type: 'user', id: userMatch[1] };
  }

  // /playlist?list=PLxxxxxxxx
  const playlistId = parsed.searchParams.get('list');
  if (playlistId) {
    return { type: 'playlist', id: playlistId };
  }

  return null;
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return parseYouTubeUrl(url) !== null;
}

/**
 * Resolve any YouTube identifier to a channel ID and uploads playlist ID.
 * Handles, usernames, and channel IDs all get resolved to the uploads playlist.
 */
export async function resolveChannelId(
  apiKey: string,
  info: YouTubeUrlInfo
): Promise<YouTubeChannelInfo> {
  if (info.type === 'playlist') {
    // For playlists, we need to get the playlist details to find the channel
    const playlistUrl = `${YOUTUBE_API_BASE}/playlists?part=snippet&id=${encodeURIComponent(info.id)}&key=${apiKey}`;
    const res = await fetch(playlistUrl);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || `YouTube API error: ${res.status}`);
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('Playlist not found');
    }

    const playlist = data.items[0];
    return {
      channelId: playlist.snippet.channelId,
      uploadsPlaylistId: info.id, // Use the provided playlist directly
      channelTitle: playlist.snippet.channelTitle || playlist.snippet.title,
    };
  }

  // Build the channels API request based on identifier type
  let params: string;
  if (info.type === 'channel') {
    params = `id=${encodeURIComponent(info.id)}`;
  } else if (info.type === 'handle') {
    params = `forHandle=${encodeURIComponent(info.id)}`;
  } else {
    // 'user' — try forUsername
    params = `forUsername=${encodeURIComponent(info.id)}`;
  }

  const channelUrl = `${YOUTUBE_API_BASE}/channels?part=snippet,contentDetails&${params}&key=${apiKey}`;
  const res = await fetch(channelUrl);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || `YouTube API error: ${res.status}`);
  }

  if (!data.items || data.items.length === 0) {
    // Handle case: try forHandle as fallback for 'user' type
    if (info.type === 'user') {
      const fallbackUrl = `${YOUTUBE_API_BASE}/channels?part=snippet,contentDetails&forHandle=${encodeURIComponent(info.id)}&key=${apiKey}`;
      const fallbackRes = await fetch(fallbackUrl);
      const fallbackData = await fallbackRes.json();

      if (fallbackRes.ok && fallbackData.items && fallbackData.items.length > 0) {
        const channel = fallbackData.items[0];
        return {
          channelId: channel.id,
          uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads,
          channelTitle: channel.snippet.title,
        };
      }
    }
    throw new Error('Channel not found. Check the URL and try again.');
  }

  const channel = data.items[0];
  return {
    channelId: channel.id,
    uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads,
    channelTitle: channel.snippet.title,
  };
}

/**
 * Fetch videos from a YouTube playlist (uses playlistItems.list — 1 unit per call).
 */
export async function fetchPlaylistItems(
  apiKey: string,
  playlistId: string,
  maxResults: number = 25
): Promise<ExtractedItem[]> {
  const url = `${YOUTUBE_API_BASE}/playlistItems?part=snippet&playlistId=${encodeURIComponent(playlistId)}&maxResults=${maxResults}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    const errorMessage = data.error?.message || `YouTube API error: ${res.status}`;

    // Detect quota exhaustion
    if (res.status === 403 && data.error?.errors?.[0]?.reason === 'quotaExceeded') {
      throw new Error('YouTube API daily quota exceeded. Try again after midnight Pacific Time.');
    }

    throw new Error(errorMessage);
  }

  if (!data.items || data.items.length === 0) {
    return [];
  }

  return (data.items as YouTubePlaylistItem[]).map((item) => ({
    title: item.snippet.title,
    link: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
    description: truncateDescription(item.snippet.description),
    pubDate: new Date(item.snippet.publishedAt),
  }));
}

/**
 * Truncate description to a reasonable length for RSS items.
 */
function truncateDescription(description: string, maxLength: number = 500): string {
  if (!description) return '';
  if (description.length <= maxLength) return description;
  return description.substring(0, maxLength) + '...';
}

/**
 * Get the YouTube API key from the settings table.
 * Returns null if not configured.
 */
export async function getYouTubeApiKey(): Promise<string | null> {
  // Dynamic import to avoid circular dependency
  const { supabase } = await import('../db/index.js');

  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'youtube_api_key')
    .single();

  if (error || !data) return null;
  return data.value;
}
