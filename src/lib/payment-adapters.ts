import { Order, PaymentMethod } from '@/types';

export interface PaymentProcessResult {
  success: boolean;
  transactionId?: string;
  redirectUrl?: string;
  errorMessage?: string;
  instructions?: string;
}

export class PaymentAdapter {
  static async processPayment(
    method: PaymentMethod,
    order: Order,
    details?: { athPhone?: string; stripeToken?: string }
  ): Promise<PaymentProcessResult> {
    switch (method) {
      case 'STRIPE':
        return this.processStripe(order, details?.stripeToken);
      case 'PAYPAL':
        return this.processPayPal(order);
      case 'ATH_MOVIL':
        return this.processATHMovil(order, details?.athPhone);
      default:
        return { success: false, errorMessage: 'Método de pago no soportado.' };
    }
  }

  private static async processStripe(order: Order, _token?: string): Promise<PaymentProcessResult> {
    return {
      success: false,
      errorMessage: 'Stripe no está configurado. No se procesó ningún pago.',
    };
  }

  private static async processPayPal(order: Order): Promise<PaymentProcessResult> {
    return {
      success: false,
      errorMessage: 'PayPal no está configurado. No se procesó ningún pago.',
    };
  }

  private static async processATHMovil(order: Order, phone?: string): Promise<PaymentProcessResult> {
    const athPhoneConfig = process.env.ATH_MOBILE_PHONE || '787-000-0000';
    return {
      success: false,
      instructions: `Por favor completa tu pago por $${order.total_amount.toFixed(2)} en la app de ATH Móvil -> Negocios -> MY3D PR o envía el pago al teléfono ${athPhoneConfig} incluyendo la orden #${order.order_number} en el mensaje.`,
    };
  }
}
