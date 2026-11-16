export type Grade = "A" | "B" | "C";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Device {
  id: string;
  name: string;
  price: number;
  batteryHealth: number;
  grade: Grade;
  warranty: string;
  category: string;
  stock: number;
  description: string;
  imageUrls: string[];
  createdAt: string;
}

export interface PurchaseRequest {
  id: string;
  deviceId: string | null;
  deviceName: string;
  devicePrice: number;
  userId: string;
  userEmail: string;
  status: RequestStatus;
  note: string;
  createdAt: string;
  decidedAt: string | null;
}

export interface UserRow {
  id: string;
  email: string;
  role: "admin" | "user";
  fullName: string;
  createdAt: string;
  lastLoginAt: string | null;
}
