import { Router } from "express";
import type {
  CryptoTicker,
  ForexRate,
  IplMatch,
  NewsArticle,
  RedditPost,
  SportEvent,
  SportState,
  StockTicker,
  TweetItem,
} from "@truestake/shared";
import { env } from "../config/env.js";
import { cached } from "../lib/cache.js";
import { asyncHandler } from "../middleware/error.js";

export const liveRouter: Router = Router();

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`upstream ${res.status} for ${url}`);
  return (await res.json()) as T;
}

// GET /api/live/crypto — CoinGecko, cache 30s
liveRouter.get(
  "/crypto",
  asyncHandler(async (_req, res) => {
    const data = await cached<CryptoTicker[]>("crypto", 30_000, async () => {
      const raw = await fetchJson<any[]>(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=inr&order=market_cap_desc&per_page=20&page=1&sparkline=false",
      );
      return raw.map((c) => ({
        id: c.id,
        symbol: c.symbol,
        name: c.name,
        image: c.image,
        price: c.current_price,
        change24h: c.price_change_percentage_24h ?? 0,
      }));
    });
    res.json(data);
  }),
);

// GET /api/live/stocks — AlphaVantage TOP_GAINERS_LOSERS, cache 60s
liveRouter.get(
  "/stocks",
  asyncHandler(async (_req, res) => {
    const data = await cached<StockTicker[]>("stocks", 60_000, async () => {
      if (!env.alphaVantageKey) return mockStocks();
      const raw = await fetchJson<any>(
        `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${env.alphaVantageKey}`,
      );
      const gainers = (raw.top_gainers ?? []) as any[];
      if (gainers.length === 0) return mockStocks();
      return gainers.slice(0, 20).map((s) => ({
        ticker: s.ticker,
        price: Number(s.price),
        change_amount: Number(s.change_amount),
        change_percentage: s.change_percentage,
        volume: Number(s.volume),
      }));
    });
    res.json(data);
  }),
);

// GET /api/live/forex — exchangerate-api, cache 60s
liveRouter.get(
  "/forex",
  asyncHandler(async (_req, res) => {
    const data = await cached<ForexRate>("forex", 60_000, async () => {
      const raw = await fetchJson<any>("https://api.exchangerate-api.com/v4/latest/USD");
      return { base: raw.base, date: raw.date, rates: raw.rates };
    });
    res.json(data);
  }),
);

// GET /api/live/ipl — CricAPI currentMatches, cache 30s
liveRouter.get(
  "/ipl",
  asyncHandler(async (_req, res) => {
    const data = await cached<IplMatch[]>("ipl", 30_000, async () => {
      if (!env.cricapiKey) return mockIpl();
      const raw = await fetchJson<any>(
        `https://api.cricapi.com/v1/currentMatches?apikey=${env.cricapiKey}&offset=0`,
      );
      const matches = (raw.data ?? []) as any[];
      if (matches.length === 0) return mockIpl();
      return matches.slice(0, 12).map((m): IplMatch => ({
        id: m.id,
        name: m.name,
        status: m.status,
        teams: m.teams ?? [],
        score: (m.score ?? []).map((s: any) => ({
          team: s.inning,
          runs: s.r,
          wickets: s.w,
          overs: s.o,
        })),
        matchType: m.matchType,
        state: m.matchStarted && !m.matchEnded ? "LIVE" : m.matchEnded ? "COMPLETED" : "UPCOMING",
      }));
    });
    res.json(data);
  }),
);

// Accounts to track: { Twitter handle → display name }.
const TWEET_ACCOUNTS: { handle: string; name: string }[] = [
  { handle: "ViratKohli18", name: "Virat Kohli" },
  { handle: "sachin_rt", name: "Sachin Tendulkar" },
  { handle: "Cristiano", name: "Cristiano Ronaldo" },
  { handle: "elonmusk", name: "Elon Musk" },
  { handle: "narendramodi", name: "Narendra Modi" },
  { handle: "BeingSalmanKhan", name: "Salman Khan" },
  { handle: "deepikapadukone", name: "Deepika Padukone" },
  { handle: "iamsrk", name: "Shah Rukh Khan" }, // Shah Rukh Khan
];

// Resolve all usernames → numeric ids in ONE request, cached for an hour
// (ids never change, so this keeps us well under the username-lookup rate limit).
async function resolveTweetUserIds(): Promise<Map<string, string>> {
  return cached<Map<string, string>>("tweet:userIds", 3_600_000, async () => {
    const usernames = TWEET_ACCOUNTS.map((a) => a.handle).join(",");
    const res = await fetchJson<{ data?: { id: string; username: string }[] }>(
      `https://api.twitter.com/2/users/by?usernames=${usernames}`,
      { headers: { Authorization: `Bearer ${env.twitterBearerToken}` } },
    );
    const map = new Map<string, string>();
    for (const u of res.data ?? []) map.set(u.username.toLowerCase(), u.id);
    return map;
  });
}

// GET /api/live/tweets — latest 5 tweets per tracked account (Twitter v2).
// Cached 60s; on any failure the TTL cache serves the last good payload, and a
// rich mock backs the very first call so the feed always renders.
liveRouter.get(
  "/tweets",
  asyncHandler(async (_req, res) => {
    let data: TweetItem[];
    try {
      data = await cached<TweetItem[]>("tweets", 60_000, async () => {
      if (!env.twitterBearerToken) return mockTweets();

      const ids = await resolveTweetUserIds();
      const results: TweetItem[] = [];
      for (const acct of TWEET_ACCOUNTS) {
        const id = ids.get(acct.handle.toLowerCase());
        if (!id) continue;
        const timeline = await fetchJson<{
          data?: { text: string; created_at: string; public_metrics?: { like_count?: number; retweet_count?: number } }[];
        }>(`https://api.twitter.com/2/users/${id}/tweets?max_results=5&tweet.fields=public_metrics,created_at`, {
          headers: { Authorization: `Bearer ${env.twitterBearerToken}` },
        });
        for (const t of timeline.data ?? []) {
          results.push({
            handle: acct.handle,
            name: acct.name,
            text: t.text,
            likes: t.public_metrics?.like_count ?? 0,
            retweets: t.public_metrics?.retweet_count ?? 0,
            created_at: t.created_at,
          });
        }
      }
      // If Twitter returned nothing usable (e.g. empty timelines), keep the mock
      // so the cache doesn't store an empty feed.
      if (results.length === 0) throw new Error("no tweets returned");
      return results;
      });
    } catch {
      // Twitter failed and there is no fresh cache yet → serve the mock feed.
      data = mockTweets();
    }
    res.json(data);
  }),
);

// ─────────────────── global sports (TheSportsDB, free key "3") ───────────────────
const SPORTS = ["Soccer", "Cricket", "Basketball", "Tennis", "Motorsport", "Kabaddi"] as const;
const WANTED = new Set<string>(SPORTS);
const SDB = "https://www.thesportsdb.com/api/v1/json/3";

// Marquee leagues to always pull upcoming fixtures for (TheSportsDB league ids).
const MARQUEE_LEAGUES = [
  "4328", // English Premier League
  "4480", // UEFA Champions League
  "4335", // La Liga
  "4387", // NBA
  "4470", // ATP Tour
];

interface SdbEvent {
  idEvent: string;
  strSport: string;
  strLeague: string;
  strEvent: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strStatus?: string | null;
  strProgress?: string | null;
  dateEvent?: string;
  strTime?: string | null;
}

function classifyState(e: SdbEvent): SportState {
  const s = (e.strStatus ?? "").trim();
  if (/finish|full.?time|\bft\b|aet|ended|\bafter\b/i.test(s)) return "FINISHED";
  // A non-empty status that isn't "not started" implies the match is in play.
  if (s && !/^(ns|not started|tbd|postp|cancel|sched)/i.test(s)) return "LIVE";
  return "UPCOMING";
}

function normalizeSport(e: SdbEvent, forced?: SportState): SportEvent {
  const state: SportState = forced ?? classifyState(e);
  return {
    id: e.idEvent,
    sport: e.strSport,
    league: e.strLeague,
    title: e.strEvent,
    homeTeam: e.strHomeTeam ?? "",
    awayTeam: e.strAwayTeam ?? "",
    homeScore: e.intHomeScore ?? null,
    awayScore: e.intAwayScore ?? null,
    status: e.strProgress || e.strStatus || "",
    state,
    date: e.dateEvent ?? "",
    time: e.strTime ?? null,
  };
}

// GET /api/live/sports — live + today's events across major sports, cached 30s.
liveRouter.get(
  "/sports",
  asyncHandler(async (_req, res) => {
    let data: SportEvent[];
    try {
      data = await cached<SportEvent[]>("sports", 30_000, async () => {
        const today = new Date().toISOString().slice(0, 10);
        const all: SportEvent[] = [];

        // 1) Live scores across all sports.
        try {
          const ls = await fetchJson<{ events?: SdbEvent[] | null; livescore?: SdbEvent[] | null }>(`${SDB}/livescore.php`);
          for (const e of ls.events ?? ls.livescore ?? []) {
            if (WANTED.has(e.strSport)) all.push(normalizeSport(e, "LIVE"));
          }
        } catch {
          /* live endpoint may be premium-gated — keep going */
        }

        // 2) Today's events per sport (scheduled / finished).
        for (const sport of SPORTS) {
          try {
            const r = await fetchJson<{ events?: SdbEvent[] | null }>(
              `${SDB}/eventsday.php?d=${today}&s=${encodeURIComponent(sport)}`,
            );
            for (const e of (r.events ?? []).slice(0, 8)) all.push(normalizeSport(e));
          } catch {
            /* skip this sport on error */
          }
        }

        // 3) Upcoming fixtures for marquee leagues (so EPL/UCL/NBA etc. always show).
        for (const id of MARQUEE_LEAGUES) {
          try {
            const r = await fetchJson<{ events?: SdbEvent[] | null }>(`${SDB}/eventsnextleague.php?id=${id}`);
            for (const e of (r.events ?? []).slice(0, 5)) all.push(normalizeSport(e));
          } catch {
            /* skip this league on error */
          }
        }

        // Dedupe by id, preferring a LIVE record over a scheduled one.
        const byId = new Map<string, SportEvent>();
        for (const e of all) {
          const prev = byId.get(e.id);
          if (!prev || (e.state === "LIVE" && prev.state !== "LIVE")) byId.set(e.id, e);
        }
        const list = [...byId.values()];
        if (list.length === 0) throw new Error("no events");

        const order: Record<SportState, number> = { LIVE: 0, UPCOMING: 1, FINISHED: 2 };
        list.sort((a, b) => order[a.state] - order[b.state]);
        return list.slice(0, 60);
      });
    } catch {
      data = mockSports();
    }
    res.json(data);
  }),
);

// ─────────────────── Reddit trending discussions ───────────────────
const SUBS = ["cricket", "wallstreetbets", "CryptoCurrency", "bollywood"];

// Application-only OAuth token (cached ~50 min). Null if no credentials.
async function redditToken(): Promise<string | null> {
  if (!env.redditClientId || !env.redditClientSecret) return null;
  try {
    return await cached<string>("reddit:token", 50 * 60_000, async () => {
      const auth = Buffer.from(`${env.redditClientId}:${env.redditClientSecret}`).toString("base64");
      const res = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": env.redditUserAgent,
        },
        body: "grant_type=client_credentials",
      });
      if (!res.ok) throw new Error(`reddit token ${res.status}`);
      const d = (await res.json()) as { access_token?: string };
      if (!d.access_token) throw new Error("no reddit token");
      return d.access_token;
    });
  } catch {
    return null; // fall back to public JSON
  }
}

interface RedditChild {
  data: { id: string; title: string; subreddit: string; ups: number; num_comments: number; permalink: string };
}

// GET /api/live/trending — top posts from finance/sport/entertainment subreddits, cache 60s.
liveRouter.get(
  "/trending",
  asyncHandler(async (_req, res) => {
    let data: RedditPost[];
    try {
      data = await cached<RedditPost[]>("trending", 60_000, async () => {
        const token = await redditToken();
        const headers: Record<string, string> = { "User-Agent": env.redditUserAgent };
        if (token) headers.Authorization = `Bearer ${token}`;
        const host = token ? "https://oauth.reddit.com" : "https://www.reddit.com";

        const all: RedditPost[] = [];
        for (const sub of SUBS) {
          const suffix = token ? "" : ".json";
          const r = await fetchJson<{ data?: { children?: RedditChild[] } }>(
            `${host}/r/${sub}/top${suffix}?limit=5&t=day`,
            { headers },
          );
          for (const c of r.data?.children ?? []) {
            all.push({
              id: c.data.id,
              title: c.data.title,
              subreddit: c.data.subreddit,
              ups: c.data.ups,
              comments: c.data.num_comments,
              url: `https://reddit.com${c.data.permalink}`,
            });
          }
        }
        if (all.length === 0) throw new Error("no reddit posts");
        return all.sort((a, b) => b.ups - a.ups);
      });
    } catch {
      data = mockTrending();
    }
    res.json(data);
  }),
);

// ─────────────────────────── NewsAPI headlines ───────────────────────────
const NEWS_TOPICS = ["IPL", "Bitcoin", "Sensex", "Virat Kohli", "Elon Musk"];

function detectTopic(text: string): string {
  const lower = text.toLowerCase();
  for (const t of NEWS_TOPICS) if (lower.includes(t.toLowerCase())) return t;
  return "Markets";
}

// GET /api/live/news — top headlines for our tracked topics. Cached 15 min to
// stay comfortably under NewsAPI's free 100 req/day quota (≈96/day worst case).
liveRouter.get(
  "/news",
  asyncHandler(async (_req, res) => {
    let data: NewsArticle[];
    try {
      data = await cached<NewsArticle[]>("news", 15 * 60_000, async () => {
        if (!env.newsApiKey) return mockNews();
        const q = encodeURIComponent('IPL OR Bitcoin OR Sensex OR "Virat Kohli" OR "Elon Musk"');
        const raw = await fetchJson<{
          articles?: { title: string; url: string; publishedAt: string; source?: { name?: string } }[];
        }>(
          `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=15&apiKey=${env.newsApiKey}`,
          { headers: { "User-Agent": env.redditUserAgent } },
        );
        const articles = (raw.articles ?? [])
          .filter((a) => a.title && a.title !== "[Removed]")
          .map((a, i): NewsArticle => ({
            id: `news-${i}-${a.publishedAt}`,
            title: a.title,
            source: a.source?.name ?? "News",
            url: a.url,
            publishedAt: a.publishedAt,
            topic: detectTopic(`${a.title}`),
          }));
        return articles.length ? articles : mockNews();
      });
    } catch {
      data = mockNews();
    }
    res.json(data);
  }),
);

// ---- Mock fallbacks so the platform demos without paid API keys ----

function mockTrending(): RedditPost[] {
  const m = (id: string, title: string, subreddit: string, ups: number, comments: number): RedditPost => ({
    id,
    title,
    subreddit,
    ups,
    comments,
    url: `https://reddit.com/r/${subreddit}`,
  });
  return [
    m("t1", "Kohli's masterclass — is he the GOAT of chase mastery?", "cricket", 24500, 1820),
    m("t2", "BTC breaking out — moon mission loading 🚀", "CryptoCurrency", 18900, 3400),
    m("t3", "YOLO'd my savings on calls, wish me luck 🦍", "wallstreetbets", 41200, 5600),
    m("t4", "SRK's next film breaks pre-booking records", "bollywood", 9800, 740),
    m("t5", "ETH flippening incoming? Discuss.", "CryptoCurrency", 12300, 2100),
    m("t6", "IPL final thread — who takes the title?", "cricket", 15600, 4200),
  ];
}

function mockNews(): NewsArticle[] {
  const now = Date.now();
  const m = (id: string, title: string, source: string, topic: string, mins: number): NewsArticle => ({
    id,
    title,
    source,
    url: "https://news.example.com",
    publishedAt: new Date(now - mins * 60_000).toISOString(),
    topic,
  });
  return [
    m("n1", "Bitcoin surges past key resistance as ETF inflows accelerate", "CoinDesk", "Bitcoin", 18),
    m("n2", "IPL playoffs set as table-toppers seal qualification", "ESPNcricinfo", "IPL", 45),
    m("n3", "Sensex hits record high on strong earnings, FII buying", "Economic Times", "Sensex", 70),
    m("n4", "Virat Kohli named Player of the Tournament favourite", "Times of India", "Virat Kohli", 120),
    m("n5", "Elon Musk teases major product reveal next week", "Reuters", "Elon Musk", 30),
    m("n6", "Crypto market cap rebounds amid risk-on sentiment", "Bloomberg", "Bitcoin", 95),
  ];
}

function mockSports(): SportEvent[] {
  const now = new Date();
  const mk = (
    sport: string,
    league: string,
    home: string,
    away: string,
    hs: string | null,
    as: string | null,
    status: string,
    state: SportState,
  ): SportEvent => ({
    id: `mock-${sport}-${home}-${away}`.replace(/\s+/g, ""),
    sport,
    league,
    title: `${home} vs ${away}`,
    homeTeam: home,
    awayTeam: away,
    homeScore: hs,
    awayScore: as,
    status,
    state,
    date: now.toISOString().slice(0, 10),
    time: "19:30:00",
  });
  return [
    mk("Cricket", "IPL", "Mumbai Indians", "Chennai Super Kings", "182/5", "120/4", "MI need 63 in 30 balls", "LIVE"),
    mk("Soccer", "Premier League", "Arsenal", "Man City", "2", "2", "78'", "LIVE"),
    mk("Basketball", "NBA", "Lakers", "Celtics", "98", "94", "Q4 04:12", "LIVE"),
    mk("Soccer", "Champions League", "Real Madrid", "Bayern", null, null, "Tonight 12:30 AM", "UPCOMING"),
    mk("Soccer", "Indian Super League", "Mohun Bagan", "Bengaluru FC", null, null, "Today 7:30 PM", "UPCOMING"),
    mk("Tennis", "Wimbledon", "Alcaraz", "Sinner", null, null, "Semi-final · 6:00 PM", "UPCOMING"),
    mk("Kabaddi", "Pro Kabaddi", "Patna Pirates", "U Mumba", "34", "31", "2nd half", "LIVE"),
    mk("Motorsport", "Formula 1", "Verstappen", "Norris", null, null, "Monaco GP · Sunday", "UPCOMING"),
    mk("Cricket", "The Hundred", "Trent Rockets", "Oval Invincibles", "145/8", "146/3", "Oval Invincibles won", "FINISHED"),
    mk("Tennis", "US Open", "Djokovic", "Medvedev", "2", "1", "Final set", "LIVE"),
  ];
}

function mockStocks(): StockTicker[] {
  return [
    { ticker: "RELIANCE", price: 2890.5, change_amount: 42.3, change_percentage: "+1.48%", volume: 5_200_000 },
    { ticker: "TCS", price: 4120.1, change_amount: -18.6, change_percentage: "-0.45%", volume: 1_900_000 },
    { ticker: "HDFCBANK", price: 1678.9, change_amount: 23.4, change_percentage: "+1.41%", volume: 8_100_000 },
    { ticker: "INFY", price: 1845.2, change_amount: 12.1, change_percentage: "+0.66%", volume: 3_400_000 },
  ];
}

function mockIpl(): IplMatch[] {
  return [
    {
      id: "mock-1",
      name: "Mumbai Indians vs Chennai Super Kings",
      status: "MI need 48 runs in 30 balls",
      teams: ["Mumbai Indians", "Chennai Super Kings"],
      score: [
        { team: "CSK", runs: 192, wickets: 5, overs: 20 },
        { team: "MI", runs: 145, wickets: 4, overs: 15 },
      ],
      matchType: "t20",
      state: "LIVE",
    },
    {
      id: "mock-2",
      name: "RCB vs KKR",
      status: "Match starts at 7:30 PM",
      teams: ["Royal Challengers Bengaluru", "Kolkata Knight Riders"],
      score: [],
      matchType: "t20",
      state: "UPCOMING",
    },
  ];
}

function mockTweets(): TweetItem[] {
  const samples: Record<string, string> = {
    ViratKohli18: "What a game! Proud of the boys 🇮🇳🔥 #TeamIndia",
    sachin_rt: "Cricket is more than a sport — it unites a billion hearts. 🏏",
    Cristiano: "Hard work and dedication. Never stop believing. 💪 SIUUU",
    elonmusk: "Making life multiplanetary 🚀 Big announcement coming soon.",
    narendramodi: "India's growth story continues. New milestones every day. 🇮🇳",
    BeingSalmanKhan: "New project announcement dropping this week. Stay tuned! 🎬",
    deepikapadukone: "Grateful for all the love. New film out soon ❤️",
    iamsrk: "Love means never having to be careful. New film soon! 🎥",
  };
  return TWEET_ACCOUNTS.map((a, i) => ({
    handle: a.handle,
    name: a.name,
    text: samples[a.handle] ?? "Latest update coming soon.",
    likes: 45_000 + i * 12_000,
    retweets: 6_000 + i * 1_500,
    created_at: new Date(Date.now() - i * 600_000).toISOString(),
  }));
}
