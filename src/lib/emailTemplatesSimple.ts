type CartItem = { qty?: number; name?: string; variantLabel?: string; price?: number };

export function buildCustomerHtml(opts: {
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  orderRef?: string | number | null;
  orderId?: number | string | null;
  cart?: CartItem[];
  subtotal?: number;
  total?: number;
  pickupName?: string;
  pickupDetail?: string;
  formattedPickupDate?: string;
  formattedPickupTime?: string;
  sellerWaLink?: string;
  currentYear?: number;
}) {
  const {
    customer_name,
    orderRef,
    orderId,
    cart = [],
    subtotal = 0,
    total = 0,
    pickupName = 'N/A',
    pickupDetail = '',
    formattedPickupDate = 'N/A',
    formattedPickupTime = 'N/A',
    sellerWaLink = '#',
    currentYear = new Date().getFullYear(),
  } = opts;

  const itemsHtml = (cart || []).map(i => `- ${i.qty || 0} x ${i.name || ''} (${i.variantLabel || ''}): $${Number((i.price||0)*(i.qty||0)).toFixed(2)}`).join('\n');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Order ${orderRef||orderId}</title></head><body><h2>Thanks, ${customer_name}</h2><p>Order: <strong>${orderRef||orderId}</strong></p><pre>${itemsHtml}</pre><p>Pickup: ${pickupName} — ${pickupDetail}</p><p>${formattedPickupDate} at ${formattedPickupTime}</p><p>Subtotal: $${Number(subtotal).toFixed(2)} — Total: $${Number(total).toFixed(2)}</p><p><a href="${sellerWaLink}">Contact us on WhatsApp</a></p><footer>&copy; ${currentYear} Aquatic Emerald</footer></body></html>`;
}

export function buildSellerHtml(opts: {
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  orderRef?: string | number | null;
  orderId?: number | string | null;
  cart?: CartItem[];
  subtotal?: number;
  total?: number;
  pickupName?: string;
  pickupDetail?: string;
  formattedPickupDate?: string;
  formattedPickupTime?: string;
  customerWaLink?: string;
  currentYear?: number;
}) {
  const {
    customer_name,
    orderRef,
    orderId,
    cart = [],
    subtotal = 0,
    total = 0,
    pickupName = 'N/A',
    pickupDetail = '',
    formattedPickupDate = 'N/A',
    formattedPickupTime = 'N/A',
    customerWaLink = '#',
    currentYear = new Date().getFullYear(),
  } = opts;

  const itemsHtml = (cart || []).map(i => `- ${i.qty || 0} x ${i.name || ''} (${i.variantLabel || ''}): $${Number((i.price||0)*(i.qty||0)).toFixed(2)}`).join('\n');

  return `<!doctype html><html><head><meta charset="utf-8"><title>New order ${orderRef||orderId}</title></head><body><h2>New order from ${customer_name}</h2><p>Order: <strong>${orderRef||orderId}</strong></p><pre>${itemsHtml}</pre><p>Pickup: ${pickupName} — ${pickupDetail}</p><p>${formattedPickupDate} at ${formattedPickupTime}</p><p>Subtotal: $${Number(subtotal).toFixed(2)} — Total: $${Number(total).toFixed(2)}</p><p><a href="${customerWaLink}">Message customer on WhatsApp</a></p><footer>&copy; ${currentYear} Aquatic Emerald</footer></body></html>`;
}
