export type Order = {
  id: string;
  seller_id: string;
  code: string;
  customer_name: string;
  product: string;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  address_label: string | null;
  notes: string | null;
  status: "pending" | "delivered";
  created_at: string;
  submitted_at: string | null;
  delivered_at: string | null;
};
