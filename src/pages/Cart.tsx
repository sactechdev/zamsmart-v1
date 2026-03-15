import React from 'react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Cart: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, subtotal } = useCart();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="text-center py-20 space-y-6">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag className="h-12 w-12 text-slate-300" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Your cart is empty</h2>
          <p className="text-slate-500">Looks like you haven't added anything to your cart yet.</p>
        </div>
        <Link 
          to="/" 
          className="inline-block bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold text-slate-900">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {cart.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4"
              >
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{item.name}</h3>
                  <p className="text-orange-600 font-bold">₦{item.price.toLocaleString()}</p>
                </div>

                <div className="flex items-center bg-slate-100 rounded-lg p-1">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-1 hover:bg-white rounded transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1 hover:bg-white rounded transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Order Summary</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-bold text-slate-900">₦{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shipping</span>
                <span className="text-green-600 font-bold">{subtotal > 50000 ? 'FREE' : '₦2,500'}</span>
              </div>
              <div className="border-t border-slate-100 pt-2 flex justify-between text-lg">
                <span className="font-bold text-slate-900">Total</span>
                <span className="font-black text-orange-600">
                  ₦{(subtotal + (subtotal > 50000 ? 0 : 2500)).toLocaleString()}
                </span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/checkout')}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all flex items-center justify-center group"
            >
              Checkout <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
            <p className="text-xs text-orange-800 font-medium">
              💡 Tip: Add ₦{(Math.max(0, 50000 - subtotal)).toLocaleString()} more to your cart to get FREE delivery!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
