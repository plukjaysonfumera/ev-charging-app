export interface Review {
  id: string;
  userId: string;
  stationId: string;
  rating: number;
  comment?: string;
  photos: string[];
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}
