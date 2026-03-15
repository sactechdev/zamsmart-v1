import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Order } from '../types';
import { format } from 'date-fns';
import { Package, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) setOrders(data);
      setLoading(false);
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-extrabold text-slate-900">My Orders</h1>

      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-mono text-slate-400">#{order.id.slice(0, 8)}</p>
                  <p className="font-bold text-slate-900">₦{order.total_amount.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">{format(new Date(order.created_at), 'MMM d, yyyy')}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center ${
                  order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                  order.status === 'Pending Payment Review' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {order.status === 'Delivered' && <CheckCircle className="mr-1 h-3 w-3" />}
                  {order.status === 'Pending Payment Review' && <Clock className="mr-1 h-3 w-3" />}
                  {order.status}
                </span>
                <button className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <p className="text-slate-500 italic">You haven't placed any orders yet.</p>
        </div>
      )}
    </div>
  );
};
