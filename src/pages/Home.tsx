import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Category } from '../types';
import { ProductCard } from '../components/ProductCard';
import { ChevronRight, ArrowRight, Zap, ShieldCheck, Truck, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export const Home: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [featuredRes, newRes, categoriesRes] = await Promise.all([
          supabase.from('products').select('*').eq('is_featured', true).limit(8),
          supabase.from('products').select('*').order('created_at', { ascending: false }).limit(8),
          supabase.from('categories').select('*').limit(6)
        ]);

        if (featuredRes.error) console.error('Featured Products Error:', featuredRes.error);
        if (newRes.error) console.error('New Arrivals Error:', newRes.error);
        if (categoriesRes.error) console.error('Categories Error:', categoriesRes.error);

        if (featuredRes.data) setFeaturedProducts(featuredRes.data);
        if (newRes.data) setNewArrivals(newRes.data);
        if (categoriesRes.data) setCategories(categoriesRes.data);
      } catch (err) {
        console.error('Unexpected error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden bg-slate-900 min-h-[400px] flex items-center">
        <div className="absolute inset-0 z-0 opacity-40">
          <img 
            src="https://picsum.photos/seed/hero/1200/600" 
            alt="Hero" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent"></div>
        </div>
        
        <div className="relative z-10 px-8 md:px-16 max-w-2xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 bg-orange-600/20 text-orange-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
          >
            <Zap className="h-3 w-3" />
            <span>Flash Sale is Live</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold text-white leading-tight"
          >
            Shop the Best <br />
            <span className="text-orange-600 text-glow">Deals in Nigeria</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-300 text-lg"
          >
            Quality products, unbeatable prices, and lightning-fast delivery across all states.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <Link to="/category/all" className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all flex items-center group">
              Shop Now
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-2xl font-bold hover:bg-white/20 transition-all">
              View Offers
            </button>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Fast Delivery</h4>
            <p className="text-xs text-slate-500">Nationwide shipping in 2-5 days</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Secure Payments</h4>
            <p className="text-xs text-slate-500">Bank transfer with proof upload</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <Star className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Quality Assured</h4>
            <p className="text-xs text-slate-500">100% authentic products only</p>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Shop by Category</h2>
            <p className="text-slate-500 text-sm">Find exactly what you're looking for</p>
          </div>
          <Link to="/categories" className="text-orange-600 font-bold text-sm flex items-center hover:underline">
            View All <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link 
              key={cat.id} 
              to={`/category/${cat.slug}`}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all text-center group"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                <img 
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${cat.name}&backgroundColor=f8fafc`} 
                  alt={cat.name} 
                  className="w-10 h-10"
                />
              </div>
              <span className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Featured Products</h2>
            <p className="text-slate-500 text-sm">Handpicked top quality items for you</p>
          </div>
          <Link to="/category/featured" className="text-orange-600 font-bold text-sm flex items-center hover:underline">
            See More <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.length > 0 ? (
            featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <p className="text-slate-500 italic">No featured products available yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">New Arrivals</h2>
            <p className="text-slate-500 text-sm">The latest additions to our store</p>
          </div>
          <Link to="/category/all" className="text-orange-600 font-bold text-sm flex items-center hover:underline">
            View All <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {newArrivals.length > 0 ? (
            newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <p className="text-slate-500 italic">No products available yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter / CTA */}
      <section className="bg-orange-600 rounded-3xl p-8 md:p-12 text-center text-white space-y-6">
        <h2 className="text-3xl md:text-4xl font-extrabold">Never Miss a Deal!</h2>
        <p className="text-orange-100 max-w-xl mx-auto">
          Join over 10,000+ shoppers and get exclusive access to flash sales, new arrivals, and special discounts.
        </p>
        <div className="flex flex-col sm:flex-row max-w-md mx-auto gap-3">
          <input 
            type="email" 
            placeholder="Enter your email" 
            className="flex-1 px-6 py-4 rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 outline-none"
          />
          <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all">
            Subscribe
          </button>
        </div>
      </section>
    </div>
  );
};
