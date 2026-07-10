export type Product = {
  id?: string;
  slug: string;
  name: string;
  label: string;
  price_eur: number;
  price: string;
  image: string;
  story: string;
  tags: string[];
  is_active: boolean;
};
