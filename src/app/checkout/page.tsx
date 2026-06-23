import { getLocations, getHours, getSellerWhatsApp } from "@/lib/dataService";
import CheckoutClient from "@/components/CheckoutClient";

export const revalidate = 0; 

export default async function Checkout() {
  const [locations, hours, whatsapp] = await Promise.all([
    getLocations(),
    getHours(),
    getSellerWhatsApp()
  ]);

  return (
    <CheckoutClient 
      locations={locations} 
      hours={hours} 
      whatsapp={whatsapp} 
    />
  );
}
