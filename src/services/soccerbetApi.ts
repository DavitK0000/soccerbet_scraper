import axios, { AxiosResponse } from 'axios';

// Types for the external API responses
export interface SportData {
  name: string;
  shortName: string | null;
  sportTypeCode: string;
  orderNumber: number;
  active: boolean;
  oldTypeCode: string;
  activeInLive: boolean;
  sortValue: string;
}

export interface BetMapItem {
  code: number;
  caption: string;
  useSpecifiers: boolean;
  displaySpecifiers: string | null;
  sport: string;
  orderNumber: number;
}

export interface BetLine {
  code: number;
  name: string;
  orderNumber: number;
  leagueCategory: string;
}

export interface BetPick {
  betPickCode: number;
  specValue: string | null;
}

export interface BetPickGroup {
  id: number;
  description: string;
  favorite: boolean;
  handicapParam: string | null;
  specialBetValueTypes: string | null;
  name: string;
  orderNumber: number;
  tipTypes: number[];
  formatCode: number;
  lineCode: number;
  hideHeader: boolean;
  specialValuePosition: string;
  sport: string;
  picksPerRow: number | null;
  initialCollapsed: boolean;
  showOnMain: boolean;
  showOnMobileMain: boolean;
  showOnSpecial: boolean;
  showOnSuper: boolean;
  showOnHeader: boolean;
  hidePicksWithoutOdd: boolean;
  displaySpecifiers: string;
  betMedTranslation: string | null;
  active: boolean;
  picks: BetPick[];
  displayType: string | null;
}

export interface BetPickMapItem {
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
  betMedCaption: string | null;
}

export interface BettingOptionsResponse {
  systemTime: string;
  elasticTook: string | null;
  betMap: Record<string, BetMapItem>;
  betLines: BetLine[];
  betFormats: any[];
  betPickGroupMap: Record<string, BetPickGroup>;
  customBetLineTranslationMap: any;
  betPickMap: Record<string, BetPickMapItem>;
  betPickBPGMap: Record<string, BetPickMapItem>;
}

export class SoccerbetApiService {
  private readonly baseUrl = 'https://www.soccerbet.rs/restapi';
  private readonly desktopVersion = '2.40.3.23';

  /**
   * Fetch sports data from soccerbet.rs
   */
  async getSportsData(): Promise<SportData[]> {
    try {
      const url = `${this.baseUrl}/translate/sr/sports?desktopVersion=${this.desktopVersion}`;
      console.log(`Fetching sports data from: ${url}`);
      
      const response: AxiosResponse<SportData[]> = await axios.get(url, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'sr-RS,sr;q=0.9,en;q=0.8',
          'Referer': 'https://www.soccerbet.rs/'
        }
      });

      console.log(`Successfully fetched ${response.data.length} sports`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sports data:', error);
      throw new Error(`Failed to fetch sports data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch betting options data from soccerbet.rs
   */
  async getBettingOptions(): Promise<BettingOptionsResponse> {
    try {
      const url = `${this.baseUrl}/offer/sr/ttg_lang?desktopVersion=${this.desktopVersion}`;
      console.log(`Fetching betting options from: ${url}`);
      
      const response: AxiosResponse<BettingOptionsResponse> = await axios.get(url, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'sr-RS,sr;q=0.9,en;q=0.8',
          'Referer': 'https://www.soccerbet.rs/'
        }
      });

      console.log(`Successfully fetched betting options with ${Object.keys(response.data.betMap).length} bet mappings`);
      return response.data;
    } catch (error) {
      console.error('Error fetching betting options:', error);
      throw new Error(`Failed to fetch betting options: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize data fetching for both live and pre-game modes
   */
  async initializeData(): Promise<{
    sports: SportData[];
    bettingOptions: BettingOptionsResponse;
  }> {
    console.log('Initializing data fetching...');
    
    try {
      // Fetch both data sources in parallel for better performance
      const [sports, bettingOptions] = await Promise.all([
        this.getSportsData(),
        this.getBettingOptions()
      ]);

      console.log('Data initialization completed successfully');
      return {
        sports,
        bettingOptions
      };
    } catch (error) {
      console.error('Error during data initialization:', error);
      throw error;
    }
  }
}
