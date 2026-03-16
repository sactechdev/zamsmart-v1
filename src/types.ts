export interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'customer';
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
  image_url: string;
  is_featured: boolean;
  created_at: string;
  categories?: Category;
  product_images?: { image_url: string }[];
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
  quantity: number;
  price: number;
  products?: Product;
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
  id: 'bank_details' | 'office_info' | 'shipping_config';
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
