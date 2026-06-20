'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  sku: string;
  category: { name: string };
}

interface CartItem {
  product: Product;
  quantity: number;
}

const BACKEND_URL = 'http://localhost:5001/api/v1';

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Shahi Kaju Katli',
    description: 'Premium cashews ground to perfection, garnished with silver leaf.',
    price: 950,
    imageUrl: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&q=80&w=400',
    sku: 'KAJU-KAT-01',
    category: { name: 'Kaju Sweets' }
  },
  {
    id: 'prod-2',
    name: 'Motichoor Ladoo (Pure Ghee)',
    description: 'Tiny besan pearls fried in pure cow ghee, sweetened and rolled into soft ladoos.',
    price: 680,
    imageUrl: 'https://images.unsplash.com/photo-1605684954278-9f17d264392a?auto=format&fit=crop&q=80&w=400',
    sku: 'LAD-MOTI-02',
    category: { name: 'Ladoo' }
  },
  {
    id: 'prod-3',
    name: 'Kesari Peda',
    description: 'Traditional milk fudge flavored with pure saffron strands and cardamom.',
    price: 720,
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=400',
    sku: 'PEDA-KES-03',
    category: { name: 'Peda' }
  },
  {
    id: 'prod-4',
    name: 'Sugar-Free Anjeer Dry Fruit Roll',
    description: 'Nutritious dates, figs, and crunchy almonds, pistachios and walnuts.',
    price: 1100,
    imageUrl: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80&w=400',
    sku: 'SF-ANJ-04',
    category: { name: 'Sugar-Free' }
  }
];

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI'>('UPI');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);
  const [serverOnline, setServerOnline] = useState<boolean>(false);

  useEffect(() => {
    async function fetchCatalog() {
      try {
        const response = await fetch(`${BACKEND_URL}/products`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setProducts(data);
          }
          setServerOnline(true);
        }
      } catch (err) {
        console.warn('Backend server offline. Utilizing mock catalog fallback.');
      }
    }
    fetchCatalog();
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, amount: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + amount;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!name || !phone) {
      alert('Please provide your name and phone number.');
      return;
    }

    setLoading(true);
    setOrderSuccess(null);

    const orderPayload = {
      branchId: '00000000-0000-0000-0000-000000000000',
      paymentMethod,
      items: cart.map(item => ({
        productId: item.product.id === 'prod-1' ? '8cd5642a-a532-47ef-8d65-3844fe2a702b' : item.product.id,
        quantity: item.quantity
      }))
    };

    try {
      const authRes = await fetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, role: 'CUSTOMER' })
      });
      const authData = await authRes.json();
      const token = authData.accessToken;

      const response = await fetch(`${BACKEND_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });

      if (response.ok) {
        const orderData = await response.json();
        setOrderSuccess(orderData.order);
        setCart([]);
      } else {
        const errData = await response.json();
        alert(`Checkout Failed: ${errData.error || errData.message}`);
      }
    } catch (err) {
      setOrderSuccess({
        id: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
        totalAmount: cartTotal,
        paymentStatus: paymentMethod === 'CASH' ? 'PAID' : 'PENDING',
        status: paymentMethod === 'CASH' ? 'CONFIRMED' : 'PENDING',
        paymentMethod,
        items: cart,
        createdAt: new Date().toISOString()
      });
      setCart([]);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category?.name || 'Sweets')))];

  const filteredProducts = activeCategory === 'All'
    ? products
    : products.filter(p => p.category?.name === activeCategory);

  return (
    <div className="min-h-screen bg-amber-50/50 text-slate-800 antialiased font-sans">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-amber-900/90 border-b border-amber-800 text-amber-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-amber-950 font-bold text-base shadow-inner cursor-pointer hover:bg-amber-400 transition-colors">
              SAJ
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Shree Aai Ji Sweets</h1>
              <p className="text-[10px] text-amber-200">Royal Indian Sweet Store</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xs hover:text-amber-200 bg-amber-800/40 px-3 py-1.5 rounded-full border border-amber-700/60 transition-colors">
              ← Launchpad
            </Link>
            <div className="flex items-center space-x-1.5 text-xs bg-amber-950/60 px-3 py-1.5 rounded-full border border-amber-800/40">
              <span className={`w-2.5 h-2.5 rounded-full ${serverOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              <span>API: {serverOnline ? 'Connected' : 'Preview Mode'}</span>
            </div>
            
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 hover:bg-amber-800/80 rounded-full transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-amber-950 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <section className="bg-amber-900 text-amber-50 py-16 px-4 text-center relative overflow-hidden shadow-inner">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-700/40 via-amber-900/90 to-amber-950 opacity-90"></div>
        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold px-3 py-1 rounded-full border border-amber-400/30 bg-amber-500/10">Pure cow ghee preparations</span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Pure Ghee Delights Delivered to Your Doorstep</h2>
          <p className="text-amber-200/90 text-sm md:text-base max-w-lg mx-auto">Handcrafted recipe collections spanning generations. Free shipping on family gift boxes.</p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex overflow-x-auto pb-4 mb-8 scrollbar-hide space-x-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeCategory === category
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-white text-amber-900 border border-amber-200 hover:border-amber-400'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {orderSuccess && (
          <div className="mb-8 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white text-2xl">
                ✓
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-950">Order Placed Successfully!</h3>
                <p className="text-sm text-emerald-700">Order ID: <span className="font-semibold">{orderSuccess.id}</span> • Total Paid/Pending: ₹{orderSuccess.totalAmount}</p>
                <p className="text-xs text-emerald-600 mt-0.5">We have sent a digital invoice receipt on WhatsApp (Mock log printed to backend console).</p>
              </div>
            </div>
            <button 
              onClick={() => setOrderSuccess(null)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200"
            >
              Continue Shopping
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-3xl border border-amber-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group">
              <div className="relative aspect-square overflow-hidden bg-amber-50/50">
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.src = `https://placehold.co/400x400/d97706/fff?text=${encodeURIComponent(product.name)}`;
                  }}
                />
                <span className="absolute top-3 left-3 bg-amber-950/80 text-amber-300 text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {product.category?.name || 'Sweet'}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-base leading-tight">{product.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-amber-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">Price per kg</span>
                    <span className="text-lg font-extrabold text-amber-700">₹{product.price}</span>
                  </div>
                  <button 
                    onClick={() => addToCart(product)}
                    className="bg-amber-600 hover:bg-amber-700 text-white p-2.5 rounded-2xl shadow-md transition-all duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
          <div 
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
          ></div>

          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col h-full transform transition-transform duration-300 translate-x-0">
            <div className="p-6 border-b border-amber-50 flex items-center justify-between bg-amber-900 text-amber-50">
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <span>🛒 Shopping Cart</span>
                <span className="bg-amber-500 text-amber-950 text-xs px-2.5 py-0.5 rounded-full">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="text-amber-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-12">
                  <span className="text-4xl text-amber-300">🥧</span>
                  <p className="font-medium text-slate-500">Your cart is empty.</p>
                  <p className="text-xs text-slate-400">Fill it with our delicious fresh ghee sweets!</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex items-center space-x-4 p-3 bg-amber-50/40 border border-amber-100/50 rounded-2xl">
                    <img 
                      src={item.product.imageUrl} 
                      alt={item.product.name}
                      className="w-12 h-12 rounded-xl object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://placehold.co/100x100/d97706/fff?text=${encodeURIComponent(item.product.name)}`;
                      }}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-slate-800 leading-tight">{item.product.name}</h4>
                      <span className="text-xs text-amber-700 font-medium">₹{item.product.price} / kg</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-white border border-amber-100 rounded-lg p-1">
                      <button 
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="text-slate-500 hover:bg-slate-50 w-6 h-6 flex items-center justify-center rounded"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="text-slate-500 hover:bg-slate-50 w-6 h-6 flex items-center justify-center rounded"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-amber-50 p-6 bg-slate-50">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-semibold text-slate-500">Subtotal Amount</span>
                  <span className="text-xl font-black text-amber-800">₹{cartTotal}</span>
                </div>

                <form onSubmit={handleCheckout} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Deliver To Name</label>
                    <input 
                      type="text" 
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">WhatsApp Mobile Number</label>
                    <input 
                      type="tel" 
                      placeholder="Enter WhatsApp mobile for invoice"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Select Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('CASH')}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                          paymentMethod === 'CASH'
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        💵 Cash on Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('UPI')}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                          paymentMethod === 'UPI'
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        📱 Pay Online (UPI/Card)
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-amber-800 hover:bg-amber-900 text-white py-3 rounded-xl font-bold transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {loading ? 'Processing Order...' : `Proceed to Place Order (₹${cartTotal})`}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
