'use client';

import { AdminDashboard } from '@/components/admin/dashboard';
import { VRMProvider, useVRM } from '@/hooks/use-vrm';
import { CRMProvider, useCRM } from '@/hooks/use-crm';
import { PluginProvider, usePlugin } from '@/hooks/use-plugin';

export default function AdminPage() {
  // Mock data for demonstration
  const mockStoreMetrics = {
    revenue: {
      total: 245680,
      today: 2340,
      thisWeek: 12450,
      thisMonth: 45680,
      growth: 12.5
    },
    orders: {
      total: 1245,
      today: 23,
      thisWeek: 145,
      thisMonth: 623,
      averageValue: 156.80
    },
    customers: {
      total: 3456,
      new: 123,
      active: 2341,
      returning: 1115
    },
    products: {
      total: 234,
      topSelling: [],
      lowStock: []
    },
    plugins: {
      installed: 8,
      active: 7,
      updates: 2,
      errors: 1
    }
  };

  const mockRecentActivity = [
    {
      id: '1',
      type: 'order' as const,
      title: 'New order #1234',
      description: 'Customer John Doe placed an order for $234.50',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      status: 'success' as const
    },
    {
      id: '2',
      type: 'plugin' as const,
      title: 'Plugin update available',
      description: 'Analytics Plugin v2.1.0 is ready to install',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      status: 'info' as const
    },
    {
      id: '3',
      type: 'customer' as const,
      title: 'New customer registered',
      description: 'Jane Smith joined the store',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      status: 'success' as const
    },
    {
      id: '4',
      type: 'vendor' as const,
      title: 'Vendor performance alert',
      description: 'Vendor ABC Electronics shows declining performance',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      status: 'warning' as const
    }
  ];

  const handleRefresh = () => {
    console.log('Refreshing dashboard data...');
    // Implement refresh logic
  };

  return (
    <div>
      <PluginProvider>
        <CRMProvider>
          <VRMProvider>
            <AdminDashboard
              storeMetrics={mockStoreMetrics}
              recentActivity={mockRecentActivity}
              onRefresh={handleRefresh}
            />
          </VRMProvider>
        </CRMProvider>
      </PluginProvider>
    </div>
  );
}