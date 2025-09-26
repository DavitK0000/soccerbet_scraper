import express, { Request, Response } from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import { 
  AuthenticatedRequest, 
  ApiResponse, 
  LoginRequest, 
  LoginResponse, 
  StartRequest, 
  StartResponse, 
  StopResponse,
  AuthMiddleware 
} from './types';
import { DataService } from './services/dataService';
import { LiveDataUtils } from './services/liveDataUtils';

const app = express();
const PORT = process.env.PORT || 3000;

// Hardcoded password for authentication
const HARDCODED_PASSWORD = 'admin123';

// Initialize data service
const dataService = new DataService();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Session configuration
app.use(session({
  secret: 'soccerbet-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware
const requireAuth: AuthMiddleware = (req: AuthenticatedRequest, res: Response, next) => {
  if (req.session.authenticated) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes
app.get('/', (req: Request, res: Response) => {
  if ((req as AuthenticatedRequest).session.authenticated === true) {
    res.redirect('/main');
  } else {
    res.redirect('/login');
  }
});

app.get('/login', (req: Request, res: Response) => {
  if ((req as AuthenticatedRequest).session.authenticated === true) {
    res.redirect('/main');
  } else {
    res.sendFile(path.join(__dirname, '../public', 'login.html'));
  }
});

app.post('/api/login', (req: Request<{}, LoginResponse, LoginRequest>, res: Response<LoginResponse>) => {
  const { password } = req.body;
  
  if (password === HARDCODED_PASSWORD) {
    (req as AuthenticatedRequest).session.authenticated = true;
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

app.get('/main', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.sendFile(path.join(__dirname, '../public', 'main.html'));
});

app.post('/api/logout', (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ success: false, message: 'Logout failed' });
    } else {
      res.json({ success: true, message: 'Logged out successfully' });
    }
  });
});

// API routes for betting data (protected)
app.get('/api/data', requireAuth, (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const initializedData = dataService.getInitializedData();
    
    if (!initializedData) {
      res.json({
        success: false,
        message: 'No data initialized. Please start data collection first.',
        data: null
      });
      return;
    }

    const filteredSports = dataService.getFilteredSports();
    const filteredBettingOptions = dataService.getFilteredBettingOptions();
    
    res.json({ 
      success: true,
      message: 'Data successfully retrieved',
      data: {
        mode: initializedData.mode,
        sport: initializedData.sport,
        interval: initializedData.interval,
        initializedAt: initializedData.initializedAt.toISOString(),
        sports: filteredSports,
        bettingOptions: filteredBettingOptions,
        totalSportsCount: initializedData.sports.length,
        filteredSportsCount: filteredSports.length,
        totalBettingOptionsCount: Object.keys(initializedData.bettingOptions.betMap).length,
        filteredBettingOptionsCount: filteredBettingOptions ? Object.keys(filteredBettingOptions.betMap).length : 0
      }
    });
  } catch (error) {
    console.error('Error retrieving data:', error);
    res.status(500).json({
      success: false,
      message: `Failed to retrieve data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: null
    });
  }
});

// Live data endpoint for real-time updates
app.get('/api/live-data', requireAuth, (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const initializedData = dataService.getInitializedData();
    
    if (!initializedData || initializedData.mode !== 'live') {
      res.json({
        success: false,
        message: 'Live mode not initialized. Please start live mode first.',
        data: null
      });
      return;
    }

    const liveData = dataService.getLiveData();
    const isStreaming = dataService.isLiveStreaming();
    
    if (!liveData) {
      res.json({
        success: false,
        message: 'No live data available',
        data: null
      });
      return;
    }

    // Filter data by selected sport using sport mapping service
    const filteredHeaders = dataService.getFilteredLiveHeadersBySport();
    const activeMatches = LiveDataUtils.getActiveMatches(filteredHeaders);
    const bettingAllowedMatches = LiveDataUtils.getBettingAllowedMatches(filteredHeaders);
    const topMatches = LiveDataUtils.getTopMatches(filteredHeaders);
    const sportTypeCode = dataService.getCurrentSportTypeCode();
    
    // Get betting data for all matches with group information
    const matchesWithBets = filteredHeaders.map(header => ({
      ...header,
      bets: dataService.getEnhancedBettingDataForMatchWithGroups(header.id)
    }));
    
    res.json({
      success: true,
      message: 'Live data retrieved successfully',
      data: {
        matchesWithBets, // Include betting data for all matches with group info
        isStreaming,
        sport: initializedData.sport,
        initializedAt: initializedData.initializedAt.toISOString(),
        stats: {
          totalMatches: filteredHeaders.length,
          activeMatches: activeMatches.length,
          bettingAllowedMatches: bettingAllowedMatches.length,
          topMatches: topMatches.length,
          totalBets: liveData.bets.length,
          sportTypeCode: sportTypeCode
        }
      }
    });
  } catch (error) {
    console.error('Error retrieving live data:', error);
    res.status(500).json({
      success: false,
      message: `Failed to retrieve live data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: null
    });
  }
});

// Pre-game data endpoint
app.get('/api/pregame-data', requireAuth, (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    console.log('Pre-game data endpoint called');
    const initializedData = dataService.getInitializedData();
    console.log('Initialized data:', initializedData ? 'exists' : 'null');
    console.log('Mode:', initializedData?.mode);
    
    if (!initializedData || initializedData.mode !== 'pre-game') {
      console.log('Pre-game mode not initialized');
      res.json({
        success: false,
        message: 'Pre-game mode not initialized. Please start pre-game mode first.',
        data: null
      });
      return;
    }

    const preGameData = dataService.getPreGameData();
    console.log('Pre-game data:', preGameData ? 'exists' : 'null');
    console.log('Pre-game matches count:', preGameData?.esMatches?.length || 0);
    
    if (!preGameData) {
      console.log('No pre-game data available');
      res.json({
        success: false,
        message: 'No pre-game data available',
        data: null
      });
      return;
    }

    // Get enhanced pre-game matches with betting data
    const enhancedMatches = dataService.getEnhancedPreGameMatches();
    console.log('Enhanced matches count:', enhancedMatches.length);
    console.log('First enhanced match:', enhancedMatches[0] ? 'exists' : 'null');
    if (enhancedMatches[0]) {
      console.log('First match bets count:', enhancedMatches[0].bets?.length || 0);
    }
    
    res.json({
      success: true,
      message: 'Pre-game data retrieved successfully',
      data: {
        matchesWithBets: enhancedMatches,
        isStreaming: false, // Pre-game is not streaming
        sport: initializedData.sport,
        initializedAt: initializedData.initializedAt.toISOString(),
        interval: initializedData.interval,
        stats: {
          totalMatches: enhancedMatches.length,
          activeMatches: enhancedMatches.length, // All pre-game matches are considered active
          bettingAllowedMatches: enhancedMatches.length, // All pre-game matches allow betting
          topMatches: enhancedMatches.filter(m => m.favourite).length,
          totalBets: enhancedMatches.reduce((sum, match) => sum + match.bets.length, 0),
          sportTypeCode: dataService.getCurrentSportTypeCode()
        }
      }
    });
  } catch (error) {
    console.error('Error retrieving pre-game data:', error);
    res.status(500).json({
      success: false,
      message: `Failed to retrieve pre-game data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: null
    });
  }
});

// Get live matches endpoint
app.get('/api/live-matches', requireAuth, (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const initializedData = dataService.getInitializedData();
    
    if (!initializedData || initializedData.mode !== 'live') {
      res.json({
        success: false,
        message: 'Live mode not initialized. Please start live mode first.',
        data: null
      });
      return;
    }

    const liveData = dataService.getLiveData();
    
    if (!liveData) {
      res.json({
        success: false,
        message: 'No live data available',
        data: null
      });
      return;
    }

    const filteredHeaders = dataService.getFilteredLiveHeadersBySport();
    const activeMatches = LiveDataUtils.getActiveMatches(filteredHeaders);
    const bettingAllowedMatches = LiveDataUtils.getBettingAllowedMatches(filteredHeaders);
    const sportTypeCode = dataService.getCurrentSportTypeCode();
    
    // Format matches for display
    const formattedMatches = filteredHeaders.map(header => ({
      id: header.id,
      matchCode: header.mc,
      homeTeam: header.h,
      awayTeam: header.a,
      league: header.lg,
      leagueShort: header.lsh,
      sport: LiveDataUtils.getSportName(header.s),
      kickoffTime: LiveDataUtils.formatKickoffTime(header.kot),
      status: LiveDataUtils.getMatchStatusText(header),
      isLive: LiveDataUtils.isMatchLive(header),
      bettingAllowed: header.ba,
      isTopMatch: header.tm,
      matchInfo: header.inf,
      externalId: header.eid
    }));
    
    res.json({
      success: true,
      message: 'Live matches retrieved successfully',
      data: {
        matches: formattedMatches,
        stats: {
          total: filteredHeaders.length,
          active: activeMatches.length,
          bettingAllowed: bettingAllowedMatches.length,
          sportTypeCode: sportTypeCode
        }
      }
    });
  } catch (error) {
    console.error('Error retrieving live matches:', error);
    res.status(500).json({
      success: false,
      message: `Failed to retrieve live matches: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: null
    });
  }
});

// Get live bets for a specific match
app.get('/api/live-bets/:matchId', requireAuth, (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const matchId = parseInt(req.params.matchId);
    
    if (isNaN(matchId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid match ID',
        data: null
      });
      return;
    }

    const initializedData = dataService.getInitializedData();
    
    if (!initializedData || initializedData.mode !== 'live') {
      res.json({
        success: false,
        message: 'Live mode not initialized. Please start live mode first.',
        data: null
      });
      return;
    }

    const liveData = dataService.getLiveData();
    
    if (!liveData) {
      res.json({
        success: false,
        message: 'No live data available',
        data: null
      });
      return;
    }

    // Get enhanced betting data with descriptions
    const enhancedBets = dataService.getEnhancedBettingDataForMatch(matchId);
    
    res.json({
      success: true,
      message: 'Enhanced live bets retrieved successfully',
      data: {
        matchId,
        bets: enhancedBets,
        totalBets: enhancedBets.length,
        sportCode: dataService.getCurrentSportTypeCode()
      }
    });
  } catch (error) {
    console.error('Error retrieving live bets:', error);
    res.status(500).json({
      success: false,
      message: `Failed to retrieve live bets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: null
    });
  }
});

app.post('/api/start', requireAuth, async (req: Request<{}, StartResponse, StartRequest>, res: Response<StartResponse>) => {
  const { mode, sport, interval } = req.body;
  
  try {
    console.log(`Starting data collection for ${mode} mode, sport: ${sport}${interval ? `, interval: ${interval}` : ''}`);
    
    // Initialize data fetching
    const initializedData = await dataService.initialize(mode, sport, interval);
    
    res.json({ 
      success: true, 
      message: `Successfully started ${mode} mode for ${sport}. Data initialized with ${initializedData.sports.length} sports and ${Object.keys(initializedData.bettingOptions.betMap).length} betting options.`,
      data: { 
        mode, 
        sport, 
        interval,
        sportsCount: initializedData.sports.length,
        bettingOptionsCount: Object.keys(initializedData.bettingOptions.betMap).length,
        initializedAt: initializedData.initializedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error starting data collection:', error);
    res.status(500).json({
      success: false,
      message: `Failed to start data collection: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: { mode, sport, interval }
    });
  }
});

app.post('/api/stop', requireAuth, (req: AuthenticatedRequest, res: Response<StopResponse>) => {
  try {
    console.log('Stopping data collection...');
    
    // Reset data service
    dataService.reset();
    
    res.json({ 
      success: true, 
      message: 'Successfully stopped data collection and reset initialized data'
    });
  } catch (error) {
    console.error('Error stopping data collection:', error);
    res.status(500).json({
      success: false,
      message: `Failed to stop data collection: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
