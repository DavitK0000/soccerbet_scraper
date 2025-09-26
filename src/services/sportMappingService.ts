import { SportData } from './soccerbetApi';
import { BettingOptionsResponse } from './soccerbetApi';

export interface SportMapping {
  name: string;
  sportTypeCode: string;
  englishName: string;
}

export interface EnhancedBetData {
  id: number;
  betCode: number;
  matchId: number;
  matchCode: number;
  specialValue: string;
  status: string;
  disabled: boolean;
  lastChangeTime: number;
  sportCode: string;
  odds: Array<{
    key: string;
    odds: number;
    betPickCode: number;
    description: string;
    caption: string;
    groupId: number | null;
    groupDescription: string | null;
    groupName: string | null;
  }>;
}

export class SportMappingService {
  private sportMappings: Map<string, SportMapping> = new Map();
  private bettingOptions: BettingOptionsResponse | null = null;

  /**
   * Initialize sport mappings from sports data
   */
  initializeSportMappings(sportsData: SportData[]): void {
    console.log('Initializing sport mappings...');
    
    // Clear existing mappings
    this.sportMappings.clear();
    
    // Define sport name mappings
    const sportNameMap: Record<string, string> = {
      'FUDBAL': 'football',
      'KOŠARKA': 'basketball', 
      'TENIS': 'tennis'
    };
    
    // Extract sport mappings
    sportsData.forEach(sport => {
      const englishName = sportNameMap[sport.name];
      if (englishName) {
        const mapping: SportMapping = {
          name: sport.name,
          sportTypeCode: sport.sportTypeCode,
          englishName: englishName
        };
        
        this.sportMappings.set(englishName, mapping);
        console.log(`Mapped ${sport.name} (${sport.sportTypeCode}) -> ${englishName}`);
      }
    });
    
    console.log(`Initialized ${this.sportMappings.size} sport mappings`);
  }

  /**
   * Set betting options for bet description lookup
   */
  setBettingOptions(bettingOptions: BettingOptionsResponse): void {
    this.bettingOptions = bettingOptions;
    console.log('Betting options set for description lookup');
  }

  /**
   * Get sport type code for a given sport name
   */
  getSportTypeCode(sportName: 'football' | 'tennis' | 'basketball'): string | null {
    const mapping = this.sportMappings.get(sportName);
    return mapping ? mapping.sportTypeCode : null;
  }

  /**
   * Get sport mapping for a given sport name
   */
  getSportMapping(sportName: 'football' | 'tennis' | 'basketball'): SportMapping | null {
    return this.sportMappings.get(sportName) || null;
  }

  /**
   * Get all sport mappings
   */
  getAllSportMappings(): Map<string, SportMapping> {
    return this.sportMappings;
  }

  /**
   * Filter live headers by sport
   */
  filterLiveHeadersBySport(headers: any[], sportName: 'football' | 'tennis' | 'basketball'): any[] {
    const sportTypeCode = this.getSportTypeCode(sportName);
    
    if (!sportTypeCode) {
      console.warn(`No sport type code found for ${sportName}`);
      return [];
    }
    
    const filtered = headers.filter(header => header.s === sportTypeCode);
    console.log(`Filtered ${filtered.length} headers for sport ${sportName} (${sportTypeCode})`);
    
    return filtered;
  }

  /**
   * Enhance bet data with descriptions from betting options
   */
  enhanceBetData(bet: any, sportCode: string): EnhancedBetData {
    const enhancedBet: EnhancedBetData = {
      id: bet.id,
      betCode: bet.bc,
      matchId: bet.mId,
      matchCode: bet.mc,
      specialValue: bet.sv,
      status: bet.st,
      disabled: bet.d,
      lastChangeTime: bet.lct,
      sportCode: sportCode,
      odds: []
    };

    // Process odds with descriptions
    if (bet.om && this.bettingOptions) {
      Object.entries(bet.om).forEach(([key, oddsData]: [string, any]) => {
        const betPickKey = `${key}_${sportCode}`;
        const betPickInfo = this.bettingOptions!.betPickMap[betPickKey];
        
        // Get group information from betPickGroupMap
        const groupInfo = this.bettingOptions!.betPickGroupMap[betPickInfo?.betCode?.toString() || ''];
        
        const oddInfo = {
          key: key,
          odds: oddsData.ov,
          betPickCode: oddsData.bpc,
          description: betPickInfo ? betPickInfo.label : 'Unknown bet',
          caption: betPickInfo ? betPickInfo.caption : key,
          groupId: groupInfo?.id || null,
          groupDescription: groupInfo?.description || null,
          groupName: groupInfo?.name || null
        };
        
        enhancedBet.odds.push(oddInfo);
      });
    }

    return enhancedBet;
  }

  /**
   * Enhance multiple bets with descriptions
   */
  enhanceBetsData(bets: any[], sportCode: string): EnhancedBetData[] {
    return bets.map(bet => this.enhanceBetData(bet, sportCode));
  }

  /**
   * Get sport code from match code using live headers
   */
  getSportCodeFromMatchCode(matchCode: number, liveHeaders: any[]): string | null {
    const header = liveHeaders.find(h => h.mc === matchCode);
    return header ? header.s : null;
  }

  /**
   * Group bets by match with sport codes
   */
  groupBetsByMatchWithSportCodes(bets: any[], liveHeaders: any[]): Map<number, { bets: any[], sportCode: string }> {
    const grouped = new Map<number, { bets: any[], sportCode: string }>();
    
    bets.forEach(bet => {
      const sportCode = this.getSportCodeFromMatchCode(bet.mc, liveHeaders);
      
      if (!grouped.has(bet.mId)) {
        grouped.set(bet.mId, {
          bets: [],
          sportCode: sportCode || 'Unknown'
        });
      }
      
      grouped.get(bet.mId)!.bets.push(bet);
    });
    
    return grouped;
  }

  /**
   * Get enhanced betting data for a specific match
   */
  getEnhancedBettingDataForMatch(matchId: number, bets: any[], liveHeaders: any[]): EnhancedBetData[] {
    const matchBets = bets.filter(bet => bet.mId === matchId);
    const sportCode = this.getSportCodeFromMatchCode(matchBets[0]?.mc, liveHeaders);
    
    if (!sportCode) {
      console.warn(`No sport code found for match ${matchId}`);
      return [];
    }
    
    return this.enhanceBetsData(matchBets, sportCode);
  }

  /**
   * Group enhanced betting data by betPickGroupMap
   */
  groupEnhancedBetsByGroup(enhancedBets: EnhancedBetData[]): Map<number, { groupInfo: any, bets: EnhancedBetData[] }> {
    const grouped = new Map<number, { groupInfo: any, bets: EnhancedBetData[] }>();
    
    enhancedBets.forEach(bet => {
      bet.odds.forEach(odd => {
        if (odd.groupId) {
          if (!grouped.has(odd.groupId)) {
            // Get group info from betPickGroupMap
            const groupInfo = this.bettingOptions?.betPickGroupMap[odd.groupId.toString()];
            grouped.set(odd.groupId, {
              groupInfo: groupInfo || { id: odd.groupId, description: odd.groupDescription, name: odd.groupName },
              bets: []
            });
          }
          
          // Check if this bet is already in the group (avoid duplicates)
          const existingBet = grouped.get(odd.groupId)!.bets.find(b => b.id === bet.id);
          if (!existingBet) {
            grouped.get(odd.groupId)!.bets.push(bet);
          }
        }
      });
    });
    
    return grouped;
  }

  /**
   * Get sport statistics
   */
  getSportStatistics(): Record<string, { name: string, code: string, count: number }> {
    const stats: Record<string, { name: string, code: string, count: number }> = {};
    
    this.sportMappings.forEach((mapping, englishName) => {
      stats[englishName] = {
        name: mapping.name,
        code: mapping.sportTypeCode,
        count: 0 // This would be populated with actual data counts
      };
    });
    
    return stats;
  }
}
