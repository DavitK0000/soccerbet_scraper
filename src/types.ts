import { Request, Response, NextFunction } from 'express';

// Extend Express Request interface to include session
declare module 'express-session' {
  interface SessionData {
    authenticated?: boolean;
  }
}

// Custom Request interface with session
export interface AuthenticatedRequest extends Request {
  session: Request['session'] & {
    authenticated?: boolean;
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

// Login request/response types
export interface LoginRequest {
  password: string;
}

export interface LoginResponse extends ApiResponse {}

// Start/Stop request types
export interface StartRequest {
  mode: 'live' | 'pre-game';
  sport: 'football' | 'tennis' | 'basketball';
  interval?: string; // Only for pre-game mode
}

export interface StartResponse extends ApiResponse {
  data: {
    mode: string;
    sport: string;
    interval?: string;
    sportsCount?: number;
    bettingOptionsCount?: number;
    initializedAt?: string;
  };
}

export interface StopResponse extends ApiResponse {}

// Sports and intervals
export type Sport = 'football' | 'tennis' | 'basketball';
export type Mode = 'live' | 'pre-game';
export type TimeInterval = '1min' | '10min' | '30min' | '1hour';

// Middleware type
export type AuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
