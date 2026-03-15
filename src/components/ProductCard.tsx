import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { motion } from 'motion/react';
import { Product } from '../types';
import toast from 'react-hot-toast';

export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast.success(`${product.name} added to cart!`, {
      icon: '🛒',
      style: {
        borderRadius: '12px',
        background: '#333',
        color: '#fff',
      },
    });
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all group"
    >
      <Link to={`/product/${product.id}`}>
        <div className="relative aspect-square overflow-hidden bg-slate-100">
          <img
            src={product.image_url || 'https://picsum.photos/seed/product/400/400'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          {product.is_featured && (
            <div className="absolute top-3 left-3 bg-orange-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
              Featured
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div className="flex items-center space-x-1 mb-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="text-[10px] text-slate-400 ml-1">(4.8)</span>
          </div>
          
          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 mb-2 group-hover:text-orange-600 transition-colors h-10">
            {product.name}
          </h3>
          
          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-900">
                ₦{product.price.toLocaleString()}
              </span>
              {product.price > 50000 && (
                <span className="text-[10px] text-green-600 font-medium">Free Delivery</span>
              )}
            </div>
            
            <button
              onClick={handleAddToCart}
              className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-orange-600 transition-all active:scale-95"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
