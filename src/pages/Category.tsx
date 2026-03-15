import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product, Category } from '../types';
import { ProductCard } from '../components/ProductCard';
import { Filter, SlidersHorizontal, ChevronDown } from 'lucide-react';

export const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let query = supabase.from('products').select('*, categories(*)');
        
        if (slug && slug !== 'all' && slug !== 'featured') {
          const { data: cat, error: catError } = await supabase.from('categories').select('*').eq('slug', slug).single();
          if (catError) console.error('Category Fetch Error:', catError);
          if (cat) {
            setCategory(cat);
            query = query.eq('category_id', cat.id);
          }
        } else {
          setCategory(null);
          if (slug === 'featured') {
            query = query.eq('is_featured', true);
          }
        }

        if (sortBy === 'price-low') query = query.order('price', { ascending: true });
        else if (sortBy === 'price-high') query = query.order('price', { ascending: false });
        else query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) console.error('Products Fetch Error:', error);
        if (data) setProducts(data);
      } catch (err) {
        console.error('Unexpected error in CategoryPage:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [slug, sortBy]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 capitalize">
            {slug === 'all' ? 'All Products' : slug === 'featured' ? 'Featured Products' : category?.name || 'Category'}
          </h1>
          <p className="text-slate-500 text-sm">Showing {products.length} products</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-10 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
          <button className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold hover:bg-slate-50">
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-slate-100"></div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <p className="text-slate-500 italic">No products found in this category.</p>
        </div>
      )}
    </div>
  );
};
