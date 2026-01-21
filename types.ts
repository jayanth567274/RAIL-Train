
export interface Train {
  number: string;
  name: string;
  source: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  runningDays: string[];
  classes: string[];
}

export interface LiveStatus {
  currentStation: string;
  status: string;
  delay: string;
  lastUpdated: string;
  nextStations: { station: string; expectedTime: string; platform?: string }[];
}

export interface PnrInfo {
  pnr: string;
  trainName: string;
  trainNumber: string;
  date: string;
  from: string;
  to: string;
  passengers: { seat: string; status: string }[];
  chartStatus: string;
}

export interface ScheduleStop {
  station: string;
  arrivalTime: string;
  departureTime: string;
  haltTime?: string;
  platform?: string;
  day: number;
}

export interface Alert {
  id: string;
  type: 'delay' | 'cancellation' | 'info';
  title: string;
  description: string;
  time: string;
}

export interface Coach {
  code: string;
  type: 'engine' | 'ac1' | 'ac2' | 'ac3' | 'sleeper' | 'general' | 'pantry' | 'luggage';
  position: number;
}

export type AppView = 'home' | 'search' | 'live' | 'pnr' | 'schedule' | 'alerts' | 'coaches' | 'live-search';
