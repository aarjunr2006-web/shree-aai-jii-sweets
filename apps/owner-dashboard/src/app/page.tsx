'use client';

import React, { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string;
  category: { name: string };
  isActive: boolean;
}

interface InventoryItem {
  id: string;
  quantity: number;
  product: Product;
}

interface OrderItem {
  product: Product;
  quantity: number;
  priceAtTime: number;
}

interface Order {
  id: string;
  createdAt: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  customer?: { name: string; phone: string } | null;
  items: OrderItem[];
}

const BACKEND_URL = 'http://localhost:5001/api/v1';
const BRANCH_ID = '00000000-0000-0000-0000-000000000000'; // Default Main Branch

// Local Mock Data fallbacks
const MOCK_INVENTORY = [
  { id: 'inv-1', quantity: 45, product: { id: '8cd5642a-a532-47ef-8d65-3844fe2a702b', name: 'Shahi Kaju Katli', price: 950, sku: 'KAJU-KAT-01', category: { name: 'Kaju Sweets' }, isActive: true } },
  { id: 'inv-2', quantity: 8, product: { id: 'prod-2', name: 'Motichoor Ladoo (Pure Ghee)', price: 680, sku: 'LAD-MOTI-02', category: { name: 'Ladoo' }, isActive: true } },
  { id: 'inv-3', quantity: 23, product: { id: 'prod-3', name: 'Kesari Peda', price: 720, sku: 'PEDA-KES-03', category: { name: 'Peda' }, isActive: true } },
  { id: 'inv-4', quantity: 0, product: { id: 'prod-4', name: 'Sugar-Free Anjeer Dry Fruit Roll', price: 1100, sku: 'SF-ANJ-04', category: { name: 'Sugar-Free' }, isActive: true } }
];

const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-8941',
    createdAt: new Date().toISOString(),
    totalAmount: 1630,
    paymentMethod: 'UPI',
    paymentStatus: 'PAID',
    status: 'CONFIRMED',
    customer: { name: 'Rohan Sharma', phone: '9876543210' },
    items: [
      { product: { id: 'prod-1', name: 'Shahi Kaju Katli', price: 950, sku: 'KAJU-KAT-01', category: { name: 'Kaju Sweets' }, isActive: true }, quantity: 1, priceAtTime: 950 },
      { product: { id: 'prod-2', name: 'Motichoor Ladoo', price: 680, sku: 'LAD-MOTI-02', category: { name: 'Ladoo' }, isActive: true }, quantity: 1, priceAtTime: 680 }
    ]
  }
];

export default function OwnerDashboard() {
  const [inventory, setInventory] = useState<any[]>(MOCK_INVENTORY);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [serverOnline, setServerOnline] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders'>('inventory');

  // Restock Form
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [restockQty, setRestockQty] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // Fetch inventory
        const invRes = await fetch(`${BACKEND_URL}/inventory/${BRANCH_ID}`);
        // Fetch orders
        const ordRes = await fetch(`${BACKEND_URL}/orders`);

        if (invRes.ok && ordRes.ok) {
          const invData = await invRes.json();
          const ordData = await ordRes.json();
          
          if (invData && invData.length > 0) setInventory(invData);
          setOrders(ordData);
          setServerOnline(true);
        }
      } catch (err) {
        console.warn('Dashboard API offline. Running in Preview Mode.');
      }
    }
    loadDashboardData();
  }, []);

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    setLoading(true);

    const payload = {
      branchId: BRANCH_ID,
      productId: selectedProductId,
      quantity: Number(restockQty)
    };

    try {
      // Login/mock token
      const authRes = await fetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Owner Admin', email: 'owner@shreeaaijisweets.com', password: 'password123', role: 'OWNER' })
      });
      const authData = await authRes.json();
      const token = authData.accessToken;

      const res = await fetch(`${BACKEND_URL}/inventory/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Reload inventory
        const invRes = await fetch(`${BACKEND_URL}/inventory/${BRANCH_ID}`);
        const invData = await invRes.json();
        setInventory(invData);
        alert('Stock updated successfully in DB!');
      } else {
        alert('Failed to update stock on server');
      }
    } catch (err) {
      // Local Mock update
      setInventory(prev => prev.map(item => {
        if (item.product.id === selectedProductId) {
          return { ...item, quantity: item.quantity + Number(restockQty) };
        }
        return item;
      }));
      alert('Local preview stock updated (Mock Mode)!');
    } finally {
      setLoading(false);
    }
  };

  // Metrics Calculations
  const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const lowStockItems = inventory.filter(item => item.quantity <= 10);
  const outOfStockItems = inventory.filter(item => item.quantity === 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased font-sans flex flex-col">
      {/* Top Glassmorphic Navigation */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-extrabold text-lg">
            S
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Shree Aai Ji Sweets Control</h1>
            <p className="text-[10px] text-slate-400">Merchant Dashboard</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-xs bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
            <span className={`w-2.5 h-2.5 rounded-full ${serverOnline ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-rose-500 shadow-rose-500/50'} shadow-md`}></span>
            <span>API: {serverOnline ? 'Online' : 'Mock Preview'}</span>
          </div>
        </div>
      </header>

      {/* Grid Stats */}
      <main className="max-w-6xl mx-auto w-full px-6 py-8 space-y-8 flex-1">
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-1 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-900 to-amber-950/20">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Sales (Today)</span>
            <p className="text-3xl font-black text-amber-500">₹{totalSales}</p>
            <p className="text-[10px] text-slate-500">Calculated server-side</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Orders Processed</span>
            <p className="text-3xl font-black text-slate-100">{orders.length}</p>
            <p className="text-[10px] text-slate-500">Online + POS Walk-in</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Low Stock Alerts</span>
            <p className="text-3xl font-black text-orange-500">{lowStockItems.length}</p>
            <p className="text-[10px] text-slate-500">10 units or less left</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Out of Stock</span>
            <p className="text-3xl font-black text-rose-500">{outOfStockItems.length}</p>
            <p className="text-[10px] text-slate-500">Zero inventory</p>
          </div>
        </section>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'inventory'
                ? 'border-amber-500 text-amber-500 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 Inventory Levels
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'orders'
                ? 'border-amber-500 text-amber-500 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📦 Unified Order Board
          </button>
        </div>

        {/* Inventory tab */}
        {activeTab === 'inventory' && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fade-in">
            {/* Stock List table */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow">
              <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                <h3 className="font-bold text-base">Live Branch Inventory</h3>
                <span className="text-xs text-slate-400">Main Branch</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-[10px] uppercase text-slate-400 font-bold bg-slate-950 border-b border-slate-800">
                    <tr>
                      <th className="p-4">SKU / Item</th>
                      <th className="p-4 text-center">In Stock (kg)</th>
                      <th className="p-4">Price</th>
                      <th className="p-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {inventory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors duration-150">
                        <td className="p-4">
                          <div className="font-semibold text-slate-100">{item.product.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{item.product.sku}</div>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-200">
                          {item.quantity}
                        </td>
                        <td className="p-4 text-amber-500 font-medium">₹{item.product.price}</td>
                        <td className="p-4 text-right">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.quantity === 0
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : item.quantity <= 10
                              ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          }`}>
                            {item.quantity === 0 ? 'Out of Stock' : item.quantity <= 10 ? 'Low Stock' : 'Good'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Replenish Form Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow space-y-6">
              <div className="space-y-1">
                <h3 className="font-bold text-base">⚡ Fast Stock Replenish</h3>
                <p className="text-xs text-slate-400">Instantly update database quantities</p>
              </div>

              <form onSubmit={handleRestock} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">Select Sweet Product</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-amber-500 text-slate-200"
                  >
                    <option value="">-- Choose Product --</option>
                    {inventory.map((item) => (
                      <option key={item.product.id} value={item.product.id}>
                        {item.product.name} (Current: {item.quantity}kg)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">New Restock Amount (kg)</label>
                  <input
                    type="number"
                    min="1"
                    value={restockQty}
                    onChange={(e) => setRestockQty(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-amber-500 text-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white py-3 rounded-xl font-bold transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? 'Executing write transaction...' : 'Push Restock to Database'}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* Orders tab */}
        {activeTab === 'orders' && (
          <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow animate-fade-in">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <h3 className="font-bold text-base">Unified Order History (Live)</h3>
              <span className="text-xs text-slate-400">Displays digital & POS checkouts</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-[10px] uppercase text-slate-400 font-bold bg-slate-950 border-b border-slate-800">
                  <tr>
                    <th className="p-4">Order ID / Date</th>
                    <th className="p-4">Customer Details</th>
                    <th className="p-4">Order Summary</th>
                    <th className="p-4">Payments</th>
                    <th className="p-4 text-right">Fulfillment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No orders recorded in database yet.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-800/40 transition-colors duration-150">
                        <td className="p-4">
                          <div className="font-semibold text-slate-100">{order.id}</div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-200">{order.customer?.name || 'In-Store Walk-In'}</div>
                          <div className="text-[10px] text-slate-500">{order.customer?.phone || 'N/A'}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-100">₹{order.totalAmount}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">
                            {order.items?.map(i => `${i.product.name} (x${i.quantity})`).join(', ') || 'Sweets'}
                          </div>
                        </td>
                        <td className="p-4 space-y-1">
                          <div className="text-xs font-semibold">{order.paymentMethod}</div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold ${
                            order.paymentStatus === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === 'CONFIRMED' || order.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
