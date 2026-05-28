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
    customer_email = 'N/A',
    customer_phone = 'N/A',
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

  const itemsHtml = (cart || []).map(i => `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #e2ede4;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="left" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #0d1f10; line-height: 1.4;">
              <strong style="color: #1a6b40;">${i.qty || 0}&times;</strong> ${i.name || ''} <span style="color: #5a7a60; font-size: 14px;">(${i.variantLabel || ''})</span>
            </td>
            <td align="right" valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: bold; color: #0d1f10; padding-left: 10px;">
              $${Number((i.price || 0) * (i.qty || 0)).toFixed(2)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your Aquatic Emerald Order Confirmation</title>
  <style>
    body, table, td, a {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    table {
      border-collapse: collapse !important;
    }
    body {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f0f5f0;
      color: #0d1f10;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        padding-left: 10px !important;
        padding-right: 10px !important;
      }
      .stack-column {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        direction: ltr !important;
        box-sizing: border-box !important;
        padding-bottom: 15px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f5f0;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f5f0; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 10px 40px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="background-color: #ffffff; border-radius: 0 0 10px 10px; border: 1px solid rgba(26, 107, 64, 0.15); box-shadow: 0 4px 12px rgba(13, 31, 16, 0.03); overflow: hidden;">
          
          <tr>
            <td align="center" style="background-color: #ffffff; padding: 35px 40px 25px 40px; border-bottom: 1px solid #e2ede4;">
              <a href="https://aquaticemerald.com" target="_blank" style="text-decoration: none; display: inline-block;">
                <table border="0" cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 12px;">
                      <img src="https://aquaticemerald.com/logo.png" alt="Aquatic Emerald" width="45" height="45" style="display: block; border: 0;" onerror="this.style.display='none';">
                    </td>
                    <td style="vertical-align: middle;">
                      <img src="https://www.aquaticemerald.com/text.png" alt="Aquatic Emerald" width="198" height="24" style="display: block; border: 0; max-height: 24px; width: auto;">
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 24px; font-weight: bold; color: #1a6b40; line-height: 1.2; padding-bottom: 12px;">
                    Thank you for your order, ${customer_name}!
                  </td>
                </tr>
                <tr>
                  <td align="left" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #5a7a60; line-height: 1.6; padding-bottom: 25px;">
                    We are getting your aquatic treasures ready. Here are the details of your scheduled pickup. If you have any questions or need to make adjustments, please touch base with us directly below.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f5f0; border-radius: 8px; border: 1px solid #dce8dd;">
                <tr>
                  <td style="padding: 24px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td colspan="2" style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 18px; color: #1a6b40; font-weight: bold; padding-bottom: 16px; border-bottom: 1px solid rgba(26, 107, 64, 0.1);">
                          Order &amp; Pickup Overview
                        </td>
                      </tr>
                      
                      <tr>
                        <td width="30%" valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: bold; color: #5a7a60; text-transform: uppercase; letter-spacing: 0.5px; padding-top: 16px; padding-bottom: 8px;">
                          Order ID
                        </td>
                        <td width="70%" valign="top" style="font-family: 'Courier New', Courier, monospace; font-size: 14px; font-weight: bold; color: #0d1f10; padding-top: 16px; padding-bottom: 8px;">
                          ${orderRef || orderId}
                        </td>
                      </tr>

                      <tr>
                        <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: bold; color: #5a7a60; text-transform: uppercase; letter-spacing: 0.5px; padding-top: 8px; padding-bottom: 8px;">
                          Customer
                        </td>
                        <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #0d1f10; padding-top: 8px; padding-bottom: 8px;">
                          <strong>${customer_name}</strong><br>
                          <span style="color: #5a7a60; font-size: 13px;">${customer_email}</span> &bull; <span style="color: #5a7a60; font-size: 13px;">${customer_phone}</span>
                        </td>
                      </tr>

                      <tr>
                        <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: bold; color: #5a7a60; text-transform: uppercase; letter-spacing: 0.5px; padding-top: 8px; padding-bottom: 8px;">
                          Pickup
                        </td>
                        <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #0d1f10; padding-top: 8px; padding-bottom: 8px;">
                          <strong>${pickupName}</strong><br>
                          <span style="color: #5a7a60; font-size: 13px;">${pickupDetail}</span>
                        </td>
                      </tr>

                      <tr>
                        <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: bold; color: #5a7a60; text-transform: uppercase; letter-spacing: 0.5px; padding-top: 8px;">
                          Pickup Slot
                        </td>
                        <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #0d1f10; padding-top: 8px;">
                          <strong>${formattedPickupDate}</strong><br>
                          <span style="color: #1a6b40; font-size: 13px; font-weight: bold;">${formattedPickupTime}</span>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 40px 10px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 18px; color: #1a6b40; font-weight: bold; padding-bottom: 12px; border-bottom: 2px solid #e2ede4;">
                    Items In Your Order
                  </td>
                </tr>

                ${itemsHtml}

                <tr>
                  <td style="padding-top: 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="right" width="80%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #5a7a60; padding-bottom: 8px;">
                          Subtotal:
                        </td>
                        <td align="right" width="20%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #0d1f10; padding-bottom: 8px; font-weight: bold;">
                          $${Number(subtotal).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td align="right" style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 18px; color: #1a6b40; font-weight: bold; padding-top: 8px;">
                          Total Paid:
                        </td>
                        <td align="right" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 18px; color: #1a6b40; font-weight: bold; padding-top: 8px;">
                          $${Number(total).toFixed(2)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 40px 40px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px dashed #dce8dd; padding-top: 25px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 15px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #5a7a60; line-height: 1.5;">
                      Need to chat with us regarding your pickup time, location, or order? You can reach us quickly on WhatsApp!
                    </p>
                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" bgcolor="#1a6b40" style="border-radius: 6px;">
                          <a href="${sellerWaLink}" target="_blank" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: bold; color: #ffffff; text-decoration: none; display: inline-block; padding: 12px 30px; border-radius: 6px; border: 1px solid #1a6b40; letter-spacing: 0.3px;">
                            Reply on WhatsApp
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="background-color: #e8f0e9; padding: 30px 40px; text-align: center; border-top: 1px solid rgba(26, 107, 64, 0.15);">
              <p style="margin: 0 0 10px 0; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 16px; font-weight: bold; color: #1a6b40;">
                Aquatic Emerald
              </p>
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #5a7a60; line-height: 1.6;">
                Curated plants, shrimp &amp; snails for the discerning freshwater aquarist. Grown with care, organised pickups.
              </p>
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #7aab81;">
                &copy; ${currentYear} Aquatic Emerald. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
    customer_email = 'N/A',
    customer_phone = 'N/A',
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

  const itemsHtml = (cart || []).map(i => `
    <tr>
      <td style="padding: 14px 0; border-bottom: 1px solid #e2ede4;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="left" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #0d1f10;">
              <strong style="color: #1a6b40;">${i.qty || 0}&times;</strong> ${i.name || ''} <span style="color: #5a7a60; font-size: 13px;">(${i.variantLabel || ''})</span>
            </td>
            <td align="right" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; color: #0d1f10;">
              $${Number((i.price || 0) * (i.qty || 0)).toFixed(2)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>New Order Alert: #${orderRef || orderId}</title>
  <style>
    body, table, td, a {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    table {
      border-collapse: collapse !important;
    }
    body {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f0f5f0;
      color: #0d1f10;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        padding-left: 10px !important;
        padding-right: 10px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f5f0;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f5f0; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 10px 40px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="background-color: #ffffff; border-radius: 0 0 10px 10px; border: 1px solid rgba(26, 107, 64, 0.15); box-shadow: 0 4px 12px rgba(13, 31, 16, 0.03); overflow: hidden;">
          
          <tr>
            <td align="center" style="background-color: #ffffff; padding: 30px 40px 20px 40px; border-bottom: 1px solid #e2ede4;">
              <table border="0" cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td style="vertical-align: middle; padding-right: 12px;">
                    <img src="https://aquaticemerald.com/logo.png" alt="Aquatic Emerald" width="40" height="40" style="display: block; border: 0;">
                  </td>
                  <td style="vertical-align: middle;">
                    <img src="https://www.aquaticemerald.com/text.png" alt="Aquatic Emerald" width="165" height="20" style="display: block; border: 0;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 35px 40px 15px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 22px; font-weight: bold; color: #1a6b40; line-height: 1.2; padding-bottom: 8px;">
                    Hey! A new order has been placed
                  </td>
                </tr>
                <tr>
                  <td align="left" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #5a7a60; line-height: 1.5;">
                    ${customer_name} just completed an order. Below are the order summary, pickup window, and a quick link to message them directly on WhatsApp.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 10px 40px 25px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #e4efe6; border-radius: 8px; border: 1px solid #dce8dd; text-align: center;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #1a6b40; font-weight: bold;">
                      Need to coordinate or confirm the pickup details?
                    </p>
                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" bgcolor="#1a6b40" style="border-radius: 6px;">
                          <a href="${customerWaLink}" target="_blank" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; display: inline-block; padding: 10px 24px; border-radius: 6px; border: 1px solid #1a6b40; letter-spacing: 0.3px;">
                            Chat with ${customer_name} on WhatsApp
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f5f0; border-radius: 8px; border: 1px solid #dce8dd;">
                <tr>
                  <td style="padding: 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td colspan="2" style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 16px; color: #1a6b40; font-weight: bold; padding-bottom: 12px; border-bottom: 1px solid rgba(26, 107, 64, 0.1);">
                          Customer &amp; Logistics Overview
                        </td>
                      </tr>
                      
                      <tr>
                        <td width="35%" valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; font-weight: bold; color: #5a7a60; text-transform: uppercase; letter-spacing: 0.5px; padding-top: 12px; padding-bottom: 6px;">
                          Customer Name
                        </td>
                        <td width="65%" valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #0d1f10; padding-top: 12px; padding-bottom: 6px; font-weight: bold;">
                          ${customer_name}
                        </td>
                      </tr>

                      <tr>
                        <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; font-weight: bold; color: #5a7a60; text-transform: uppercase; letter-spacing: 0.5px; padding-top: 6px; padding-bottom: 6px;">
                          Phone Number
                        </td>
                        <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #0d1f10; padding-top: 6px; padding-bottom: 6px;">
                          <a href="tel:${customer_phone}" style="color: #1a6b40; text-decoration: underline; font-weight: bold;">${customer_phone}</a>
                        </td>
                      </tr>

                      <tr>
                        <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; font-weight: bold; color: #5a7a60; text-transform: uppercase; letter-spacing: 0.5px; padding-top: 6px; padding-bottom: 6px;">
                          Email Address
                        </td>
                        <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #0d1f10; padding-top: 6px; padding-bottom: 6px;">
                          <a href="mailto:${customer_email}" style="color: #1a6b40; text-decoration: none;">${customer_email}</a>
                        </td>
                      </tr>

                      <tr>
                        <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; font-weight: bold; color: #5a7a60; text-transform: uppercase; letter-spacing: 0.5px; padding-top: 6px; padding-bottom: 6px;">
                          Pickup Spot
                        </td>
                        <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #0d1f10; padding-top: 6px; padding-bottom: 6px; font-weight: bold;">
                          ${pickupName} ${pickupDetail ? '— ' + pickupDetail : ''}
                        </td>
                      </tr>

                      <tr>
                        <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; font-weight: bold; color: #5a7a60; text-transform: uppercase; letter-spacing: 0.5px; padding-top: 6px; padding-bottom: 6px;">
                          Scheduled Time
                        </td>
                        <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #1a6b40; padding-top: 6px; padding-bottom: 6px; font-weight: bold;">
                          ${formattedPickupDate} at ${formattedPickupTime}
                        </td>
                      </tr>

                      <tr>
                        <td valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; font-weight: bold; color: #5a7a60; text-transform: uppercase; letter-spacing: 0.5px; padding-top: 6px;">
                          Order ID
                        </td>
                        <td valign="top" style="font-family: 'Courier New', Courier, monospace; font-size: 13px; font-weight: bold; color: #0d1f10; padding-top: 6px;">
                          ${orderRef || orderId}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 10px 40px 30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 16px; color: #1a6b40; font-weight: bold; padding-bottom: 10px; border-bottom: 2px solid #e2ede4;">
                    Items Purchased
                  </td>
                </tr>

                ${itemsHtml}

                <tr>
                  <td style="padding-top: 12px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="text-align: right;">
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #5a7a60; padding-bottom: 4px;">
                          Subtotal:
                        </td>
                        <td width="20%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #0d1f10; font-weight: bold; padding-bottom: 4px;">
                          $${Number(subtotal).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 15px; color: #1a6b40; font-weight: bold; padding-top: 6px;">
                          Total Captured:
                        </td>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #1a6b40; font-weight: bold; padding-top: 6px;">
                          $${Number(total).toFixed(2)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="background-color: #e8f0e9; padding: 25px 40px; text-align: center; border-top: 1px solid rgba(26, 107, 64, 0.15);">
              <p style="margin: 0 0 5px 0; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 14px; font-weight: bold; color: #1a6b40;">
                Aquatic Emerald — Admin Dashboard
              </p>
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #7aab81;">
                This is an automated operational email sent directly to the store administrator.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
