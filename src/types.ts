export interface JobListing {
  id: string;
  title: string;
  description: string;
  payment: number;
  paymentType: 'fixed' | 'hourly';
  category: string;
  location: string;
  phone: string; // WhatsApp number
  employerName: string;
  isFeatured: boolean;
  createdAt: string; // ISO date string
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}
