import { Request } from "express";

export type Role = "admin" | "sales" | "warehouse" | "accounts";
export type CustomerType = "Retail" | "Wholesale" | "Distributor";
export type CustomerStatus = "Lead" | "Active" | "Inactive";
export type StockMovementType = "IN" | "OUT";
export type ChallanStatus = "Draft" | "Confirmed" | "Cancelled";

export interface UserPayload {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export interface Customer {
  id: number;
  name: string;
  mobile: string | null;
  email: string | null;
  business_name: string | null;
  gst_number: string | null;
  customer_type: CustomerType;
  address: string | null;
  status: CustomerStatus;
  followup_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string | null;
  unit_price: number;
  stock_qty: number;
  min_stock: number;
  location: string | null;
  created_at: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  qty: number;
  type: StockMovementType;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Challan {
  id: number;
  challan_number: string;
  customer_id: number;
  status: ChallanStatus;
  total_qty: number;
  created_by: string | null;
  created_at: string;
}

export interface ChallanItem {
  id: number;
  challan_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  price: number;
  qty: number;
}
