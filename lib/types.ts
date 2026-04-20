export type OrderItem = {
  name: string;
  qty: number;
  unit_price: number | null;
};

export type OrderType = "sale" | "rental";

export type Order = {
  id: string;
  seller_id: string;
  code: string;
  customer_name: string;
  product: string;
  items: OrderItem[];
  total_amount: number | null;
  currency: string;
  order_type: OrderType;
  /** ISO date (YYYY-MM-DD). Optional for sales; required for rentals (start). */
  scheduled_for: string | null;
  /** ISO date (YYYY-MM-DD). Rentals only: return date. */
  rental_end_at: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  address_label: string | null;
  notes: string | null;
  /** Up to 2 public Supabase Storage URLs for landmark photos. */
  photos: string[];
  status: "pending" | "delivered";
  created_at: string;
  submitted_at: string | null;
  delivered_at: string | null;
};
