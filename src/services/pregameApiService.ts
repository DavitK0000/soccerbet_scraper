import axios, { AxiosResponse } from 'axios';
import { PreGameResponse } from '../types/pregameTypes';
import { SportMappingService } from './sportMappingService';

export class PreGameApiService {
  private readonly baseUrl = 'https://www.soccerbet.rs';
  private sportMappingService: SportMappingService;

  constructor(sportMappingService: SportMappingService) {
    this.sportMappingService = sportMappingService;
  }

  /**
   * Fetch pre-game matches and betting data for a specific sport
   * @param sportCode - Sport code (S for football, T for tennis, V for basketball)
   * @returns Promise<PreGameResponse>
   */
  async fetchPreGameData(sportCode: string): Promise<PreGameResponse> {
    try {
      console.log(`Fetching pre-game data for sport: ${sportCode}`);
      
      const url = `${this.baseUrl}/restapi/offer/sr/sport/${sportCode}/mob?annex=0&desktopVersion=2.40.3.24&locale=sr`;
      
      const response: AxiosResponse<PreGameResponse> = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'sr-RS,sr;q=0.9,en;q=0.8',
          'Referer': 'https://www.soccerbet.rs/',
          'Origin': 'https://www.soccerbet.rs'
        },
        timeout: 30000
      });

      console.log(`Pre-game data fetched successfully for sport ${sportCode}:`, {
        systemTime: response.data.systemTime,
        matchesCount: response.data.esMatches?.length || 0,
        elasticTook: response.data.elasticTook
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching pre-game data for sport ${sportCode}:`, error);
      throw new Error(`Failed to fetch pre-game data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get sport code mapping for pre-game API using the same logic as live mode
   * @param sport - User-friendly sport name
   * @returns Sport code for API
   */
  getSportCode(sport: 'football' | 'tennis' | 'basketball'): string {
    const sportTypeCode = this.sportMappingService.getSportTypeCode(sport);
    
    if (!sportTypeCode) {
      console.warn(`No sport type code found for ${sport}, using fallback mapping`);
      // Fallback to hardcoded mapping if sport mapping service is not initialized
      const fallbackMap = {
        football: 'S',    // Soccer/Football
        tennis: 'T',      // Tennis
        basketball: 'V'   // Basketball
      };
      return fallbackMap[sport];
    }
    
    return sportTypeCode;
  }
}
