export interface SearchQuery {
  ski_site: number;
  from_date: string;
  to_date: string;
  group_size: number;
}

export interface Distance {
  type: string;
  distance: string;
}

export interface Accommodation {
  hotelCode: string;
  hotelName: string;
  images: {
    main: string | null;
    all: string[];
  };
  location: {
    latitude: number | null;
    longitude: number | null;
    distances: Distance[];
  };
  rating: number | null;
  beds: number | null;
  price: {
    afterTax: number | null;
    beforeTax: number | null;
  };
  capacity: number;
  provider: string;
}

export type SearchStatus = 'in_progress' | 'completed' | 'failed';

export interface SearchResult {
  status: SearchStatus;
  accommodations: Accommodation[];
  completedTasks: number;
  totalTasks: number;
}

export interface HotelProvider {
  readonly name: string;
  search(query: SearchQuery, groupSize: number): Promise<Accommodation[]>;
}

export interface AvailabilitySlot {
  provider: HotelProvider;
  size: number;
  key: string;
}

export type SlotStatus = 'pending' | 'done' | 'failed';

export interface SlotResult {
  status: SlotStatus;
  accommodations: Accommodation[];
}

export interface ResultStore {
  claimSlot(slotKey: string): Promise<boolean>;
  addSlotResults(slotKey: string, accommodations: Accommodation[]): Promise<void>;
  markSlotDone(slotKey: string): Promise<void>;
  markSlotFailed(slotKey: string): Promise<void>;
  getSlot(slotKey: string): Promise<SlotResult | null>;
  close(): Promise<void>;
}

export interface PostJsonOptions {
  timeoutMs: number;
  retries: number;
  retryBackoffMs: number;
}

export interface HotelsSimulatorResponse {
  statusCode: number;
  body: {
    success: string;
    accommodations: RawAccommodation[];
  };
}

export interface RawAccommodation {
  HotelCode: string;
  HotelName: string;
  HotelDescriptiveContent?: {
    Images?: RawImage[];
  };
  HotelInfo?: {
    Position?: {
      Latitude?: string;
      Longitude?: string;
      Distances?: RawDistance[];
    };
    Rating?: string;
    Beds?: string;
  };
  PricesInfo?: {
    AmountAfterTax?: string;
    AmountBeforeTax?: string;
  };
}

export interface RawImage {
  URL?: string;
  MainImage?: string;
}

export interface RawDistance {
  type: string;
  distance: string;
}
