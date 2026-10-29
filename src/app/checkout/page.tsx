import { getLocations, getHours, getSellerWhatsApp, hasAvailablePromoCodes } from "@/lib/dataService";
import CheckoutClient from "@/components/CheckoutClient";

export const revalidate = 0; 

export default async function Checkout() {
  const [locations, hours, whatsapp, hasPromoCodes] = await Promise.all([
    getLocations(),
    getHours(),
    getSellerWhatsApp(),
    hasAvailablePromoCodes()
  ]);

  return (
    <CheckoutClient 
      locations={locations} 
      hours={hours} 
      whatsapp={whatsapp}
      hasPromoCodes={hasPromoCodes}
    />
  );
}
