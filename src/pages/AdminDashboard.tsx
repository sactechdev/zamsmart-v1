import React, { useState, useEffect } from 'react';
import { supabase, uploadImage } from '../lib/supabase';
import { Order, Product, Category, PaymentProof, Profile, Payout } from '../types';
import { 
  LayoutDashboard, ShoppingBag, Package, List, Users, 
  TrendingUp, Clock, CheckCircle, XCircle, Eye, 
  Plus, Edit, Trash2, Search, Filter, ChevronRight,
  DollarSign, PackageCheck, AlertCircle, Settings,
  CreditCard, MapPin, Truck, FileText, ShieldCheck,
  Sparkles, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { removeBackground } from '../lib/gemini';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'merchants' | 'categories' | 'settings' | 'payouts' | 'users' | 'shipping'>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Profile[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [shippingStates, setShippingStates] = useState<ShippingState[]>([]);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category_id: '',
    image_url: '',
    video_url: '',
    weight_kg: 0.5,
    length_cm: 0,
    width_cm: 0,
    height_cm: 0,
    is_featured: false,
    additional_images: ['']
  });

  const [settings, setSettings] = useState<{
    bank_details: any;
    office_info: any;
    shipping_config: any;
    terms_of_service: { content: string };
    privacy_policy: { content: string };
  }>({
    bank_details: { bank_name: '', account_name: '', account_number: '' },
    office_info: { address: '', phone: '', email: '' },
    shipping_config: { free_shipping_threshold: 0, shipping_fee: 0 },
    terms_of_service: { content: '' },
    privacy_policy: { content: '' }
  });

  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    pendingPayments: 0,
    totalProducts: 0
  });
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; error?: string }>({ connected: false });
  const [removingBackground, setRemovingBackground] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    checkConnection();
  }, [activeTab]);

  const handleRemoveBackground = async (field: 'main' | number) => {
    const imageUrl = field === 'main' ? productForm.image_url : productForm.additional_images[field];
    if (!imageUrl) {
      toast.error('Please provide an image URL first');
      return;
    }

    setRemovingBackground(field === 'main' ? 'main' : `additional-${field}`);
    try {
      const processedImageUrl = await removeBackground(imageUrl);
      if (field === 'main') {
        setProductForm({ ...productForm, image_url: processedImageUrl });
      } else {
        const newImages = [...productForm.additional_images];
        newImages[field] = processedImageUrl;
        setProductForm({ ...productForm, additional_images: newImages });
      }
      toast.success('Background removed successfully!');
    } catch (error: any) {
      toast.error('Failed to remove background: ' + error.message);
    } finally {
      setRemovingBackground(null);
    }
  };

  const checkConnection = async () => {
    try {
      const { count, error } = await supabase.from('products').select('*', { count: 'exact', head: true });
      if (error) throw error;
      setDbStatus({ connected: true });
    } catch (error: any) {
      setDbStatus({ connected: false, error: error.message });
    }
  };

  const handleSeedData = async () => {
    setLoading(true);
    try {
      // 1. Create Categories
      const categoriesToSeed = [
        { name: 'Hair Care', slug: 'hair-care' },
        { name: 'Skin Care', slug: 'skin-care' },
        { name: 'Home Essentials', slug: 'home-essentials' }
      ];
      
      const { data: cats, error: catError } = await supabase.from('categories').upsert(categoriesToSeed, { onConflict: 'slug' }).select();
      if (catError) throw catError;

      const hairCat = cats?.find(c => c.slug === 'hair-care');
      const skinCat = cats?.find(c => c.slug === 'skin-care');

      // 2. Create Products
      const productsToSeed = [
        { name: 'Organic Shea Butter Hair Cream', description: 'Deeply moisturizing hair cream for natural hair growth and shine.', price: 4500, stock: 50, category_id: hairCat?.id, image_url: 'https://picsum.photos/seed/hair1/400/400', is_featured: true },
        { name: 'Herbal Anti-Dandruff Shampoo', description: 'Effective shampoo with neem and tea tree oil to combat dandruff.', price: 3200, stock: 100, category_id: hairCat?.id, image_url: 'https://picsum.photos/seed/shampoo/400/400', is_featured: true },
        { name: 'Cocoa Butter Body Lotion', description: 'Rich body lotion for 24-hour moisture and glowing skin.', price: 5800, stock: 75, category_id: skinCat?.id, image_url: 'https://picsum.photos/seed/lotion/400/400', is_featured: true }
      ];

      const { error: prodError } = await supabase.from('products').upsert(productsToSeed, { onConflict: 'name' });
      if (prodError) throw prodError;

      toast.success('Sample data seeded successfully!');
      fetchData();
    } catch (error: any) {
      toast.error('Seeding failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, productsRes, categoriesRes, settingsRes, merchantsRes, payoutsRes, usersRes, zonesRes, statesRes, ratesRes] = await Promise.all([
        supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
        supabase.from('products').select('*, categories(*), product_images(*), merchant:profiles(*)').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
        supabase.from('site_settings').select('*'),
        supabase.from('profiles').select('*').eq('role', 'merchant').order('created_at', { ascending: false }),
        supabase.from('payouts').select('*, merchant:profiles(*)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('shipping_zones').select('*').order('name', { ascending: true }),
        supabase.from('shipping_states').select('*, shipping_zones(*)').order('state_name', { ascending: true }),
        supabase.from('shipping_rates').select('*').order('min_weight_kg', { ascending: true })
      ]);

      if (ordersRes.data) setOrders(ordersRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (merchantsRes.data) setMerchants(merchantsRes.data);
      if (payoutsRes.data) setPayouts(payoutsRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      if (zonesRes.data) setShippingZones(zonesRes.data);
      if (statesRes.data) setShippingStates(statesRes.data);
      if (ratesRes.data) setShippingRates(ratesRes.data);
      
      if (settingsRes.data) {
        const newSettings = { ...settings };
        settingsRes.data.forEach((s: any) => {
          if (s.id === 'bank_details') newSettings.bank_details = s.value;
          if (s.id === 'office_info') newSettings.office_info = s.value;
          if (s.id === 'shipping_config') newSettings.shipping_config = s.value;
          if (s.id === 'terms_of_service') newSettings.terms_of_service = s.value;
          if (s.id === 'privacy_policy') newSettings.privacy_policy = s.value;
        });
        setSettings(newSettings);
      }

      // Calculate stats
      const sales = ordersRes.data?.reduce((acc, o) => acc + (o.status !== 'Cancelled' ? o.total_amount : 0), 0) || 0;
      const pending = ordersRes.data?.filter(o => o.status === 'Pending Payment Review').length || 0;

      setStats({
        totalSales: sales,
        totalOrders: ordersRes.data?.length || 0,
        pendingPayments: pending,
        totalProducts: productsRes.data?.length || 0
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) toast.error(error.message);
    else {
      toast.success('Order status updated');
      fetchData();
    }
  };

  const handleVerifyMerchant = async (merchantId: string, status: 'verified' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ merchant_status: status })
        .eq('id', merchantId);

      if (error) throw error;
      toast.success(`Merchant ${status}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleApproveProduct = async (productId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ approval_status: status })
        .eq('id', productId);

      if (error) throw error;
      toast.success(`Product ${status}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleProcessPayout = async (payoutId: string) => {
    try {
      const { error } = await supabase
        .from('payouts')
        .update({ status: 'paid' })
        .eq('id', payoutId);

      if (error) throw error;
      toast.success('Payout marked as paid');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalData, setRoleModalData] = useState<{ userId: string; newRole: 'customer' | 'merchant' } | null>(null);
  const [roleForm, setRoleForm] = useState({
    business_name: '',
    business_phone: ''
  });

  const handleUpdateUserRole = async (userId: string, newRole: 'customer' | 'merchant') => {
    if (newRole === 'merchant') {
      setRoleModalData({ userId, newRole });
      setRoleForm({ business_name: '', business_phone: '' });
      setShowRoleModal(true);
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: newRole,
          merchant_status: 'pending',
          business_name: null,
          business_phone: null
        })
        .eq('id', userId);

      if (error) throw error;
      toast.success(`User role updated to ${newRole}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const confirmRoleUpdate = async () => {
    if (!roleModalData) return;
    if (!roleForm.business_name) {
      toast.error('Business Name is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: roleModalData.newRole,
          merchant_status: 'verified',
          business_name: roleForm.business_name,
          business_phone: roleForm.business_phone
        })
        .eq('id', roleModalData.userId);

      if (error) throw error;
      toast.success(`User role updated to ${roleModalData.newRole}`);
      setShowRoleModal(false);
      setRoleModalData(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { additional_images, ...mainProductData } = productForm;
      let productId = editingProduct?.id;

      if (editingProduct) {
        const { error } = await supabase.from('products').update(mainProductData).eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('products').insert(mainProductData).select().single();
        if (error) throw error;
        productId = data.id;
      }

      // Handle additional images
      if (productId) {
        // Delete existing additional images if editing
        if (editingProduct) {
          await supabase.from('product_images').delete().eq('product_id', productId);
        }

        const imagesToInsert = additional_images
          .filter(url => url.trim() !== '')
          .map(url => ({ product_id: productId, image_url: url }));

        if (imagesToInsert.length > 0) {
          const { error: imgError } = await supabase.from('product_images').insert(imagesToInsert);
          if (imgError) throw imgError;
        }
      }

      toast.success(editingProduct ? 'Product updated' : 'Product created');
      setShowProductModal(false);
      setEditingProduct(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Product deleted');
      fetchData();
    }
  };

  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        category_id: product.category_id,
        image_url: product.image_url,
        video_url: product.video_url || '',
        weight_kg: product.weight_kg || 0.5,
        length_cm: product.length_cm || 0,
        width_cm: product.width_cm || 0,
        height_cm: product.height_cm || 0,
        is_featured: product.is_featured,
        additional_images: product.product_images?.map(img => img.image_url) || ['']
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: 0,
        stock: 0,
        category_id: categories[0]?.id || '',
        image_url: '',
        video_url: '',
        weight_kg: 0.5,
        length_cm: 0,
        width_cm: 0,
        height_cm: 0,
        is_featured: false,
        additional_images: ['']
      });
    }
    setShowProductModal(true);
  };

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    image_url: ''
  });

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        const { error } = await supabase.from('categories').update(categoryForm).eq('id', editingCategory.id);
        if (error) throw error;
        toast.success('Category updated');
      } else {
        const { error } = await supabase.from('categories').insert(categoryForm);
        if (error) throw error;
        toast.success('Category created');
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This might affect products.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Category deleted');
      fetchData();
    }
  };

  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        slug: category.slug,
        image_url: category.image_url || ''
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        slug: '',
        image_url: ''
      });
    }
    setShowCategoryModal(true);
  };

  const handleSaveSettings = async (id: string, value: any) => {
    try {
      const { error } = await supabase.from('site_settings').upsert({ id, value });
      if (error) throw error;
      toast.success('Settings updated successfully');
      fetchData();
    } catch (error: any) {
      toast.error('Failed to update settings: ' + error.message);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 min-h-[80vh]">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col space-y-2 sticky top-24 h-fit">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'overview' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Overview</span>
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'orders' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="h-5 w-5" />
          <span>Orders</span>
          {stats.pendingPayments > 0 && (
            <span className="ml-auto bg-white text-orange-600 text-[10px] px-1.5 py-0.5 rounded-full">{stats.pendingPayments}</span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'products' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="h-5 w-5" />
          <span>Products</span>
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'categories' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <List className="h-5 w-5" />
          <span>Categories</span>
        </button>
        <button 
          onClick={() => setActiveTab('merchants')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'merchants' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="h-5 w-5" />
          <span>Merchants</span>
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'users' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="h-5 w-5" />
          <span>Users</span>
        </button>
        <button 
          onClick={() => setActiveTab('payouts')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'payouts' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="h-5 w-5" />
          <span>Payouts</span>
        </button>
        <button 
          onClick={() => setActiveTab('shipping')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'shipping' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="h-5 w-5" />
          <span>Shipping</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'settings' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </button>
      </aside>

      {/* Mobile Header & Navigation */}
      <div className="md:hidden mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-orange-600">Admin Panel</h2>
        </div>
        
        <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
          <div className="flex space-x-2 min-w-max pb-2">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
                activeTab === 'overview' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' : 'bg-white text-slate-600 border border-slate-100'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Overview</span>
            </button>
            <button 
              onClick={() => setActiveTab('orders')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
                activeTab === 'orders' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' : 'bg-white text-slate-600 border border-slate-100'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Orders</span>
            </button>
            <button 
              onClick={() => setActiveTab('products')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
                activeTab === 'products' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' : 'bg-white text-slate-600 border border-slate-100'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Products</span>
            </button>
            <button 
              onClick={() => setActiveTab('categories')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
                activeTab === 'categories' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' : 'bg-white text-slate-600 border border-slate-100'
              }`}
            >
              <List className="h-4 w-4" />
              <span>Categories</span>
            </button>
            <button 
              onClick={() => setActiveTab('merchants')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
                activeTab === 'merchants' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' : 'bg-white text-slate-600 border border-slate-100'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Merchants</span>
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
                activeTab === 'users' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' : 'bg-white text-slate-600 border border-slate-100'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Users</span>
            </button>
            <button 
              onClick={() => setActiveTab('payouts')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
                activeTab === 'payouts' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' : 'bg-white text-slate-600 border border-slate-100'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span>Payouts</span>
            </button>
            <button 
              onClick={() => setActiveTab('shipping')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
                activeTab === 'shipping' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' : 'bg-white text-slate-600 border border-slate-100'
              }`}
            >
              <Truck className="h-4 w-4" />
              <span>Shipping</span>
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
                activeTab === 'settings' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' : 'bg-white text-slate-600 border border-slate-100'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 space-y-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-extrabold text-slate-900">Dashboard Overview</h2>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold ${dbStatus.connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <div className={`w-2 h-2 rounded-full ${dbStatus.connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                <span>{dbStatus.connected ? 'Database Connected' : 'Connection Error'}</span>
              </div>
            </div>

            {!dbStatus.connected && (
              <div className="bg-red-50 border border-red-100 p-6 rounded-3xl space-y-4">
                <div className="flex items-start space-x-3">
                  <XCircle className="h-6 w-6 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-red-900">Database Connection Issue</h4>
                    <p className="text-sm text-red-700">{dbStatus.error || 'Could not connect to Supabase. Please check your environment variables.'}</p>
                  </div>
                </div>
              </div>
            )}

            {dbStatus.connected && stats.totalProducts === 0 && (
              <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl space-y-4">
                <div className="flex items-start space-x-3">
                  <Package className="h-6 w-6 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-orange-900">No Products Found</h4>
                    <p className="text-sm text-orange-700 mb-4">Your database is connected but seems to be empty. You can add products manually or use the button below to seed sample data.</p>
                    <button 
                      onClick={handleSeedData}
                      className="bg-orange-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-orange-700 transition-all"
                    >
                      Seed Sample Data
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-6 w-6" />
                </div>
                <p className="text-slate-500 text-sm font-medium">Total Sales</p>
                <p className="text-2xl font-black text-slate-900">₦{stats.totalSales.toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <PackageCheck className="h-6 w-6" />
                </div>
                <p className="text-slate-500 text-sm font-medium">Total Orders</p>
                <p className="text-2xl font-black text-slate-900">{stats.totalOrders}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6" />
                </div>
                <p className="text-slate-500 text-sm font-medium">Pending Payments</p>
                <p className="text-2xl font-black text-slate-900">{stats.pendingPayments}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <p className="text-slate-500 text-sm font-medium">Total Products</p>
                <p className="text-2xl font-black text-slate-900">{stats.totalProducts}</p>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Recent Orders</h3>
                <button onClick={() => setActiveTab('orders')} className="text-orange-600 text-sm font-bold hover:underline">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                    <tr>
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.slice(0, 5).map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-slate-500">#{order.id.slice(0, 8)}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900">{order.full_name}</p>
                          <p className="text-xs text-slate-500">{order.email}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">₦{order.total_amount.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                            order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                            order.status === 'Pending Payment Review' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {format(new Date(order.created_at), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-extrabold text-slate-900">Manage Orders</h2>
              <div className="flex space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="text" placeholder="Search orders..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
                  <Filter className="h-5 w-5 text-slate-600" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono text-slate-400">#{order.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'Pending Payment Review' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900">{order.full_name}</h4>
                      <p className="text-sm text-slate-500">{order.phone} • {order.city}, {order.state}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-slate-900">₦{order.total_amount.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-50">
                    <button 
                      onClick={() => handleUpdateOrderStatus(order.id, 'Processing')}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Approve & Process
                    </button>
                    <button 
                      onClick={() => handleUpdateOrderStatus(order.id, 'Shipped')}
                      className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Mark Shipped
                    </button>
                    <button 
                      onClick={() => handleUpdateOrderStatus(order.id, 'Delivered')}
                      className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Mark Delivered
                    </button>
                    <button 
                      onClick={() => handleUpdateOrderStatus(order.id, 'Cancelled')}
                      className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Cancel Order
                    </button>
                    <button className="ml-auto px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center">
                      <Eye className="mr-1 h-3 w-3" /> View Proof
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-extrabold text-slate-900">Products Inventory</h2>
              <button 
                onClick={() => openProductModal()}
                className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center hover:bg-orange-700 transition-all"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Product
              </button>
            </div>

            {/* Approval Queue */}
            {products.filter(p => p.approval_status === 'pending').length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl space-y-4">
                <div className="flex items-center space-x-2 text-amber-800 font-bold">
                  <Clock className="h-5 w-5" />
                  <h3>Approval Queue ({products.filter(p => p.approval_status === 'pending').length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.filter(p => p.approval_status === 'pending').map(product => (
                    <div key={product.id} className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm space-y-3">
                      <div className="flex items-center space-x-3">
                        <img src={product.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        <div>
                          <p className="font-bold text-sm truncate w-40">{product.name}</p>
                          <p className="text-xs text-slate-500">By: {product.merchant?.business_name || 'Admin'}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleApproveProduct(product.id, 'approved')}
                          className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleApproveProduct(product.id, 'rejected')}
                          className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                    <tr>
                      <th className="px-6 py-4">Product</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4">Stock</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100">
                              <img src={product.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <span className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{product.categories?.name}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">₦{product.price.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold ${product.stock < 10 ? 'text-red-600' : 'text-slate-600'}`}>
                            {product.stock} units
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => openProductModal(product)}
                              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Product Modal */}
            <AnimatePresence>
              {showProductModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold text-slate-900">
                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                      </h3>
                      <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                        <XCircle className="h-6 w-6 text-slate-400" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">Product Name</label>
                        <input 
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                          value={productForm.name}
                          onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">Description</label>
                        <textarea 
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 min-h-[100px]"
                          value={productForm.description}
                          onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase">Price (₦)</label>
                        <input 
                          type="number"
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                          value={productForm.price}
                          onChange={(e) => setProductForm({...productForm, price: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase">Stock</label>
                        <input 
                          type="number"
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                          value={productForm.stock}
                          onChange={(e) => setProductForm({...productForm, stock: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase">Category</label>
                        <select 
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                          value={productForm.category_id}
                          onChange={(e) => setProductForm({...productForm, category_id: e.target.value})}
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">Video URL (Optional)</label>
                        <input 
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="YouTube or MP4 URL"
                          value={productForm.video_url}
                          onChange={(e) => setProductForm({...productForm, video_url: e.target.value})}
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:col-span-2">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 uppercase">Weight (kg)</label>
                          <input 
                            type="number"
                            step="0.01"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                            value={productForm.weight_kg}
                            onChange={(e) => setProductForm({...productForm, weight_kg: Number(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 uppercase">Length (cm)</label>
                          <input 
                            type="number"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                            value={productForm.length_cm}
                            onChange={(e) => setProductForm({...productForm, length_cm: Number(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 uppercase">Width (cm)</label>
                          <input 
                            type="number"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                            value={productForm.width_cm}
                            onChange={(e) => setProductForm({...productForm, width_cm: Number(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 uppercase">Height (cm)</label>
                          <input 
                            type="number"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                            value={productForm.height_cm}
                            onChange={(e) => setProductForm({...productForm, height_cm: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-700 uppercase">Main Image</label>
                          {productForm.image_url && (
                            <button 
                              type="button"
                              onClick={() => handleRemoveBackground('main')}
                              disabled={removingBackground === 'main'}
                              className="text-emerald-600 text-xs font-bold hover:underline flex items-center disabled:opacity-50"
                            >
                              {removingBackground === 'main' ? (
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
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Image URL"
                            value={productForm.image_url}
                            onChange={(e) => setProductForm({...productForm, image_url: e.target.value})}
                          />
                          <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 px-4 py-3 rounded-xl border border-slate-200 flex items-center justify-center transition-colors">
                            <Plus className="h-5 w-5 text-slate-600" />
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
                                    setProductForm({...productForm, image_url: url});
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

                      <div className="space-y-3 md:col-span-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-700 uppercase">Additional Images (Gallery)</label>
                          <button 
                            type="button"
                            onClick={() => setProductForm({
                              ...productForm, 
                              additional_images: [...productForm.additional_images, '']
                            })}
                            className="text-orange-600 text-xs font-bold hover:underline flex items-center"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add Image
                          </button>
                        </div>
                        <div className="space-y-2">
                          {productForm.additional_images.map((url, index) => (
                            <div key={index} className="flex flex-col space-y-2">
                              <div className="flex space-x-2">
                                <input 
                                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                  placeholder="Image URL"
                                  value={url}
                                  onChange={(e) => {
                                    const newImages = [...productForm.additional_images];
                                    newImages[index] = e.target.value;
                                    setProductForm({...productForm, additional_images: newImages});
                                  }}
                                />
                                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl border border-slate-200 flex items-center justify-center transition-colors">
                                  <Plus className="h-4 w-4 text-slate-600" />
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const loadingToast = toast.loading('Uploading image...');
                                        try {
                                          const uploadedUrl = await uploadImage(file);
                                          const newImages = [...productForm.additional_images];
                                          newImages[index] = uploadedUrl;
                                          setProductForm({...productForm, additional_images: newImages});
                                          toast.success('Image uploaded successfully', { id: loadingToast });
                                        } catch (err) {
                                          console.error(err);
                                          toast.error('Failed to upload image', { id: loadingToast });
                                        }
                                      }
                                    }}
                                  />
                                </label>
                                {url && (
                                  <button 
                                    type="button"
                                    onClick={() => handleRemoveBackground(index)}
                                    disabled={removingBackground === `additional-${index}`}
                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-50"
                                    title="Remove Background"
                                  >
                                    {removingBackground === `additional-${index}` ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Sparkles className="h-4 w-4" />
                                    )}
                                  </button>
                                )}
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const newImages = productForm.additional_images.filter((_, i) => i !== index);
                                    setProductForm({...productForm, additional_images: newImages.length ? newImages : ['']});
                                  }}
                                  className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 md:col-span-2">
                        <input 
                          type="checkbox"
                          id="is_featured"
                          checked={productForm.is_featured}
                          onChange={(e) => setProductForm({...productForm, is_featured: e.target.checked})}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                        />
                        <label htmlFor="is_featured" className="text-sm font-bold text-slate-700">Featured Product</label>
                      </div>

                      <div className="md:col-span-2 pt-4">
                        <button 
                          type="submit"
                          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all"
                        >
                          {editingProduct ? 'Update Product' : 'Create Product'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-extrabold text-slate-900">Categories</h2>
              <button 
                onClick={() => openCategoryModal()}
                className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center hover:bg-orange-700 transition-all"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Category
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <div key={cat.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-orange-200 transition-all">
                  <div>
                    <h4 className="font-bold text-slate-900">{cat.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">{cat.slug}</p>
                  </div>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openCategoryModal(cat)}
                      className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Category Modal */}
            <AnimatePresence>
              {showCategoryModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold text-slate-900">
                        {editingCategory ? 'Edit Category' : 'Add New Category'}
                      </h3>
                      <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                        <XCircle className="h-6 w-6 text-slate-400" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveCategory} className="space-y-6">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase">Category Name</label>
                        <input 
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase">Slug</label>
                        <input 
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50"
                          value={categoryForm.slug}
                          readOnly
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase">Category Image</label>
                        <div className="flex gap-2">
                          <input 
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Image URL"
                            value={categoryForm.image_url}
                            onChange={(e) => setCategoryForm({...categoryForm, image_url: e.target.value})}
                          />
                          <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 px-4 py-3 rounded-xl border border-slate-200 flex items-center justify-center transition-colors">
                            <Plus className="h-5 w-5 text-slate-600" />
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
                                    setCategoryForm({...categoryForm, image_url: url});
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

                      <button 
                        type="submit"
                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all"
                      >
                        {editingCategory ? 'Update Category' : 'Create Category'}
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 'merchants' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-extrabold text-slate-900">Merchant Management</h2>
            
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Business</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Owner</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {merchants.map((merchant) => (
                    <tr key={merchant.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{merchant.business_name}</div>
                        <div className="text-xs text-slate-500">{merchant.business_phone}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{merchant.full_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                          merchant.merchant_status === 'verified' ? 'bg-green-100 text-green-700' :
                          merchant.merchant_status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {merchant.merchant_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {merchant.merchant_status === 'pending' && (
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleVerifyMerchant(merchant.id, 'verified')}
                              className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleVerifyMerchant(merchant.id, 'rejected')}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-extrabold text-slate-900">Merchant Payouts</h2>
            
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Merchant</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{payout.merchant?.business_name}</div>
                        <div className="text-xs text-slate-500">{format(new Date(payout.created_at), 'MMM dd, yyyy')}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">₦{payout.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                          payout.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {payout.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {payout.status === 'pending' && (
                          <button 
                            onClick={() => handleProcessPayout(payout.id)}
                            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-600 transition"
                          >
                            Mark as Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-extrabold text-slate-900">User Management</h2>
            
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">User</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Joined</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{user.full_name}</div>
                        <div className="text-xs text-slate-500">{user.business_name || 'No Business'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'merchant' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {format(new Date(user.created_at), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          {user.role === 'customer' ? (
                            <button 
                              onClick={() => handleUpdateUserRole(user.id, 'merchant')}
                              className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition"
                            >
                              Make Merchant
                            </button>
                          ) : user.role === 'merchant' ? (
                            <button 
                              onClick={() => handleUpdateUserRole(user.id, 'customer')}
                              className="px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg hover:bg-slate-800 transition"
                            >
                              Make Customer
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'shipping' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-extrabold text-slate-900">Shipping Management</h2>
              <div className="flex space-x-3">
                <button 
                  onClick={() => fetchData()}
                  className="p-2 bg-white border border-slate-100 rounded-xl text-slate-600 hover:bg-slate-50 transition shadow-sm"
                  title="Refresh Data"
                >
                  <Clock className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Zones & Rates */}
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 flex items-center">
                      <Truck className="h-4 w-4 mr-2 text-orange-600" />
                      Shipping Zones & Delivery Times
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {shippingZones.map((zone) => (
                      <div key={zone.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-bold text-slate-900">{zone.name}</div>
                            <div className="text-xs text-slate-500">
                              Est. Delivery: {zone.estimated_days_min}-{zone.estimated_days_max} days
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weight Rates</div>
                          <div className="grid grid-cols-1 gap-2">
                            {shippingRates.filter(r => r.zone_id === zone.id).map(rate => (
                              <div key={rate.id} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                <span className="text-xs text-slate-600">
                                  {rate.min_weight_kg}-{rate.max_weight_kg}kg
                                </span>
                                <div className="flex items-center space-x-3">
                                  <span className="font-bold text-slate-900 text-xs">₦{rate.base_fee.toLocaleString()}</span>
                                  <button 
                                    onClick={async () => {
                                      const newFee = prompt(`Enter new fee for ${zone.name} (${rate.min_weight_kg}-${rate.max_weight_kg}kg):`, rate.base_fee.toString());
                                      if (newFee && !isNaN(Number(newFee))) {
                                        const { error } = await supabase.from('shipping_rates').update({ base_fee: Number(newFee) }).eq('id', rate.id);
                                        if (error) toast.error(error.message);
                                        else {
                                          toast.success('Rate updated!');
                                          fetchData();
                                        }
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-orange-600 transition"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* States Mapping */}
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-900 flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-orange-600" />
                      State to Zone Mapping
                    </h3>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
                    {shippingStates.map((state) => (
                      <div key={state.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <span className="font-medium text-slate-700">{state.state_name}</span>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
                            {state.shipping_zones?.name}
                          </span>
                          <button 
                            onClick={async () => {
                              const zoneNames = shippingZones.map(z => z.name).join(', ');
                              const newZoneName = prompt(`Enter new zone for ${state.state_name} (${zoneNames}):`, state.shipping_zones?.name);
                              const newZone = shippingZones.find(z => z.name === newZoneName);
                              if (newZone) {
                                const { error } = await supabase.from('shipping_states').update({ zone_id: newZone.id }).eq('id', state.id);
                                if (error) toast.error(error.message);
                                else {
                                  toast.success('State zone updated!');
                                  fetchData();
                                }
                              } else if (newZoneName) {
                                toast.error('Invalid zone name');
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-orange-600 transition"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-extrabold text-slate-900">Site Settings</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Bank Details */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center space-x-3 text-xl font-bold text-slate-900">
                  <CreditCard className="text-orange-600" />
                  <h3>Bank Details</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">Bank Name</label>
                    <input 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                      value={settings.bank_details.bank_name}
                      onChange={(e) => setSettings({
                        ...settings, 
                        bank_details: { ...settings.bank_details, bank_name: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">Account Name</label>
                    <input 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                      value={settings.bank_details.account_name}
                      onChange={(e) => setSettings({
                        ...settings, 
                        bank_details: { ...settings.bank_details, account_name: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">Account Number</label>
                    <input 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                      value={settings.bank_details.account_number}
                      onChange={(e) => setSettings({
                        ...settings, 
                        bank_details: { ...settings.bank_details, account_number: e.target.value }
                      })}
                    />
                  </div>
                  <button 
                    onClick={() => handleSaveSettings('bank_details', settings.bank_details)}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all"
                  >
                    Save Bank Details
                  </button>
                </div>
              </div>

              {/* Office Info */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center space-x-3 text-xl font-bold text-slate-900">
                  <MapPin className="text-orange-600" />
                  <h3>Office Information</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">Address</label>
                    <input 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                      value={settings.office_info.address}
                      onChange={(e) => setSettings({
                        ...settings, 
                        office_info: { ...settings.office_info, address: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">Phone</label>
                    <input 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                      value={settings.office_info.phone}
                      onChange={(e) => setSettings({
                        ...settings, 
                        office_info: { ...settings.office_info, phone: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">Email</label>
                    <input 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                      value={settings.office_info.email}
                      onChange={(e) => setSettings({
                        ...settings, 
                        office_info: { ...settings.office_info, email: e.target.value }
                      })}
                    />
                  </div>
                  <button 
                    onClick={() => handleSaveSettings('office_info', settings.office_info)}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all"
                  >
                    Save Office Info
                  </button>
                </div>
              </div>

              {/* Shipping & Discounts */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center space-x-3 text-xl font-bold text-slate-900">
                  <Truck className="text-orange-600" />
                  <h3>Shipping & Discounts</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">Free Shipping Threshold (₦)</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                      value={settings.shipping_config.free_shipping_threshold}
                      onChange={(e) => setSettings({
                        ...settings, 
                        shipping_config: { ...settings.shipping_config, free_shipping_threshold: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">Standard Shipping Fee (₦)</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                      value={settings.shipping_config.shipping_fee}
                      onChange={(e) => setSettings({
                        ...settings, 
                        shipping_config: { ...settings.shipping_config, shipping_fee: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <button 
                    onClick={() => handleSaveSettings('shipping_config', settings.shipping_config)}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all"
                  >
                    Save Shipping Config
                  </button>
                </div>
              </div>

              {/* Terms of Service */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 lg:col-span-2">
                <div className="flex items-center space-x-3 text-xl font-bold text-slate-900">
                  <FileText className="text-orange-600" />
                  <h3>Terms of Service</h3>
                </div>
                <div className="space-y-4">
                  <textarea 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 min-h-[300px]"
                    placeholder="Enter Terms of Service content here..."
                    value={settings.terms_of_service.content}
                    onChange={(e) => setSettings({
                      ...settings, 
                      terms_of_service: { content: e.target.value }
                    })}
                  />
                  <button 
                    onClick={() => handleSaveSettings('terms_of_service', settings.terms_of_service)}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all"
                  >
                    Save Terms of Service
                  </button>
                </div>
              </div>

              {/* Privacy Policy */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 lg:col-span-2">
                <div className="flex items-center space-x-3 text-xl font-bold text-slate-900">
                  <ShieldCheck className="text-orange-600" />
                  <h3>Privacy Policy</h3>
                </div>
                <div className="space-y-4">
                  <textarea 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 min-h-[300px]"
                    placeholder="Enter Privacy Policy content here..."
                    value={settings.privacy_policy.content}
                    onChange={(e) => setSettings({
                      ...settings, 
                      privacy_policy: { content: e.target.value }
                    })}
                  />
                  <button 
                    onClick={() => handleSaveSettings('privacy_policy', settings.privacy_policy)}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all"
                  >
                    Save Privacy Policy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      {/* Role Update Modal */}
      <AnimatePresence>
        {showRoleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Promote to Merchant</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Business Name *</label>
                  <input
                    type="text"
                    value={roleForm.business_name}
                    onChange={(e) => setRoleForm({ ...roleForm, business_name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition"
                    placeholder="e.g. Saka Electronics"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">WhatsApp Number</label>
                  <input
                    type="text"
                    value={roleForm.business_phone}
                    onChange={(e) => setRoleForm({ ...roleForm, business_phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition"
                    placeholder="e.g. +234 803..."
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-8">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRoleUpdate}
                  className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition shadow-lg shadow-orange-200"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
