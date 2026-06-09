// Shared domain types for TrueStake — consumed by both apps/web and apps/api.

export type MarketType = "crypto" | "stock" | "ipl" | "forex" | "tweet";
export type MarketStatus = "open" | "closed" | "resolved";
export type BetDirection = "up" | "down";
export type BetResult = "pending" | "won" | "lost";
export type TxType = "deposit" | "withdraw" | "win" | "loss" | "redeem" | "bet";

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  supercoins: number;
  referral_code: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  metamask_address: string | null;
}

export interface Market<TData = Record<string, unknown>> {
  id: string;
  type: MarketType;
  title: string;
  data: TData;
  expires_at: string;
  status: MarketStatus;
  created_at?: string;
}

export interface Bet {
  id: string;
  user_id: string;
  market_id: string;
  amount: number;
  direction: BetDirection;
  prediction: number;
  result: BetResult;
  payout: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TxType;
  amount: number;
  created_at: string;
}

export interface Redemption {
  id: string;
  user_id: string;
  platform: string;
  coins_used: number;
  voucher_code: string;
  created_at: string;
}

export type WithdrawalStatus = "pending" | "approved" | "rejected";
export type WithdrawalMethod = "bank" | "metamask";

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  status: WithdrawalStatus;
  method: WithdrawalMethod;
  destination: string | null;
  note: string | null;
  processed_by: string | null;
  requested_at: string;
  processed_at: string | null;
  users?: { username: string; email: string };
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  market_id: string;
  market_type: MarketType;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  bets: number;
  win_rate: number;
  profit: number;
  achievements?: Achievement[];
}

// ---- Live data shapes ----

export interface CryptoTicker {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
}

export interface StockTicker {
  ticker: string;
  price: number;
  change_amount: number;
  change_percentage: string;
  volume: number;
}

export interface ForexRate {
  base: string;
  rates: Record<string, number>;
  date: string;
}

export interface IplMatch {
  id: string;
  name: string;
  status: string;
  teams: string[];
  score: { team: string; runs: number; wickets: number; overs: number }[];
  matchType: string;
  state: "UPCOMING" | "LIVE" | "COMPLETED";
}

export type SportState = "LIVE" | "UPCOMING" | "FINISHED";

export interface SportEvent {
  id: string;
  sport: string; // Cricket | Soccer | Tennis | Basketball | Motorsport | Kabaddi
  league: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string | null;
  awayScore: string | null;
  status: string;
  state: SportState;
  date: string;
  time: string | null;
}

export interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  ups: number;
  comments: number;
  url: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  topic: string;
}

export interface TweetItem {
  handle: string;
  name: string;
  text: string;
  likes: number;
  retweets: number;
  created_at: string;
}

export interface OrderBookEntry {
  username: string;
  amount: number;
  direction: BetDirection;
  created_at: string;
}

export interface OrderBook {
  marketUuid: string;
  orders: OrderBookEntry[];
  poolUp: number;
  poolDown: number;
  totalPool: number;
  oddsUp: number;
  oddsDown: number;
  countUp: number;
  countDown: number;
}

export type AlertDirection = "above" | "below";
export type AlertStatus = "active" | "triggered";

export interface PriceAlert {
  id: string;
  user_id: string;
  market_type: MarketType;
  market_id: string;
  symbol: string;
  title: string;
  target_price: number;
  direction: AlertDirection;
  status: AlertStatus;
  triggered_at: string | null;
  created_at: string;
}

export interface CopyTrade {
  trader_id: string;
  active: boolean;
}

export interface ChatMessage {
  id: string;
  market_id: string;
  username: string;
  message: string;
  created_at: string;
}

export interface AiPrediction {
  id?: string;
  market_id: string;
  symbol?: string;
  title?: string;
  prediction: "up" | "down" | "neutral";
  confidence: number;
  reasoning: string;
  price?: number | null;
  created_at?: string;
}

export interface Achievement {
  code: string;
  title: string;
  created_at?: string;
}

export interface AchievementsResponse {
  achievements: Achievement[];
  current_streak: number;
  best_streak: number;
}

export const PAPER_START_BALANCE = 10000;
export const REDEEM_RATE = 100; // 100 coins = ₹10
export const REDEEM_VALUE = 10;
export const REFERRAL_BONUS = 200;
export const SUPERCOIN_WIN_MULTIPLIER = 0.1;

export interface ApiError {
  error: string;
  message?: string;
}
