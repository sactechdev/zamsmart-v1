export type UserRole = 'admin' | 'customer' | 'merchant';
export type MerchantStatus = 'pending' | 'verified' | 'rejected';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  merchant_status?: MerchantStatus;
  business_name?: string;
  business_description?: string;
  business_address?: string;
  business_phone?: string;
  commission_rate?: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category_id: string;
  merchant_id?: string;
  approval_status?: ApprovalStatus;
  image_url: string;
  is_featured: boolean;
  created_at: string;
  categories?: Category;
  product_images?: { image_url: string }[];
  merchant?: Profile;
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: 'Pending Payment Review' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  full_name: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  city: string;
  created_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  merchant_id?: string;
  quantity: number;
  price: number;
  commission_amount?: number;
  merchant_payout_amount?: number;
  products?: Product;
}

export interface Payout {
  id: string;
  merchant_id: string;
  amount: number;
  status: 'pending' | 'paid';
  created_at: string;
  merchant?: Profile;
}

export interface PaymentProof {
  id: string;
  order_id: string;
  file_url: string;
  review_status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  created_at: string;
}

export interface SiteSettings {
  id: 'bank_details' | 'office_info' | 'shipping_config' | 'marketplace_config';
  value: any;
  updated_at: string;
}

export interface BankDetails {
  bank_name: string;
  account_name: string;
  account_number: string;
}

export interface OfficeInfo {
  address: string;
  phone: string;
  email: string;
}

export interface ShippingConfig {
  free_shipping_threshold: number;
  shipping_fee: number;
}
