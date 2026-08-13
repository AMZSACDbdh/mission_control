/**
 * YouTube playlist import.
 *
 * An important limit, stated plainly: YouTube has not exposed watch history
 * through its API since 2016. Nothing here can detect what you watched — it
 * imports the *episode list* so you tick against real titles instead of a
 * number you typed. The ticking is yours.
 *
 * Requires a free Google API key with "YouTube Data API v3" enabled. Without
 * one, series can still be created by hand.
 */

import { platform } from "@/platform";
import { KEYS } from "@/services/store";

const API = "https://www.googleapis.com/youtube/v3";

export type PlaylistEpisode = {
  videoId: string;
  title: string;
  position: number;
};

export type PlaylistImport = {
  playlistId: string;
  title: string;
  channel: string;
  episodes: PlaylistEpisode[];
};

/** Accepts a full URL, a `list=` link, or a bare playlist id. */
export function parsePlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const listParam = trimmed.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (listParam) return listParam[1]!;

  // A bare id: playlists start PL/UU/LL/FL/OL, or it may be a channel uploads id.
  if (/^[A-Za-z0-9_-]{12,}$/.test(trimmed)) return trimmed;

  return null;
}

async function getJson(url: string) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    const reason = data?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(reason);
  }
  return data;
}

/**
 * Pulls a playlist's title and every episode, paging until done.
 * Public (or unlisted) playlists only — private ones need OAuth, which this
 * app deliberately does not ask for.
 */
export async function importPlaylist(
  playlistUrlOrId: string,
  apiKey: string,
): Promise<PlaylistImport> {
  const playlistId = parsePlaylistId(playlistUrlOrId);
  if (!playlistId) throw new Error("That doesn't look like a playlist link or id.");
  if (!apiKey) throw new Error("Add a YouTube API key in Settings first.");

  const meta = await getJson(
    `${API}/playlists?part=snippet&id=${encodeURIComponent(playlistId)}&key=${apiKey}`,
  );
  const info = meta?.items?.[0]?.snippet;
  if (!info) throw new Error("No such playlist, or it isn't public.");

  const episodes: PlaylistEpisode[] = [];
  let pageToken = "";

  // Page through — playlists routinely exceed the 50-item maximum.
  do {
    const page = await getJson(
      `${API}/playlistItems?part=snippet&maxResults=50&playlistId=${encodeURIComponent(
        playlistId,
      )}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ""}`,
    );

    for (const item of page.items ?? []) {
      const s = item.snippet;
      // Deleted or private entries surface as placeholders — skip them.
      if (!s?.resourceId?.videoId || s.title === "Deleted video" || s.title === "Private video") {
        continue;
      }
      episodes.push({
        videoId: s.resourceId.videoId,
        title: s.title,
        position: s.position ?? episodes.length,
      });
    }

    pageToken = page.nextPageToken ?? "";
  } while (pageToken && episodes.length < 500);

  if (episodes.length === 0) throw new Error("That playlist has no watchable videos.");

  return {
    playlistId,
    title: info.title ?? "Untitled playlist",
    channel: info.channelTitle ?? "",
    episodes: episodes.sort((a, b) => a.position - b.position),
  };
}

/**
 * The key is stored as a bare string rather than JSON, which is why it goes
 * through the platform storage directly instead of `readJson`.
 */
export async function getApiKey(): Promise<string> {
  return (await platform.storage.read(KEYS.youtubeKey)) ?? "";
}

export async function setApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (trimmed) await platform.storage.write(KEYS.youtubeKey, trimmed);
  else await platform.storage.remove(KEYS.youtubeKey);
}
