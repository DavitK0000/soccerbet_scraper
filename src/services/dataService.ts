import { SoccerbetApiService, SportData, BettingOptionsResponse, BetPickMapItem, BetPickGroup } from './soccerbetApi';
import { LiveStreamService } from './liveStreamService';
import { LiveData } from '../types/liveTypes';
import { SportMappingService } from './sportMappingService';
import { PreGameResponse, PreGameMatch, EnhancedPreGameMatch, EnhancedPreGameBet } from '../types/pregameTypes';
import { PreGameApiService } from './pregameApiService';

export interface InitializedData {
  sports: SportData[];
  bettingOptions: BettingOptionsResponse;
  enhancedBettingOptions: EnhancedBettingOptions;
  initializedAt: Date;
  mode: 'live' | 'pre-game';
  sport: 'football' | 'tennis' | 'basketball';
  interval?: string;
  liveData?: LiveData;
  preGameData?: PreGameResponse;
  sportMapping?: SportMappingService;
}

export interface EnhancedBetGroup {
  id: number;
  description: string;
  name: string;
  favorite: boolean;
  handicapParam: string | null;
  specialBetValueTypes: string | null;
  orderNumber: number;
  tipTypes: number[];
  formatCode: number;
  lineCode: number;
  hideHeader: boolean;
  specialValuePosition: string;
  sport: string;
  picksPerRow: number | null;
  picks: EnhancedBetPick[];
}

export interface EnhancedBetPick {
  key: string;
  label: string;
  caption: string;
  tipTypeCode: number;
  betPickCode: number;
  betCode: number;
  position: string | null;
  tipTypeTag: string | null;
  mainType: string | null;
  displaySpecifiers: string | null;
  tipTypeName: string;
  groupId: number | null;
  groupDescription: string | null;
  groupName: string | null;
  groupOrderNumber: number | null;
}

export interface EnhancedBettingOptions {
  groups: EnhancedBetGroup[];
  picks: EnhancedBetPick[];
}

export class DataService {
  private soccerbetApi: SoccerbetApiService;
  private liveStreamService: LiveStreamService;
  private sportMappingService: SportMappingService;
  private preGameApi: PreGameApiService;
  private initializedData: InitializedData | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.soccerbetApi = new SoccerbetApiService();
    this.liveStreamService = new LiveStreamService();
    this.sportMappingService = new SportMappingService();
    this.preGameApi = new PreGameApiService(this.sportMappingService); // ✅ NEW: Pass SportMappingService
  }

  /**
   * Initialize data fetching for the specified mode and sport
   */
  async initialize(mode: 'live' | 'pre-game', sport: 'football' | 'tennis' | 'basketball', interval?: string): Promise<InitializedData> {
    console.log(`Initializing data for ${mode} mode, sport: ${sport}${interval ? `, interval: ${interval}` : ''}`);
    
    try {
      // Fetch basic data from external APIs
      const { sports, bettingOptions } = await this.soccerbetApi.initializeData();
      
      // Initialize sport mappings first to get sport code
      this.sportMappingService.initializeSportMappings(sports);
      
      // Create enhanced betting options with group information
      const enhancedBettingOptions = this.createEnhancedBettingOptions(bettingOptions, sport);
      
      // Set the enhanced betting options
      this.sportMappingService.setBettingOptions(bettingOptions);
      
      let liveData: LiveData | undefined;
      let preGameData: PreGameResponse | undefined;
      
      // For live mode, also initialize live streaming
      if (mode === 'live') {
        console.log('Initializing live streaming data...');
        liveData = await this.liveStreamService.initializeLiveEvents(sport);
        
        // Filter live data by sport
        if (liveData) {
          const filteredHeaders = this.sportMappingService.filterLiveHeadersBySport(liveData.headers, sport);
          liveData.headers = filteredHeaders;
          console.log(`Filtered live headers to ${filteredHeaders.length} matches for ${sport}`);
        }
        
        // Start live subscription
        await this.liveStreamService.startLiveSubscription();
      } else if (mode === 'pre-game') {
        console.log('Initializing pre-game data...');
        const sportCode = this.preGameApi.getSportCode(sport);
        preGameData = await this.preGameApi.fetchPreGameData(sportCode);
        console.log(`Fetched ${preGameData?.esMatches?.length || 0} pre-game matches for ${sport}`);
      }
      
      // Store initialized data
      this.initializedData = {
        sports,
        bettingOptions,
        enhancedBettingOptions,
        initializedAt: new Date(),
        mode,
        sport,
        interval,
        liveData,
        preGameData,
        sportMapping: this.sportMappingService
      };
      
      this.isInitialized = true;
      
      console.log(`Data initialization completed for ${mode} mode`);
      return this.initializedData;
    } catch (error) {
      console.error('Failed to initialize data:', error);
      throw error;
    }
  }

  /**
   * Get the currently initialized data
   */
  getInitializedData(): InitializedData | null {
    return this.initializedData;
  }

  /**
   * Check if data is initialized
   */
  isDataInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Create enhanced betting options with group information
   */
  private createEnhancedBettingOptions(bettingOptions: BettingOptionsResponse, sport: 'football' | 'tennis' | 'basketball'): EnhancedBettingOptions {
    const sportTypeCode = this.sportMappingService.getSportTypeCode(sport);
    
    if (!sportTypeCode) {
      console.warn(`No sport type code found for ${sport}`);
      return { groups: [], picks: [] };
    }
    
    console.log(`Creating enhanced betting options for sport: ${sport} (code: ${sportTypeCode})`);
    
    const enhancedGroups: EnhancedBetGroup[] = [];
    const allPicks: EnhancedBetPick[] = [];
    
    // Start from betPickGroupMap (groups)
    Object.entries(bettingOptions.betPickGroupMap).forEach(([groupId, groupInfo]) => {
      // Only process groups for the selected sport
      if (groupInfo.sport === sportTypeCode) {
        const enhancedGroup: EnhancedBetGroup = {
          id: groupInfo.id,
          description: groupInfo.description,
          name: groupInfo.name,
          favorite: groupInfo.favorite,
          handicapParam: groupInfo.handicapParam,
          specialBetValueTypes: groupInfo.specialBetValueTypes,
          orderNumber: groupInfo.orderNumber,
          tipTypes: groupInfo.tipTypes,
          formatCode: groupInfo.formatCode,
          lineCode: groupInfo.lineCode,
          hideHeader: groupInfo.hideHeader,
          specialValuePosition: groupInfo.specialValuePosition,
          sport: groupInfo.sport,
          picksPerRow: groupInfo.picksPerRow,
          picks: []
        };
        
        enhancedGroups.push(enhancedGroup);
      }
    });
    
    // Extract all picks with group information and connect to groups
    Object.entries(bettingOptions.betPickMap).forEach(([pickKey, pickInfo]) => {
      // Only process picks for the selected sport
      if (pickKey.endsWith(`_${sportTypeCode}`)) {
        // Find the group that this pick belongs to
        const group = enhancedGroups.find(g => g.tipTypes && g.tipTypes.includes(pickInfo.tipTypeCode));
        
        const enhancedPick: EnhancedBetPick = {
          key: pickKey,
          label: pickInfo.label,
          caption: pickInfo.caption,
          tipTypeCode: pickInfo.tipTypeCode,
          betPickCode: pickInfo.betPickCode,
          betCode: pickInfo.betCode,
          position: pickInfo.position,
          tipTypeTag: pickInfo.tipTypeTag,
          mainType: pickInfo.mainType,
          displaySpecifiers: pickInfo.displaySpecifiers,
          tipTypeName: pickInfo.tipTypeName,
          groupId: group?.id || null,
          groupDescription: group?.description || null,
          groupName: group?.name || null,
          groupOrderNumber: group?.orderNumber || null
        };
        
        allPicks.push(enhancedPick);
        
        // Add pick to the group's picks array
        if (group) {
          group.picks.push(enhancedPick);
        }
      }
    });
    
    console.log(`Created ${enhancedGroups.length} groups and ${allPicks.length} picks for ${sport}`);
    
    return {
      groups: enhancedGroups,
      picks: allPicks
    };
  }
  private filterBettingOptionsBySport(bettingOptions: BettingOptionsResponse, sport: 'football' | 'tennis' | 'basketball'): BettingOptionsResponse {
    const sportTypeCode = this.sportMappingService.getSportTypeCode(sport);
    
    if (!sportTypeCode) {
      console.warn(`No sport type code found for ${sport}, returning original betting options`);
      return bettingOptions;
    }
    
    console.log(`Filtering betting options for sport: ${sport} (code: ${sportTypeCode})`);
    
    // Filter betPickMap to only include entries for the selected sport
    const filteredBetPickMap: Record<string, BetPickMapItem> = {};
    const originalBetPickCount = Object.keys(bettingOptions.betPickMap).length;
    
    for (const [key, value] of Object.entries(bettingOptions.betPickMap)) {
      // Check if the key ends with the sport code (e.g., "201049_T" for tennis)
      if (key.endsWith(`_${sportTypeCode}`)) {
        filteredBetPickMap[key] = value;
      }
    }
    
    // Filter betPickGroupMap to only include entries for the selected sport
    const filteredBetPickGroupMap: Record<string, BetPickGroup> = {};
    const originalBetPickGroupCount = Object.keys(bettingOptions.betPickGroupMap).length;
    
    for (const [key, value] of Object.entries(bettingOptions.betPickGroupMap)) {
      // Check if the group belongs to the selected sport
      if (value.sport === sportTypeCode) {
        filteredBetPickGroupMap[key] = value;
      }
    }
    
    const filteredBetPickCount = Object.keys(filteredBetPickMap).length;
    const filteredBetPickGroupCount = Object.keys(filteredBetPickGroupMap).length;
    console.log(`Filtered betPickMap from ${originalBetPickCount} to ${filteredBetPickCount} entries for ${sport}`);
    console.log(`Filtered betPickGroupMap from ${originalBetPickGroupCount} to ${filteredBetPickGroupCount} entries for ${sport}`);
    
    // Return filtered betting options
    return {
      ...bettingOptions,
      betPickMap: filteredBetPickMap,
      betPickGroupMap: filteredBetPickGroupMap
    };
  }

  /**
   * Get enhanced betting data for a match with group information
   */
  getEnhancedBettingDataForMatchWithGroups(matchId: number): any[] {
    const initializedData = this.getInitializedData();
    const liveData = this.getLiveData();
    
    if (!initializedData || !liveData) {
      return [];
    }
    
    // Get the enhanced betting options
    const enhancedOptions = initializedData.enhancedBettingOptions;
    
    // Find bets for this match
    const matchBets = liveData.bets.filter(bet => bet.mId === matchId);
    
    if (matchBets.length === 0) {
      return [];
    }
    
    // Get sport code for this match
    const matchHeader = liveData.headers.find(h => h.id === matchId);
    const sportCode = matchHeader?.s;
    
    if (!sportCode) {
      return [];
    }
    
    // Create enhanced betting data with group information
    const enhancedBets = matchBets.map(bet => {
      const enhancedOdds = Object.entries(bet.om).map(([key, odd]) => {
        const betPickKey = `${key}_${sportCode}`;
        
        // Find the pick in enhanced options
        const enhancedPick = enhancedOptions.picks.find(pick => pick.key === betPickKey);
        
        return {
          key,
          odds: odd.ov,
          betPickCode: odd.bpc,
          description: enhancedPick?.label || 'Unknown Description',
          caption: enhancedPick?.caption || 'N/A'
        };
      });
      
      // Get group information from the first odd (assuming all odds in a bet belong to the same group)
      const firstOddKey = Object.keys(bet.om)[0];
      const firstBetPickKey = `${firstOddKey}_${sportCode}`;
      const firstEnhancedPick = enhancedOptions.picks.find(pick => pick.key === firstBetPickKey);
      
      return {
        ...bet,
        sportCode,
        odds: enhancedOdds,
        groupId: firstEnhancedPick?.groupId || null,
        groupDescription: firstEnhancedPick?.groupDescription || null,
        groupName: firstEnhancedPick?.groupName || null,
        groupOrderNumber: firstEnhancedPick?.groupOrderNumber || null
      };
    });
    
    return enhancedBets;
  }

  /**
   * Reset initialization state
   */
  reset(): void {
    // Stop live streaming if active
    if (this.liveStreamService.isCurrentlyStreaming()) {
      this.liveStreamService.stopLiveSubscription();
    }
    
    this.initializedData = null;
    this.isInitialized = false;
    console.log('Data service reset');
  }

  /**
   * Get sports filtered by the selected sport type
   */
  getFilteredSports(): SportData[] {
    if (!this.initializedData) {
      return [];
    }

    const sportCodeMap = {
      'football': ['S'], // Football and Special Football
      'tennis': ['T'], // Tennis
      'basketball': ['B'] // Basketball
    };

    const allowedCodes = sportCodeMap[this.initializedData.sport] || [];
    
    return this.initializedData.sports.filter(sport => 
      allowedCodes.includes(sport.sportTypeCode) && sport.active
    );
  }

  /**
   * Get betting options filtered by sport
   */
  getFilteredBettingOptions(): BettingOptionsResponse | null {
    if (!this.initializedData) {
      return null;
    }

    const sportCodeMap = {
      'football': 'FB',
      'tennis': 'T',
      'basketball': 'V'
    };

    const sportCode = sportCodeMap[this.initializedData.sport];
    
    if (!sportCode) {
      return this.initializedData.bettingOptions;
    }

    // Filter betMap by sport
    const filteredBetMap = Object.fromEntries(
      Object.entries(this.initializedData.bettingOptions.betMap)
        .filter(([_, betItem]) => betItem.sport === sportCode)
    );

    // Filter betPickGroupMap by sport
    const filteredBetPickGroupMap = Object.fromEntries(
      Object.entries(this.initializedData.bettingOptions.betPickGroupMap)
        .filter(([_, group]) => group.sport === sportCode)
    );

    return {
      ...this.initializedData.bettingOptions,
      betMap: filteredBetMap,
      betPickGroupMap: filteredBetPickGroupMap
    };
  }

  /**
   * Get current live data
   */
  getLiveData(): LiveData | null {
    return this.liveStreamService.getLiveData();
  }

  /**
   * Check if live streaming is active
   */
  isLiveStreaming(): boolean {
    return this.liveStreamService.isCurrentlyStreaming();
  }

  /**
   * Get live stream service for event handling
   */
  getLiveStreamService(): LiveStreamService {
    return this.liveStreamService;
  }

  /**
   * Get current pre-game data
   */
  getPreGameData(): PreGameResponse | null {
    return this.initializedData?.preGameData || null;
  }

  /**
   * Get enhanced pre-game matches with betting data
   */
  getEnhancedPreGameMatches(): EnhancedPreGameMatch[] {
    const initializedData = this.getInitializedData();
    const preGameData = this.getPreGameData();
    
    console.log('getEnhancedPreGameMatches called');
    console.log('Initialized data exists:', !!initializedData);
    console.log('Pre-game data exists:', !!preGameData);
    console.log('Mode:', initializedData?.mode);
    
    if (!initializedData || !preGameData || initializedData.mode !== 'pre-game') {
      console.log('Returning empty array - missing data or wrong mode');
      return [];
    }

    const sportCode = this.preGameApi.getSportCode(initializedData.sport);
    console.log('Sport code:', sportCode);
    console.log('Total matches in pre-game data:', preGameData.esMatches?.length || 0);
    
    const enhancedMatches: EnhancedPreGameMatch[] = [];

    preGameData.esMatches.forEach((match, index) => {
      if (match.sport === sportCode) {
        console.log(`Match ${index + 1} matches sport code ${sportCode}`);
        const enhancedBets = this.enhancePreGameBets(match, initializedData);
        console.log(`Match ${index + 1} enhanced bets count:`, enhancedBets.length);
        
        enhancedMatches.push({
          ...match,
          bets: enhancedBets
        });
      } else {
        console.log(`Match ${index + 1} sport ${match.sport} does not match ${sportCode}`);
      }
    });

    console.log('Final enhanced matches count:', enhancedMatches.length);
    return enhancedMatches;
  }

  /**
   * Enhance pre-game bets with descriptions and group information
   */
  private enhancePreGameBets(match: PreGameMatch, initializedData: InitializedData): EnhancedPreGameBet[] {
    const enhancedBets: EnhancedPreGameBet[] = [];
    const sportCode = this.preGameApi.getSportCode(initializedData.sport);
    
    // Group bets by their group information and total values
    const groupedBets = new Map<string, EnhancedPreGameBet>();
    
    Object.entries(match.betMap).forEach(([betKey, betData]) => {
      Object.entries(betData).forEach(([specialValue, bet]) => {
        const betPickKey = `${betKey}_${sportCode}`;
        
        // Find the pick in enhanced options
        const enhancedPick = initializedData.enhancedBettingOptions.picks.find(pick => pick.key === betPickKey);
        
        // Create a unique key for grouping based on group info and special values
        const specialValues = this.extractSpecialValues(bet.sv);
        const groupKey = `${enhancedPick?.groupId || 'ungrouped'}_${specialValues.total || 'no-total'}_${specialValues.handicap || 'no-handicap'}`;
        
        if (groupedBets.has(groupKey)) {
          // Add this odd to existing group
          const existingBet = groupedBets.get(groupKey)!;
          existingBet.odds.push({
            key: betKey,
            odds: bet.ov,
            betPickCode: bet.bpc,
            description: enhancedPick?.label || 'Unknown Description',
            caption: enhancedPick?.caption || 'N/A'
          });
        } else {
          // Create new group
          const newBet: EnhancedPreGameBet = {
            id: `${match.id}_${groupKey}`,
            betCode: bet.bc,
            betPickCode: bet.bpc,
            tipType: bet.tt,
            status: bet.s,
            specialValue: bet.sv,
            sv: bet.sv, // Add sv field to match live data format
            description: enhancedPick?.label || 'Unknown Description',
            caption: enhancedPick?.caption || 'N/A',
            groupId: enhancedPick?.groupId || null,
            groupDescription: enhancedPick?.groupDescription || null,
            groupName: enhancedPick?.groupName || null,
            groupOrderNumber: enhancedPick?.groupOrderNumber || null,
            odds: [{
              key: betKey,
              odds: bet.ov,
              betPickCode: bet.bpc,
              description: enhancedPick?.label || 'Unknown Description',
              caption: enhancedPick?.caption || 'N/A'
            }]
          };
          groupedBets.set(groupKey, newBet);
        }
      });
    });

    // Convert map to array
    enhancedBets.push(...groupedBets.values());

    console.log(`Enhanced bets count for match: ${enhancedBets.length}`);
    return enhancedBets;
  }

  /**
   * Extract special values (total, handicap) from sv field
   */
  private extractSpecialValues(svField: string): { total: string | null; handicap: string | null } {
    if (!svField) {
      return { total: null, handicap: null };
    }
    
    // Parse sv field to find special values
    const svParams: Record<string, string> = {};
    svField.split(',').forEach(param => {
      const [key, value] = param.split('=');
      if (key && value !== undefined) {
        svParams[key.trim()] = value.trim();
      }
    });
    
    return {
      total: svParams.total || null,
      handicap: svParams.hcp || null
    };
  }

  /**
   * Get sport mapping service
   */
  getSportMappingService(): SportMappingService {
    return this.sportMappingService;
  }

  /**
   * Get enhanced betting data for a specific match
   */
  getEnhancedBettingDataForMatch(matchId: number): any[] {
    const liveData = this.getLiveData();
    if (!liveData) {
      return [];
    }

    return this.sportMappingService.getEnhancedBettingDataForMatch(
      matchId, 
      liveData.bets, 
      liveData.headers
    );
  }

  /**
   * Get filtered live headers by sport
   */
  getFilteredLiveHeadersBySport(): any[] {
    const initializedData = this.getInitializedData();
    const liveData = this.getLiveData();
    
    if (!initializedData || !liveData) {
      return [];
    }

    return this.sportMappingService.filterLiveHeadersBySport(
      liveData.headers, 
      initializedData.sport
    );
  }

  /**
   * Get sport type code for current sport
   */
  getCurrentSportTypeCode(): string | null {
    const initializedData = this.getInitializedData();
    if (!initializedData) {
      return null;
    }

    return this.sportMappingService.getSportTypeCode(initializedData.sport);
  }
}
