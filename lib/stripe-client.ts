import Stripe from 'stripe';

export class StripeClient {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
  }

  // Payment Methods
  async createPaymentIntent(params: Stripe.PaymentIntentCreateParams): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.create(params);
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.confirm(paymentIntentId);
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  // Transfers for Connect accounts
  async createTransfer(params: Stripe.TransferCreateParams): Promise<Stripe.Transfer> {
    return await this.stripe.transfers.create(params);
  }

  // Connect Accounts
  async createAccount(params: Stripe.AccountCreateParams): Promise<Stripe.Account> {
    return await this.stripe.accounts.create(params);
  }

  async retrieveAccount(accountId: string): Promise<Stripe.Account> {
    return await this.stripe.accounts.retrieve(accountId);
  }

  async updateAccount(accountId: string, params: Stripe.AccountUpdateParams): Promise<Stripe.Account> {
    return await this.stripe.accounts.update(accountId, params);
  }

  // Account Links for onboarding
  async createAccountLink(params: Stripe.AccountLinkCreateParams): Promise<Stripe.AccountLink> {
    return await this.stripe.accountLinks.create(params);
  }

  // Customer management
  async createCustomer(params: Stripe.CustomerCreateParams): Promise<Stripe.Customer> {
    return await this.stripe.customers.create(params);
  }

  async retrieveCustomer(customerId: string): Promise<Stripe.Customer> {
    return await this.stripe.customers.retrieve(customerId);
  }

  // Balance and payouts
  async retrieveBalance(): Promise<Stripe.Balance> {
    return await this.stripe.balance.retrieve();
  }

  // Webhooks
  async constructEvent(payload: string, sigHeader: string, secret: string): Promise<Stripe.Event> {
    return this.stripe.webhooks.constructEvent(payload, sigHeader, secret);
  }

  // Invoices (for recurring billing)
  async createInvoice(params: Stripe.InvoiceCreateParams): Promise<Stripe.Invoice> {
    return await this.stripe.invoices.create(params);
  }

  // Subscriptions
  async createSubscription(params: Stripe.SubscriptionCreateParams): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.create(params);
  }

  // Refunds
  async createRefund(params: Stripe.RefundCreateParams): Promise<Stripe.Refund> {
    return await this.stripe.refunds.create(params);
  }

  // Disputes
  async retrieveDispute(disputeId: string): Promise<Stripe.Dispute> {
    return await this.stripe.disputes.retrieve(disputeId);
  }
}

export const stripeClient = new StripeClient();