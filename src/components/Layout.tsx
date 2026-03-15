import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, Search, LogOut, ChevronDown } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'react-hot-toast';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { cart } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    fetchCategories();

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Toaster position="top-center" />
      
      {/* Top Bar */}
      <div className="bg-orange-600 text-white py-2 px-4 text-center text-xs font-medium tracking-wide uppercase">
        Free Delivery on orders over ₦50,000 in Lagos!
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">Z</span>
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900 hidden sm:block">
                ZAMS<span className="text-orange-600">Mart</span>
              </span>
            </Link>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search products, categories..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-orange-500 transition-all"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Actions */}
            <nav className="flex items-center space-x-4 sm:space-x-6">
              <Link to="/cart" className="relative p-2 text-slate-600 hover:text-orange-600 transition-colors">
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              {user ? (
                <div className="relative group">
                  <button className="flex items-center space-x-1 text-slate-600 hover:text-orange-600 transition-colors">
                    <User className="h-6 w-6" />
                    <span className="text-sm font-medium hidden sm:block">{profile?.full_name?.split(' ')[0] || 'Account'}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    {profile?.role === 'admin' && (
                      <Link to="/admin" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Admin Dashboard</Link>
                    )}
                    <Link to="/orders" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">My Orders</Link>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50">Logout</button>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="text-sm font-semibold text-slate-900 hover:text-orange-600 transition-colors">
                  Login
                </Link>
              )}

              <button 
                className="md:hidden p-2 text-slate-600"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </nav>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-slate-100 overflow-hidden"
            >
              <div className="px-4 py-4 space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Link to="/category/all" className="p-3 bg-slate-50 rounded-lg text-center text-sm font-medium">All Products</Link>
                  {categories.slice(0, 3).map(cat => (
                    <Link key={cat.id} to={`/category/${cat.slug}`} className="p-3 bg-slate-50 rounded-lg text-center text-sm font-medium">{cat.name}</Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Z</span>
                </div>
                <span className="text-xl font-bold text-white tracking-tight">
                  ZAMS Mart
                </span>
              </div>
              <p className="text-sm leading-relaxed">
                Your one-stop shop for all quality products in Nigeria. Fast delivery, best prices.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Shop</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/category/all" className="hover:text-white transition-colors">All Products</Link></li>
                {categories.slice(0, 4).map(cat => (
                  <li key={cat.id}><Link to={`/category/${cat.slug}`} className="hover:text-white transition-colors">{cat.name}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link to="/shipping" className="hover:text-white transition-colors">Shipping Info</Link></li>
                <li><Link to="/returns" className="hover:text-white transition-colors">Returns & Refunds</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Newsletter</h4>
              <p className="text-sm mb-4">Subscribe to get special offers and once-in-a-lifetime deals.</p>
              <div className="flex">
                <input type="email" placeholder="Email address" className="bg-slate-800 border-none rounded-l-lg px-4 py-2 text-sm w-full focus:ring-1 focus:ring-orange-500" />
                <button className="bg-orange-600 text-white px-4 py-2 rounded-r-lg text-sm font-semibold hover:bg-orange-700 transition-colors">Join</button>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-xs">
            <p>&copy; {new Date().getFullYear()} ZAMS Mart. All rights reserved. Built for Nigeria with ❤️</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
