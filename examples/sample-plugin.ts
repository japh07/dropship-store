import { definePlugin, PluginSDK } from '@/lib/plugin-sdk';

// Example Analytics Plugin
export const analyticsPlugin = definePlugin(
  {
    id: 'analytics-plugin',
    name: 'Advanced Analytics',
    version: '1.0.0',
    permissions: ['analytics.track', 'storage.read', 'storage.write'],
    debug: true
  },
  async (sdk: PluginSDK) => {
    sdk.dev.log('Analytics plugin starting up...');

    // Initialize analytics storage
    await sdk.storage.set('analytics:config', {
      trackPageViews: true,
      trackClicks: true,
      trackPurchases: true,
      endpoint: 'https://api.analytics.example.com/events'
    });

    // Track page views
    sdk.events.on('page:view', (data) => {
      sdk.analytics.track('page_view', {
        url: data.url,
        title: data.title,
        timestamp: new Date().toISOString()
      });
    });

    // Track cart events
    sdk.cart.onItemAdded((item) => {
      sdk.analytics.track('cart_item_added', {
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      });
    });

    // Track product views
    sdk.events.on('product:view', (data) => {
      sdk.analytics.track('product_view', {
        productId: data.productId,
        productName: data.productName,
        price: data.price
      });
    });

    // Setup periodic data sync
    const syncInterval = setInterval(async () => {
      await syncAnalyticsData(sdk);
    }, 60000); // Sync every minute

    // Cleanup on unload
    sdk.events.on('plugin:unload', () => {
      clearInterval(syncInterval);
      sdk.dev.log('Analytics plugin cleaned up');
    });

    sdk.ui.notify('Analytics plugin loaded successfully', 'success');
  }
);

// Example Product Recommendations Plugin
export const recommendationPlugin = definePlugin(
  {
    id: 'recommendation-plugin',
    name: 'Smart Product Recommendations',
    version: '1.0.0',
    permissions: ['storage.read', 'storage.write', 'api.external'],
    debug: true
  },
  async (sdk: PluginSDK) => {
    sdk.dev.log('Recommendation plugin starting up...');

    // Track user behavior
    const trackBehavior = async (action: string, productId: string) => {
      const behavior = await sdk.storage.get('user:behavior') || [];
      behavior.push({
        action,
        productId,
        timestamp: new Date().toISOString()
      });

      // Keep only last 100 actions
      if (behavior.length > 100) {
        behavior.splice(0, behavior.length - 100);
      }

      await sdk.storage.set('user:behavior', behavior);
    };

    // Get product recommendations
    const getRecommendations = async (): Promise<string[]> => {
      try {
        const behavior = await sdk.storage.get('user:behavior') || [];
        const recentProducts = behavior.slice(-10).map(b => b.productId);

        if (recentProducts.length === 0) {
          return [];
        }

        // Call recommendation API
        const response = await sdk.api.post('/recommendations', {
          productIds: recentProducts,
          limit: 5
        });

        return response.recommendations || [];
      } catch (error) {
        sdk.dev.error('Failed to get recommendations', error as Error);
        return [];
      }
    };

    // Register event listeners
    sdk.events.on('product:view', (data) => {
      trackBehavior('view', data.productId);
    });

    sdk.events.on('cart:itemAdded', (data) => {
      trackBehavior('add_to_cart', data.productId);
    });

    // Provide recommendations endpoint
    sdk.events.on('recommendations:get', async () => {
      const recommendations = await getRecommendations();
      return recommendations;
    });

    sdk.ui.notify('Recommendation plugin loaded', 'success');
  }
);

// Example Currency Converter Plugin
export const currencyPlugin = definePlugin(
  {
    id: 'currency-plugin',
    name: 'Currency Converter',
    version: '1.0.0',
    permissions: ['api.external', 'storage.read', 'storage.write'],
    debug: true
  },
  async (sdk: PluginSDK) => {
    sdk.dev.log('Currency plugin starting up...');

    // Exchange rates cache
    const EXCHANGE_RATES_KEY = 'currency:rates';
    const SELECTED_CURRENCY_KEY = 'currency:selected';

    // Get exchange rates
    const getExchangeRates = async () => {
      try {
        const cached = await sdk.storage.get(EXCHANGE_RATES_KEY);

        // Check if cache is still valid (1 hour)
        if (cached && cached.timestamp > Date.now() - 3600000) {
          return cached.rates;
        }

        // Fetch fresh rates
        const response = await sdk.api.get('https://api.exchangerate-api.com/v4/latest/USD');

        await sdk.storage.set(EXCHANGE_RATES_KEY, {
          rates: response.rates,
          timestamp: Date.now()
        });

        return response.rates;
      } catch (error) {
        sdk.dev.error('Failed to get exchange rates', error as Error);
        return null;
      }
    };

    // Convert currency
    const convertCurrency = async (amount: number, fromCurrency: string, toCurrency: string) => {
      if (fromCurrency === toCurrency) return amount;

      const rates = await getExchangeRates();
      if (!rates) return amount;

      // Convert to USD first, then to target currency
      const usdAmount = fromCurrency === 'USD' ? amount : amount / rates[fromCurrency];
      const convertedAmount = toCurrency === 'USD' ? usdAmount : usdAmount * rates[toCurrency];

      return Math.round(convertedAmount * 100) / 100;
    };

    // Register currency conversion service
    sdk.events.on('currency:convert', async (data) => {
      const { amount, fromCurrency, toCurrency } = data;
      const converted = await convertCurrency(amount, fromCurrency, toCurrency);
      return { amount: converted, fromCurrency, toCurrency };
    });

    // Format currency with selected currency
    sdk.events.on('currency:format', async (data) => {
      const { amount, currency } = data;
      const selectedCurrency = await sdk.storage.get(SELECTED_CURRENCY_KEY) || 'USD';

      if (currency === selectedCurrency) {
        return sdk.utils.formatCurrency(amount, selectedCurrency);
      }

      const converted = await convertCurrency(amount, currency, selectedCurrency);
      return sdk.utils.formatCurrency(converted, selectedCurrency);
    });

    // Currency selector UI
    const showCurrencySelector = () => {
      const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

      currencies.forEach(currency => {
        sdk.events.on(`currency:select:${currency}`, async () => {
          await sdk.storage.set(SELECTED_CURRENCY_KEY, currency);
          sdk.ui.notify(`Currency changed to ${currency}`, 'success');
          sdk.events.emit('currency:changed', { currency });
        });
      });
    };

    showCurrencySelector();

    sdk.ui.notify('Currency plugin loaded', 'success');
  }
);

// Example Customer Loyalty Plugin
export const loyaltyPlugin = definePlugin(
  {
    id: 'loyalty-plugin',
    name: 'Customer Loyalty Program',
    version: '1.0.0',
    permissions: ['storage.read', 'storage.write', 'analytics.track'],
    debug: true
  },
  async (sdk: PluginSDK) => {
    sdk.dev.log('Loyalty plugin starting up...');

    // Loyalty configuration
    const LOYALTY_CONFIG = {
      pointsPerDollar: 10,
      bronzeThreshold: 0,
      silverThreshold: 1000,
      goldThreshold: 5000,
      birthdayBonus: 100,
      referralBonus: 500
    };

    // Calculate customer tier
    const calculateTier = (points: number): { tier: string; benefits: string[] } => {
      if (points >= LOYALTY_CONFIG.goldThreshold) {
        return {
          tier: 'gold',
          benefits: ['3% cashback', 'Free shipping', 'Early access to sales', 'Exclusive products']
        };
      } else if (points >= LOYALTY_CONFIG.silverThreshold) {
        return {
          tier: 'silver',
          benefits: ['2% cashback', 'Free shipping', 'Early access to sales']
        };
      } else {
        return {
          tier: 'bronze',
          benefits: ['1% cashback', 'Birthday discount']
        };
      }
    };

    // Award points for purchases
    sdk.events.on('order:completed', async (data) => {
      const points = Math.floor(data.total * LOYALTY_CONFIG.pointsPerDollar);
      const currentPoints = await sdk.storage.get('loyalty:points') || 0;
      const newPoints = currentPoints + points;

      await sdk.storage.set('loyalty:points', newPoints);
      const { tier } = calculateTier(newPoints);
      await sdk.storage.set('loyalty:tier', tier);

      sdk.analytics.track('loyalty_points_earned', {
        points,
        totalPoints: newPoints,
        tier,
        orderId: data.orderId
      });

      sdk.ui.notify(`You earned ${points} loyalty points!`, 'success');
    });

    // Get loyalty status
    sdk.events.on('loyalty:status', async () => {
      const points = await sdk.storage.get('loyalty:points') || 0;
      const tierInfo = calculateTier(points);

      return {
        points,
        tier: tierInfo.tier,
        benefits: tierInfo.benefits,
        nextTier: tierInfo.tier === 'bronze' ? {
          name: 'silver',
          pointsRequired: LOYALTY_CONFIG.silverThreshold,
          progress: (points / LOYALTY_CONFIG.silverThreshold) * 100
        } : tierInfo.tier === 'silver' ? {
          name: 'gold',
          pointsRequired: LOYALTY_CONFIG.goldThreshold,
          progress: (points / LOYALTY_CONFIG.goldThreshold) * 100
        } : null
      };
    });

    // Redeem points for discount
    sdk.events.on('loyalty:redeem', async (data) => {
      const points = await sdk.storage.get('loyalty:points') || 0;
      const discount = Math.floor(data.points / 100) * 5; // 100 points = $5 discount

      if (points >= data.points) {
        await sdk.storage.set('loyalty:points', points - data.points);

        sdk.analytics.track('loyalty_points_redeemed', {
          pointsRedeemed: data.points,
          discount,
          remainingPoints: points - data.points
        });

        sdk.ui.notify(`${data.points} points redeemed for $${discount} discount!`, 'success');
        return { discount, pointsRemaining: points - data.points };
      } else {
        sdk.ui.notify('Insufficient points', 'error');
        return null;
      }
    });

    // Birthday bonus
    sdk.events.on('customer:birthday', async () => {
      const points = await sdk.storage.get('loyalty:points') || 0;
      await sdk.storage.set('loyalty:points', points + LOYALTY_CONFIG.birthdayBonus);

      sdk.ui.notify(`Happy Birthday! You received ${LOYALTY_CONFIG.birthdayBonus} bonus points!`, 'success');
      sdk.analytics.track('loyalty_birthday_bonus', {
        bonusPoints: LOYALTY_CONFIG.birthdayBonus
      });
    });

    sdk.ui.notify('Loyalty plugin loaded', 'success');
  }
);

// Example Abandoned Cart Recovery Plugin
export const abandonedCartPlugin = definePlugin(
  {
    id: 'abandoned-cart-plugin',
    name: 'Abandoned Cart Recovery',
    version: '1.0.0',
    permissions: ['storage.read', 'storage.write', 'cart.access'],
    debug: true
  },
  async (sdk: PluginSDK) => {
    sdk.dev.log('Abandoned cart plugin starting up...');

    const CART_ABANDONED_KEY = 'cart:abandoned';
    const REMINDER_SENT_KEY = 'cart:reminder_sent';

    // Monitor cart changes
    let cartTimer: NodeJS.Timeout | null = null;

    const startAbandonmentTimer = () => {
      if (cartTimer) {
        clearTimeout(cartTimer);
      }

      cartTimer = setTimeout(async () => {
        await handleCartAbandonment();
      }, 1800000); // 30 minutes
    };

    const handleCartAbandonment = async () => {
      try {
        const cartItems = await sdk.cart.getItems();

        if (cartItems.length > 0) {
          const abandonedData = {
            items: cartItems,
            total: await sdk.cart.getTotal(),
            timestamp: new Date().toISOString()
          };

          await sdk.storage.set(CART_ABANDONED_KEY, abandonedData);

          sdk.analytics.track('cart_abandoned', {
            itemCount: cartItems.length,
            totalValue: abandonedData.total
          });

          // Schedule reminder emails
          scheduleReminders(abandonedData);
        }
      } catch (error) {
        sdk.dev.error('Failed to handle cart abandonment', error as Error);
      }
    };

    const scheduleReminders = async (abandonedData: any) => {
      // 1-hour reminder
      setTimeout(async () => {
        const reminderSent = await sdk.storage.get(REMINDER_SENT_KEY) || {};
        if (!reminderSent.oneHour) {
          await sendReminder('1hour', abandonedData);
          reminderSent.oneHour = true;
          await sdk.storage.set(REMINDER_SENT_KEY, reminderSent);
        }
      }, 3600000);

      // 24-hour reminder with discount
      setTimeout(async () => {
        const reminderSent = await sdk.storage.get(REMINDER_SENT_KEY) || {};
        if (!reminderSent.twentyFourHours) {
          await sendReminder('24hours', abandonedData, 10); // 10% discount
          reminderSent.twentyFourHours = true;
          await sdk.storage.set(REMINDER_SENT_KEY, reminderSent);
        }
      }, 86400000);
    };

    const sendReminder = async (type: string, abandonedData: any, discount?: number) => {
      const templates = {
        '1hour': {
          subject: 'Did you forget something?',
          message: `You have ${abandonedData.items.length} items in your cart worth ${sdk.utils.formatCurrency(abandonedData.total)}. Complete your order before items sell out!`
        },
        '24hours': {
          subject: discount ? 'Complete your order with 10% off!' : 'Your cart expires soon',
          message: discount
            ? `Complete your order now and get 10% off! Your cart total is now ${sdk.utils.formatCurrency(abandonedData.total * 0.9)}.`
            : `Your cart with ${abandonedData.items.length} items worth ${sdk.utils.formatCurrency(abandonedData.total)} expires soon.`
        }
      };

      const template = templates[type as keyof typeof templates];

      sdk.analytics.track('cart_recovery_email_sent', {
        type,
        itemCount: abandonedData.items.length,
        totalValue: abandonedData.total,
        discount: discount || 0
      });

      // In a real implementation, this would send an actual email
      sdk.dev.log(`Cart recovery email sent`, {
        type,
        subject: template.subject,
        message: template.message,
        discount
      });
    };

    // Monitor cart events
    sdk.cart.onItemAdded(() => {
      startAbandonmentTimer();
      sdk.storage.delete(REMINDER_SENT_KEY); // Reset reminders when cart changes
    });

    sdk.cart.onItemRemoved(() => {
      startAbandonmentTimer();
    });

    // Clear abandonment data when cart is completed
    sdk.events.on('order:completed', () => {
      sdk.storage.delete(CART_ABANDONED_KEY);
      sdk.storage.delete(REMINDER_SENT_KEY);
      if (cartTimer) {
        clearTimeout(cartTimer);
        cartTimer = null;
      }
    });

    sdk.ui.notify('Abandoned cart recovery plugin loaded', 'success');
  }
);

// Export all example plugins
export const examplePlugins = [
  analyticsPlugin,
  recommendationPlugin,
  currencyPlugin,
  loyaltyPlugin,
  abandonedCartPlugin
];