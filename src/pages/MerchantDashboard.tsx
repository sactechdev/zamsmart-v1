import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Plus, 
  Settings, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Loader2
} from 'lucide-react';
import { supabase, uploadImage } from '../lib/supabase';
import { Product, Category, Profile, OrderItem, Payout } from '../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { removeBackground } from '../lib/gemini';

export default function MerchantDashboard() {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'payouts' | 'settings'>('overview');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
    };
    checkUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Form states
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category_id: '',
    image_url: '',
    video_url: '',
    weight_kg: '0.5',
    length_cm: '0',
    width_cm: '0',
    height_cm: '0'
  });
  const [removingBackground, setRemovingBackground] = useState(false);

  const handleRemoveBackground = async () => {
    if (!newProduct.image_url) {
      toast.error('Please provide an image URL first');
      return;
    }

    setRemovingBackground(true);
    try {
      const processedImageUrl = await removeBackground(newProduct.image_url);
      setNewProduct({ ...newProduct, image_url: processedImageUrl });
      toast.success('Background removed successfully!');
    } catch (error: any) {
      toast.error('Failed to remove background: ' + error.message);
    } finally {
      setRemovingBackground(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMerchantData();
    }
  }, [user]);

  async function fetchMerchantData() {
    try {
      setLoading(true);
      
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      if (profileData.role !== 'merchant') {
        navigate('/');
        return;
      }

      // Fetch products
      const { data: productsData } = await supabase
        .from('products')
        .select('*, categories(*)')
        .eq('merchant_id', user?.id)
        .order('created_at', { ascending: false });

      setProducts(productsData || []);

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      setCategories(categoriesData || []);

      // Fetch order items (sales)
      const { data: salesData } = await supabase
        .from('order_items')
        .select('*, products(*)')
        .eq('merchant_id', user?.id)
        .order('id', { ascending: false });

      setOrderItems(salesData || []);

      // Fetch payouts
      const { data: payoutsData } = await supabase
        .from('payouts')
        .select('*')
        .eq('merchant_id', user?.id)
        .order('created_at', { ascending: false });

      setPayouts(payoutsData || []);

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('products')
        .insert([{
          ...newProduct,
          price: parseFloat(newProduct.price),
          stock: parseInt(newProduct.stock),
          weight_kg: parseFloat(newProduct.weight_kg),
          length_cm: parseFloat(newProduct.length_cm),
          width_cm: parseFloat(newProduct.width_cm),
          height_cm: parseFloat(newProduct.height_cm),
          merchant_id: user?.id,
          approval_status: 'pending'
        }]);

      if (error) throw error;
      
      toast.success('Product submitted for approval');
      setShowAddProduct(false);
      setNewProduct({
        name: '',
        description: '',
        price: '',
        stock: '',
        category_id: '',
        image_url: '',
        video_url: '',
        weight_kg: '0.5',
        length_cm: '0',
        width_cm: '0',
        height_cm: '0'
      });
      fetchMerchantData();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          business_description: profile?.business_description,
          business_phone: profile?.business_phone
        })
        .eq('id', user?.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
      fetchMerchantData();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  const stats = {
    totalSales: orderItems.reduce((acc, item) => acc + (item.merchant_payout_amount || 0), 0),
    totalOrders: new Set(orderItems.map(item => item.order_id)).size,
    activeProducts: products.filter(p => p.approval_status === 'approved').length,
    pendingApproval: products.filter(p => p.approval_status === 'pending').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (profile?.merchant_status === 'pending') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Verification Pending</h1>
        <p className="text-gray-600 mb-8">
          Your merchant account is currently being reviewed by our administrative team. 
          You will be notified once your account is verified and you can start uploading products.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
        >
          Return to Home
        </button>
      </div>
    );
  }

  if (profile?.merchant_status === 'rejected') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Application Rejected</h1>
        <p className="text-gray-600 mb-8">
          Unfortunately, your merchant application was not approved at this time. 
          Please contact support for more information.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-emerald-600">Merchant Hub</h2>
          <p className="text-sm text-gray-500 truncate">{profile?.business_name}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition ${
              activeTab === 'overview' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Overview</span>
          </button>
          
          <button
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition ${
              activeTab === 'products' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Products</span>
          </button>
          
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition ${
              activeTab === 'orders' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Sales</span>
          </button>

          <button
            onClick={() => setActiveTab('payouts')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition ${
              activeTab === 'payouts' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span>Payouts</span>
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition ${
              activeTab === 'settings' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {/* Mobile Header & Navigation */}
        <div className="md:hidden mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-emerald-600">Merchant Hub</h2>
              <p className="text-xs text-gray-500">{profile?.business_name}</p>
            </div>
          </div>
          
          <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
            <div className="flex space-x-2 min-w-max pb-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold transition ${
                  activeTab === 'overview' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold transition ${
                  activeTab === 'products' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Products</span>
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold transition ${
                  activeTab === 'orders' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Sales</span>
              </button>
              <button
                onClick={() => setActiveTab('payouts')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold transition ${
                  activeTab === 'payouts' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Payouts</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold transition ${
                  activeTab === 'settings' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Dashboard Overview</h1>
              <button
                onClick={() => setShowAddProduct(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-emerald-700 transition"
              >
                <Plus className="w-5 h-5" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold">₦{stats.totalSales.toLocaleString()}</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Package className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500">Active Products</p>
                <p className="text-2xl font-bold">{stats.activeProducts}</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500">Pending Approval</p>
                <p className="text-2xl font-bold">{stats.pendingApproval}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4">Recent Sales</h3>
                <div className="space-y-4">
                  {orderItems.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={item.products?.image_url || 'https://via.placeholder.com/40'} 
                          alt="" 
                          className="w-10 h-10 rounded object-cover"
                        />
                        <div>
                          <p className="font-medium text-sm">{item.products?.name}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">₦{item.merchant_payout_amount?.toLocaleString()}</p>
                        <p className="text-xs text-emerald-600">Earned</p>
                      </div>
                    </div>
                  ))}
                  {orderItems.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No sales yet</p>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4">Product Status</h3>
                <div className="space-y-4">
                  {products.slice(0, 5).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={product.image_url || 'https://via.placeholder.com/40'} 
                          alt="" 
                          className="w-10 h-10 rounded object-cover"
                        />
                        <p className="font-medium text-sm">{product.name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        product.approval_status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {product.approval_status}
                      </span>
                    </div>
                  ))}
                  {products.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No products added</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">My Products</h1>
              <button
                onClick={() => setShowAddProduct(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-emerald-700 transition"
              >
                <Plus className="w-5 h-5" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Product</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Category</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Price</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Stock</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img src={product.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{product.categories?.name}</td>
                      <td className="px-6 py-4 font-medium">₦{product.price.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm">{product.stock}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          product.approval_status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {product.approval_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Sales History</h1>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Product</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Quantity</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Sale Price</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Commission</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Your Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orderItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img src={item.products?.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                          <span className="font-medium">{item.products?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{item.quantity}</td>
                      <td className="px-6 py-4 text-sm font-medium">₦{item.price.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-red-600">-₦{item.commission_amount?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-600">₦{item.merchant_payout_amount?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Payout History</h1>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Date</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Amount</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {format(new Date(payout.created_at), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 font-bold">₦{payout.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payout.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {payout.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {payouts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No payouts yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-8">
            <h1 className="text-2xl font-bold">Business Settings</h1>
            
              <form onSubmit={handleUpdateProfile} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  <input 
                    type="text" 
                    value={profile?.business_name || ''} 
                    disabled 
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Contact admin to change business name</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Description</label>
                  <textarea 
                    rows={4}
                    value={profile?.business_description || ''}
                    onChange={(e) => setProfile(profile ? {...profile, business_description: e.target.value} : null)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Tell customers about your business..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input 
                      type="text" 
                      value={profile?.business_phone || ''}
                      onChange={(e) => setProfile(profile ? {...profile, business_phone: e.target.value} : null)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate</label>
                    <input 
                      type="text" 
                      value={`${(profile?.commission_rate || 0) * 100}%`}
                      disabled
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
                    />
                  </div>
                </div>

                <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition">
                  Save Changes
                </button>
              </form>
          </div>
        )}
      </main>

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Add New Product</h2>
              <button onClick={() => setShowAddProduct(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    required
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    required
                    rows={3}
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₦)</label>
                  <input
                    required
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                  <input
                    required
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    required
                    value={newProduct.category_id}
                    onChange={(e) => setNewProduct({...newProduct, category_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Video URL (Optional)</label>
                  <input
                    type="text"
                    value={newProduct.video_url}
                    onChange={(e) => setNewProduct({...newProduct, video_url: e.target.value})}
                    placeholder="YouTube or MP4 URL"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:col-span-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProduct.weight_kg}
                      onChange={(e) => setNewProduct({...newProduct, weight_kg: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Length (cm)</label>
                    <input
                      type="number"
                      value={newProduct.length_cm}
                      onChange={(e) => setNewProduct({...newProduct, length_cm: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Width (cm)</label>
                    <input
                      type="number"
                      value={newProduct.width_cm}
                      onChange={(e) => setNewProduct({...newProduct, width_cm: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={newProduct.height_cm}
                      onChange={(e) => setNewProduct({...newProduct, height_cm: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Image URL</label>
                    {newProduct.image_url && (
                      <button 
                        type="button"
                        onClick={handleRemoveBackground}
                        disabled={removingBackground}
                        className="text-emerald-600 text-xs font-bold hover:underline flex items-center disabled:opacity-50"
                      >
                        {removingBackground ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3 mr-1" />
                        )}
                        Remove Background
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      required
                      type="url"
                      placeholder="Image URL"
                      value={newProduct.image_url}
                      onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg border border-gray-200 flex items-center justify-center transition-colors">
                      <Plus className="h-5 w-5 text-gray-600" />
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const loadingToast = toast.loading('Uploading image...');
                            try {
                              const url = await uploadImage(file);
                              setNewProduct({...newProduct, image_url: url});
                              toast.success('Image uploaded successfully', { id: loadingToast });
                            } catch (err) {
                              console.error(err);
                              toast.error('Failed to upload image', { id: loadingToast });
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
