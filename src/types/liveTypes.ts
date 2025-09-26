// Live data types for soccerbet.rs streaming API

export interface LiveSport {
  sport: string;
  sportSortValue: string;
  matchsCount: number;
}

export interface LiveHeader {
  id: number; // K.id
  r: number; // K.r - round
  mc: number; // K.mc - matchCode
  h: string; // K.h - home team
  a: string; // K.a - away team
  lg: string; // K.lg - leagueName
  lsv: string; // K.lsv - leagueSortValue
  s: string; // K.s - sport
  sn: string; // K.sn - sportName
  ssv: string; // K.ssv - sportSortValue
  kot: number; // K.kot - kickOffTime
  ls: string; // K.ls - liveStatus
  ss: string; // K.ss - streamSource
  tv: string; // K.tv - tvChannelInfo
  liv: boolean; // K.liv - showInLive
  ann: string; // K.ann - announcement
  ltms: number; // K.ltms - ltmstmp
  lct: number; // K.lct - lastChangeTime
  bri: number; // K.bri - brMatchId
  sti: string; // K.sti - imgStreamId
  lmt: boolean; // K.lmt - hasLmt
  eid: string; // K.eid - externalId
  inf: string; // K.inf - matchInfo
  ba: boolean; // K.ba - bettingAllowed
  mte: boolean; // K.mte
  lgi: string; // K.lgi - leagueInfo
  fd: string; // K.fd - feed
  lid: number; // K.lid - leagueId
  gr: string; // K.gr - leagueGroupToken
  grl: string; // K.grl - leagueGroupTokenList
  lsh: string; // K.lsh - leagueShort
  bd: boolean; // K.bd - bonusDisabled
  tvd: string; // K.tvd - tvDurationToken
  hbm: boolean; // K.hbm - hideBetMed
  fci: string; // K.fci - feedConstructId
  spi: string; // K.spi - statsPerformId
  ifs: string; // K.ifs - inFrontStreamId
  sis: string; // K.sis - sisCompetitionId
  flag: string; // K.flag - flagId
  tm: boolean; // K.tm - topMatch
}

export interface LiveBet {
  id: number; // K.id
  bc: number; // K.bc - liveBetCode
  mId: number; // K.mId - matchLiveId
  mc: number; // K.mc - matchCode
  sv: string; // K.sv - specialValue
  st: string; // K.st - liveBetStatus
  d: boolean; // K.d - disabled
  lct: number; // K.lct - lastChangeTime
  om: { [key: string]: { ov: number; bpc: number } }; // K.om - odds map, key is tipTypeCode
}

export interface LiveStreamResponse {
  liveSports?: LiveSport[];
  liveHeaders: LiveHeader[];
  liveResults: any[]; // Ignored as per requirements
  liveBets: LiveBet[];
}

export interface LiveData {
  sports: LiveSport[];
  headers: LiveHeader[];
  bets: LiveBet[];
  lastTimestamp: number;
  initializedAt: Date;
  sport: 'football' | 'tennis' | 'basketball';
}

export interface LiveSubscriptionData {
  headers: LiveHeader[];
  bets: LiveBet[];
  timestamp: number;
}
