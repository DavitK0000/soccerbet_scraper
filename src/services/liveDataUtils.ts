import { LiveHeader, LiveBet, LiveSport } from '../types/liveTypes';

export class LiveDataUtils {
  /**
   * Filter live headers by sport
   */
  static filterHeadersBySport(headers: LiveHeader[], sport: 'football' | 'tennis' | 'basketball'): LiveHeader[] {
    const sportCodeMap = {
      'football': ['FB', 'SF'], // Football and Special Football
      'tennis': ['T'], // Tennis
      'basketball': ['V'] // Basketball
    };

    const allowedCodes = sportCodeMap[sport] || [];
    
    return headers.filter(header => 
      allowedCodes.includes(header.s) && header.liv // Only show in live
    );
  }

  /**
   * Filter live bets by match ID
   */
  static filterBetsByMatch(bets: LiveBet[], matchId: number): LiveBet[] {
    return bets.filter(bet => bet.mId === matchId);
  }

  /**
   * Get active matches (not finished)
   */
  static getActiveMatches(headers: LiveHeader[]): LiveHeader[] {
    return headers.filter(header => 
      header.ls === 'RUNNING' || header.ls === 'HT' || header.ls === 'FT'
    );
  }

  /**
   * Get matches with betting allowed
   */
  static getBettingAllowedMatches(headers: LiveHeader[]): LiveHeader[] {
    return headers.filter(header => header.ba);
  }

  /**
   * Get top matches
   */
  static getTopMatches(headers: LiveHeader[]): LiveHeader[] {
    return headers.filter(header => header.tm);
  }

  /**
   * Format match info for display
   */
  static formatMatchInfo(header: LiveHeader): string {
    return `${header.h} vs ${header.a} - ${header.lg}`;
  }

  /**
   * Get match status text
   */
  static getMatchStatusText(header: LiveHeader): string {
    const statusMap: Record<string, string> = {
      'RUNNING': 'Live',
      'HT': 'Half Time',
      'FT': 'Full Time',
      'POSTPONED': 'Postponed',
      'CANCELLED': 'Cancelled',
      'SUSPENDED': 'Suspended'
    };
    
    return statusMap[header.ls] || header.ls;
  }

  /**
   * Format kickoff time
   */
  static formatKickoffTime(kot: number): string {
    return new Date(kot).toLocaleString();
  }

  /**
   * Get odds for a specific bet
   */
  static getBetOdds(bet: LiveBet): Array<{ key: string; odds: number; bpc: number }> {
    return Object.entries(bet.om).map(([key, value]) => ({
      key,
      odds: value.ov,
      bpc: value.bpc
    }));
  }

  /**
   * Get active bets (not disabled)
   */
  static getActiveBets(bets: LiveBet[]): LiveBet[] {
    return bets.filter(bet => !bet.d);
  }

  /**
   * Group bets by match
   */
  static groupBetsByMatch(bets: LiveBet[]): Map<number, LiveBet[]> {
    const grouped = new Map<number, LiveBet[]>();
    
    bets.forEach(bet => {
      if (!grouped.has(bet.mId)) {
        grouped.set(bet.mId, []);
      }
      grouped.get(bet.mId)!.push(bet);
    });
    
    return grouped;
  }

  /**
   * Get sport name from sport code
   */
  static getSportName(sportCode: string): string {
    const sportMap: Record<string, string> = {
      'FB': 'Football',
      'SF': 'Special Football',
      'T': 'Tennis',
      'V': 'Basketball'
    };
    
    return sportMap[sportCode] || sportCode;
  }

  /**
   * Check if match is currently live
   */
  static isMatchLive(header: LiveHeader): boolean {
    return header.ls === 'RUNNING' || header.ls === 'HT';
  }

  /**
   * Get matches by league
   */
  static getMatchesByLeague(headers: LiveHeader[], leagueId: number): LiveHeader[] {
    return headers.filter(header => header.lid === leagueId);
  }

  /**
   * Sort matches by kickoff time
   */
  static sortMatchesByKickoff(headers: LiveHeader[], ascending: boolean = true): LiveHeader[] {
    return [...headers].sort((a, b) => {
      return ascending ? a.kot - b.kot : b.kot - a.kot;
    });
  }

  /**
   * Get unique leagues from headers
   */
  static getUniqueLeagues(headers: LiveHeader[]): Array<{ id: number; name: string; short: string }> {
    const leagues = new Map<number, { id: number; name: string; short: string }>();
    
    headers.forEach(header => {
      if (!leagues.has(header.lid)) {
        leagues.set(header.lid, {
          id: header.lid,
          name: header.lg,
          short: header.lsh
        });
      }
    });
    
    return Array.from(leagues.values());
  }

  /**
   * Get sport statistics from live sports data
   */
  static getSportStats(sports: LiveSport[], sportCode: string): LiveSport | null {
    return sports.find(sport => sport.sport === sportCode) || null;
  }
}
