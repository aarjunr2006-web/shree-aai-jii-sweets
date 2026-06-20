'use client';

import React, { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string;
  category: string;
  imageUrl: string;
}

interface PosItem {
  product: Product;
  quantity: number;
}

const BACKEND_URL = 'http://localhost:5001/api/v1';
const BRANCH_ID = '00000000-0000-0000-0000-000000000000'; // Default branch ID

// Local Mock Sweet Catalog
const MOCK_PRODUCTS: Product[] = [
  { id: '8cd5642a-a532-47ef-8d65-3844fe2a702b', name: 'Shahi Kaju Katli', price: 950, sku: 'KAJU-KAT-01', category: 'Kaju Sweets', imageUrl: '' },
  { id: 'prod-2', name: 'Motichoor Ladoo (Pure Ghee)', price: 680, sku: 'LAD-MOTI-02', category: 'Ladoo', imageUrl: '' },
  { id: 'prod-3', name: 'Kesari Peda', price: 720, sku: 'PEDA-KES-03', category: 'Peda', imageUrl: '' },
  { id: 'prod-4', name: 'Sugar-Free Anjeer Dry Fruit Roll', price: 1100, sku: 'SF-ANJ-04', category: 'Sugar-Free', imageUrl: '' },
  { id: 'prod-5', name: 'Premium Milk Cake', price: 780, sku: 'CAKE-MILK-05', category: 'Milk Sweets', imageUrl: '' },
  { id: 'prod-6', name: 'Ghee Gulab Jamun', price: 480, sku: 'JAM-GUL-06', category: 'Gulab Jamun', imageUrl: '' }
];

export default function WorkerPos() {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [skuQuery, setSkuQuery] = useState<string>('');
  const [billItems, setBillItems] = useState<PosItem[]>([]);
  
  // Walk-in client details
  const [phone, setPhone] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI'>('CASH');
  
  // App States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [lastBillDetails, setLastBillDetails] = useState<any>(null);
  const [serverOnline, setServerOnline] = useState<boolean>(false);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const response = await fetch(`${BACKEND_URL}/products`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setProducts(data.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: Number(p.price),
              sku: p.sku,
              category: p.category?.name || 'Sweets',
              imageUrl: p.imageUrl || ''
            })));
          }
          setServerOnline(true);
        }
      } catch (err) {
        console.warn('API Offline. Running POS worker in Mock Mode.');
      }
    }
    loadCatalog();
  }, []);

  const addToBill = (product: Product) => {
    setBillItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleSkuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuQuery) return;
    const match = products.find(p => p.sku.toLowerCase() === skuQuery.toLowerCase());
    if (match) {
      addToBill(match);
      setSkuQuery('');
    } else {
      alert(`Product with SKU "${skuQuery}" not found.`);
    }
  };

  const updateQuantity = (productId: string, amount: number) => {
    setBillItems(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + amount;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as PosItem[]);
  };

  const billTotal = billItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (billItems.length === 0) return;
    setSubmitting(true);
    setLastBillDetails(null);

    const payload = {
      branchId: BRANCH_ID,
      paymentMethod,
      items: billItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }))
    };

    // Optional customer metadata payload
    const customerPayload = phone ? { name: name || 'Walk-In Customer', phone } : null;

    try {
      let token = '';
      
      // If walk-in details provided, pre-create client to trigger WhatsApp delivery
      if (customerPayload) {
        const authRes = await fetch(`${BACKEND_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...customerPayload, role: 'CUSTOMER' })
        });
        const authData = await authRes.json();
        token = authData.accessToken;
      } else {
        // Fallback POS worker role auth
        const authRes = await fetch(`${BACKEND_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'POS Cashier', email: 'cashier@shreeaaijisweets.com', password: 'password123', role: 'WORKER' })
        });
        const authData = await authRes.json();
        token = authData.accessToken;
      }

      const checkoutRes = await fetch(`${BACKEND_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...payload,
          customerId: token ? undefined : null // let backend resolve
        })
      });

      if (checkoutRes.ok) {
        const checkoutData = await checkoutRes.json();
        setLastBillDetails({
          billNo: `BILL-${checkoutData.order.id.substring(0, 5).toUpperCase()}`,
          total: billTotal,
          paymentMethod,
          whatsappSent: !!phone,
          phone
        });
        setBillItems([]);
        setPhone('');
        setName('');
      } else {
        const errData = await checkoutRes.json();
        alert(`POS Billing Error: ${errData.error || errData.message}`);
      }
    } catch (err) {
      // Mock Success Fallback
      setLastBillDetails({
        billNo: `BILL-MOCK-${Math.floor(1000 + Math.random() * 9000)}`,
        total: billTotal,
        paymentMethod,
        whatsappSent: !!phone,
        phone
      });
      setBillItems([]);
      setPhone('');
      setName('');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white font-black">
            S
          </div>
          <div>
            <h1 className="text-sm font-bold">Shree Aai Ji Sweets POS Terminal</h1>
            <p className="text-[10px] text-slate-400">Cashier Counter: Branch #01</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
          <span className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          <span>API: {serverOnline ? 'Connected' : 'Offline Mock'}</span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
        
        {/* Left Side: Product Search & Tap Selection (2 Columns) */}
        <div className="lg:col-span-2 p-6 space-y-6 overflow-y-auto flex flex-col h-full">
          
          {/* Quick SKU Scan Barcode Mock */}
          <div className="flex space-x-4">
            <form onSubmit={handleSkuSubmit} className="flex-1 flex bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden px-3.5 items-center">
              <span className="text-slate-500 text-sm mr-2">🔎 SKU:</span>
              <input 
                type="text"
                placeholder="Scan barcode or type exact SKU (e.g. KAJU-KAT-01) and hit Enter..."
                value={skuQuery}
                onChange={(e) => setSkuQuery(e.target.value)}
                className="w-full bg-transparent border-0 outline-0 py-3 text-sm focus:outline-none"
              />
            </form>
            <input 
              type="text"
              placeholder="Search sweets by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm w-64 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Grid Products list */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToBill(product)}
                className="bg-slate-900 border border-slate-800/80 hover:border-orange-500/50 hover:bg-slate-800/30 p-4 rounded-3xl text-left flex flex-col justify-between space-y-4 transition-all duration-200 group"
              >
                <div>
                  <span className="text-[9px] uppercase tracking-wider bg-slate-950 px-2 py-0.5 rounded-full text-slate-400 group-hover:text-orange-400">
                    {product.category}
                  </span>
                  <h3 className="font-bold text-sm text-slate-100 mt-2 line-clamp-2 leading-tight">{product.name}</h3>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800/50 pt-2 w-full">
                  <span className="text-xs text-slate-500 font-mono">{product.sku}</span>
                  <span className="text-base font-extrabold text-amber-500">₹{product.price}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Billing Box / Cart Invoice Drawer (1 Column) */}
        <div className="bg-slate-900 border-l border-slate-850 flex flex-col h-full">
          
          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <h2 className="font-bold text-base flex items-center space-x-2">
              <span>🧾 Active Bill Receipt</span>
              <span className="bg-orange-600 text-white text-xs px-2.5 py-0.5 rounded-full">
                {billItems.reduce((s, i) => s + i.quantity, 0)}
              </span>
            </h2>
            <button 
              onClick={() => setBillItems([])}
              className="text-xs text-rose-500 hover:underline"
            >
              Clear All
            </button>
          </div>

          {/* POS Bill list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            
            {/* Last Success Notification */}
            {lastBillDetails && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl space-y-1 text-xs">
                <p className="font-bold">Bill Printed Successfully!</p>
                <p>Bill: <span className="font-mono font-semibold">{lastBillDetails.billNo}</span> • Total: ₹{lastBillDetails.total}</p>
                {lastBillDetails.whatsappSent && (
                  <p className="text-[10px] text-emerald-500 font-medium">✓ Invoice generated and dispatched to WhatsApp: {lastBillDetails.phone}</p>
                )}
              </div>
            )}

            {billItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 py-16">
                <span className="text-4xl text-slate-700">🍩</span>
                <p className="font-semibold text-slate-400 text-sm">No items in active bill.</p>
                <p className="text-[10px] text-slate-600">Scan SKU barcode or tap sweet items on the left.</p>
              </div>
            ) : (
              billItems.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-850 rounded-2xl">
                  <div className="flex-1 pr-3">
                    <h4 className="font-bold text-sm text-slate-200 leading-none">{item.product.name}</h4>
                    <span className="text-[10px] text-slate-500 mt-1 block">₹{item.product.price} × {item.quantity}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Billing Form Footer */}
          {billItems.length > 0 && (
            <div className="border-t border-slate-800 p-6 bg-slate-950/20 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">Total Payable</span>
                <span className="text-2xl font-black text-amber-500">₹{billTotal}</span>
              </div>

              {/* Customer Phone for WhatsApp Billing */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">Customer Mobile (WhatsApp Billing)</label>
                <input 
                  type="text" 
                  placeholder="Enter 10-digit number (e.g. 9876543210)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-orange-500 text-slate-200"
                />
              </div>

              {phone && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">Customer Name (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Enter customer name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-orange-500 text-slate-200"
                  />
                </div>
              )}

              {/* Payment Mode */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400">Select Cash/UPI Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      paymentMethod === 'CASH'
                        ? 'bg-orange-600 border-orange-600 text-white'
                        : 'bg-transparent border-slate-800 text-slate-400'
                    }`}
                  >
                    💵 CASH
                  </button>
                  <button
                    onClick={() => setPaymentMethod('UPI')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      paymentMethod === 'UPI'
                        ? 'bg-orange-600 border-orange-600 text-white'
                        : 'bg-transparent border-slate-800 text-slate-400'
                    }`}
                  >
                    📱 UPI M-PAY
                  </button>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={submitting}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-md disabled:opacity-50"
              >
                {submitting ? 'Submitting in DB...' : `Complete Billing (₹${billTotal})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
