import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { ShoppingCart, ArrowLeft, Star, ShieldCheck, Truck, RefreshCw, Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, categories(*), product_images(image_url), merchant:profiles!products_merchant_id_fkey(*)')
          .eq('id', id)
          .single();
        
        if (error) {
          console.error('Error fetching product:', error);
          setProduct(null);
        } else {
          // Check if product is approved or if current user is the merchant
          const { data: { user } } = await supabase.auth.getUser();
          if (data.approval_status !== 'approved' && data.merchant_id !== user?.id) {
            setProduct(null);
          } else {
            setProduct(data);
            // Set initial selected image
            const initialImage = data.image_url || (data.product_images?.[0]?.image_url) || 'https://picsum.photos/seed/product/800/800';
            setSelectedImage(initialImage);
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900">Product not found</h2>
        <p className="text-slate-500 mt-2">The product you are looking for might have been removed or the link is incorrect.</p>
        <button onClick={() => navigate('/')} className="mt-6 bg-orange-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-orange-700 transition-all">
          Go back home
        </button>
      </div>
    );
  }

  const allImages = [
    product.image_url,
    ...(product.product_images?.map(img => img.image_url) || [])
  ].filter(Boolean);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    toast.success(`${quantity} ${product.name} added to cart!`);
  };

  const renderMedia = () => {
    if (showVideo && product.video_url) {
      const isYoutube = product.video_url.includes('youtube.com') || product.video_url.includes('youtu.be');
      if (isYoutube) {
        const videoId = product.video_url.includes('v=') 
          ? product.video_url.split('v=')[1].split('&')[0]
          : product.video_url.split('/').pop();
        return (
          <iframe
            className="w-full h-full aspect-square"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="Product Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        );
      }
      return (
        <video 
          src={product.video_url} 
          controls 
          className="w-full h-full aspect-square object-contain bg-black"
        />
      );
    }
    return (
      <img 
        src={selectedImage || 'https://picsum.photos/seed/product/800/800'} 
        alt={product.name}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  };

  return (
    <div className="space-y-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-medium"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="aspect-square rounded-3xl overflow-hidden bg-white border border-slate-100 shadow-sm relative"
          >
            {renderMedia()}
          </motion.div>
          <div className="grid grid-cols-4 gap-4">
            {allImages.map((img, i) => (
              <div 
                key={i} 
                onClick={() => {
                  setSelectedImage(img);
                  setShowVideo(false);
                }}
                className={`aspect-square rounded-xl overflow-hidden bg-white border cursor-pointer transition-all ${!showVideo && selectedImage === img ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-100 hover:border-orange-300'}`}
              >
                <img src={img} alt={`thumb-${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ))}
            {product.video_url && (
              <div 
                onClick={() => setShowVideo(true)}
                className={`aspect-square rounded-xl overflow-hidden bg-slate-900 border cursor-pointer transition-all flex items-center justify-center ${showVideo ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-100 hover:border-orange-300'}`}
              >
                <div className="text-white text-center">
                  <Plus className="h-6 w-6 mx-auto mb-1 rotate-45" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">Video</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm font-bold text-orange-600 uppercase tracking-wider">
              <span>{product.categories?.name || 'Category'}</span>
              <span className="text-slate-300">•</span>
              <div className="flex items-center">
                <Star className="h-3 w-3 fill-orange-600" />
                <span className="ml-1">4.9 (120 reviews)</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
              {product.name}
            </h1>
            {product.merchant && (
              <p className="text-sm text-slate-500 font-medium">
                Sold by <span className="text-orange-600">{product.merchant.business_name}</span>
              </p>
            )}
          </div>

          <div className="flex items-baseline space-x-3">
            <span className="text-4xl font-black text-slate-900">₦{product.price.toLocaleString()}</span>
            <span className="text-slate-400 line-through text-lg">₦{(product.price * 1.2).toLocaleString()}</span>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-lg">-20%</span>
          </div>

          <p className="text-slate-600 leading-relaxed text-lg">
            {product.description || 'No description available for this product.'}
          </p>

          <div className="py-6 border-y border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Quantity</span>
              <div className="flex items-center bg-slate-100 rounded-xl p-1">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-bold">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button 
                onClick={handleAddToCart}
                className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 transition-all flex items-center justify-center shadow-lg shadow-orange-600/20"
              >
                <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
              </button>
              <button className="p-4 bg-slate-100 text-slate-900 rounded-2xl hover:bg-slate-200 transition-all">
                <Star className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl">
              <Truck className="h-5 w-5 text-orange-600" />
              <div className="text-xs">
                <p className="font-bold text-slate-900">Free Delivery</p>
                <p className="text-slate-500">On orders over ₦50,000</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl">
              <RefreshCw className="h-5 w-5 text-orange-600" />
              <div className="text-xs">
                <p className="font-bold text-slate-900">Easy Returns</p>
                <p className="text-slate-500">7-day return policy</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl">
              <ShieldCheck className="h-5 w-5 text-orange-600" />
              <div className="text-xs">
                <p className="font-bold text-slate-900">Secure Payment</p>
                <p className="text-slate-500">Verified bank transfers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
