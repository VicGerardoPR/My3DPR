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
    void order;
    void _token;
    return {
      success: false,
      errorMessage: 'Stripe no está configurado. No se procesó ningún pago.',
    };
  }

  private static async processPayPal(order: Order): Promise<PaymentProcessResult> {
    void order;
    return {
      success: false,
      errorMessage: 'PayPal no está configurado. No se procesó ningún pago.',
    };
  }

  private static async processATHMovil(order: Order, phone?: string): Promise<PaymentProcessResult> {
    void order;
    void phone;
    return {
      success: false,
      errorMessage: 'ATH Móvil no está configurado. No se procesó ningún pago.',
    };
  }
}
