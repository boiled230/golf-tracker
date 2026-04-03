export interface Player {
  rank: string;
  name: string;
  totalScore: string;
  thru: string;
  round: string;
  movement: 'rising' | 'falling' | 'stable';
  teamOwner?: string;
  teamColor?: string;
}

export interface Team {
  id: string;
  ownerName: string;
  nickname?: string;
  players: string[];
  traits: string[];
  totalEarnings: number;
  color: string;
  imageUrl?: string;
  playersInTop40?: number;
}

export interface WeeklyResult {
  id: string;
  weekEnding: string;
  tournamentName: string;
  winnerTeamId: string;
  winnerName?: string;
  winningGolfer: string;
  headline: string;
  subHeadline: string;
  roast: string;
  recap: any;
  options?: {
    headline: string;
    roast: string;
    subHeadline: string;
  }[];
  publishedOptionIndex?: number;
}
