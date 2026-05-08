
export interface ExtraFee {
  id: number;
  name: string;
  amount: string;
}

export interface BillRecord {
  id: string;
  recordedAt: string; // When this record was created
  startDate: string;
  endDate: string;
  rent: string;
  elecPrev: number;
  elecCurr: string;
  waterPrev: number;
  waterCurr: string;
  extraFees: ExtraFee[];
  total: number;
  tenantName?: string;
  tenantIdCard?: string;
  roomNo: string;
}

export interface Room {
  id: string;
  roomNo: string;
  rent: string;
  deposit: string;
  payDay: number; // Day of month (1-31), derived from moveInDate if present, used for sorting
  moveInDate?: string; // Full date string YYYY-MM-DD
  
  // Tenant Info
  tenantName?: string;
  tenantPhone?: string;
  tenantIdCard?: string;
  
  fixedElecPrice?: string;
  fixedWaterPrice?: string;
  elecPrev: number;
  elecCurr: string;
  waterPrev: number;
  waterCurr: string;
  extraFees: ExtraFee[];
  status: 'paid' | 'unpaid';
  lastUpdated: string;
  
  // Billing cycle memory
  billStartDate?: string;
  billEndDate?: string;
  
  // History
  billHistory?: BillRecord[];
}

export interface AppConfig {
  defaultRent: string;
}

export interface HistoryItem {
  data: Room[];
  desc: string;
  time: string;
}

export interface HistoryState {
  archives: HistoryItem[];
  present: Room[];
}

export interface BatchSettingsData {
  payDay?: string;
  rent?: string;
  fixedElecPrice?: string;
  fixedWaterPrice?: string;
}

export interface ActionHandlers {
  addRoom: (data: Partial<Room>) => void;
  batchAddConfirmed: (previewRooms: Partial<Room>[]) => void;
  updateRoom: (id: string, data: Partial<Room>) => void;
  saveRoom: (id: string, data: Partial<Room>) => void;
  deleteSingle: (id: string) => void;
  deleteBatch: () => void;
  updateBatchSettings: (settings: BatchSettingsData) => void; // Updated handler
  newMonth: (targetDay: number | 'all') => void;
  settleSingleRoom: (id: string) => void;
  moveOut: (id: string, returnDeposit: boolean) => void;
}

export type ModalType = 
  | 'history' 
  | 'bill' 
  | 'batchBill'
  | 'moveOut' 
  | 'newMonth' 
  | 'batchEdit' // Changed from batchDate
  | 'genericConfirm' 
  | 'billHistory'
  | 'cloudAuth'
  | null;

export interface ModalState {
  type: ModalType;
  data?: any;
  onConfirm?: () => void;
  title?: string;
  content?: string;
}

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
