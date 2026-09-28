/** Deliberately narrow — never leak bank/tax/contact details through the public endpoint. */
export interface FeaturedVendor {
  id: string;
  businessName: string;
  businessType: string | null;
}
