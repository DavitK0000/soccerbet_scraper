// Pre-game data types for soccerbet.rs API

export interface PreGameMatch {
  id: number;
  matchCode: number;
  home: string;
  away: string;
  kickOffTime: number;
  status: number;
  blocked: boolean;
  favourite: boolean;
  sport: string;
  leagueId: number;
  leagueName: string;
  leagueToken: string;
  round: number;
  oddsCount: number;
  conditions: string;
  matchInfo: string;
  ticketPrintType: number;
  leagueGroupToken: string;
  leagueGroupId: number;
  tmstmp: number;
  betMap: Record<string, Record<string, PreGameBet>>;
  leagueShort: string;
  live: boolean;
  superMatch: boolean;
  bonusDisabled: boolean;
  brMatchId: number;
  homeId: number;
  awayId: number;
  sourceId: string;
  hasBonusTip: boolean;
}

export interface PreGameBet {
  bpc: number; // bet pick code
  tt: number;  // tip type
  s: string;   // status
  ov: number;  // odds value
  bc: number;  // bet code
  sv: string;  // special value
}

export interface PreGameResponse {
  systemTime: string;
  elasticTook: number;
  id: string;
  name: string | null;
  description: string | null;
  type: string;
  esMatches: PreGameMatch[];
}

export interface EnhancedPreGameMatch {
  id: number;
  matchCode: number;
  home: string;
  away: string;
  kickOffTime: number;
  status: number;
  blocked: boolean;
  favourite: boolean;
  sport: string;
  leagueId: number;
  leagueName: string;
  leagueToken: string;
  round: number;
  oddsCount: number;
  conditions: string;
  matchInfo: string;
  ticketPrintType: number;
  leagueGroupToken: string;
  leagueGroupId: number;
  tmstmp: number;
  leagueShort: string;
  live: boolean;
  superMatch: boolean;
  bonusDisabled: boolean;
  brMatchId: number;
  homeId: number;
  awayId: number;
  sourceId: string;
  hasBonusTip: boolean;
  bets: EnhancedPreGameBet[];
}

export interface EnhancedPreGameBet {
  id: string;
  betCode: number;
  betPickCode: number;
  tipType: number;
  status: string;
  specialValue: string;
  sv: string; // Add sv field to match live data format
  description: string;
  caption: string;
  groupId: number | null;
  groupDescription: string | null;
  groupName: string | null;
  groupOrderNumber: number | null;
  // Add odds array structure to match live data format
  odds: Array<{
    key: string;
    odds: number;
    betPickCode: number;
    description: string;
    caption: string;
  }>;
}
