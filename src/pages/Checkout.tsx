import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Upload, CreditCard, Truck, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

export const Checkout: React.FC = () => {
  const { cart, subtotal, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    state: '',
    city: ''
  });

  const [paymentProof, setPaymentProof] = useState<File | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        setFormData(prev => ({
          ...prev,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || ''
        }));
      }
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  };

  const handleSubmitOrder = async () => {
    if (!paymentProof) {
      toast.error('Please upload your proof of payment');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          total_amount: subtotal + (subtotal > 50000 ? 0 : 2500),
          status: 'Pending Payment Review',
          ...formData
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // 3. Upload Payment Proof
      const fileExt = paymentProof.name.split('.').pop();
      const fileName = `${order.id}-${Math.random()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, paymentProof);

      if (uploadError) throw uploadError;

      // 4. Create Payment Proof Record
      const { error: proofError } = await supabase.from('payment_proofs').insert({
        order_id: order.id,
        file_url: uploadData.path,
        review_status: 'pending'
      });

      if (proofError) throw proofError;

      toast.success('Order placed successfully! We will review your payment shortly.');
      clearCart();
      setStep(4);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0 && step !== 4) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Stepper */}
      <div className="flex items-center justify-between px-4 sm:px-0">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
              step >= i ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {step > i ? <CheckCircle2 className="h-6 w-6" /> : i}
            </div>
            {i < 3 && (
              <div className={`h-1 flex-1 mx-4 rounded-full transition-all ${
                step > i ? 'bg-orange-600' : 'bg-slate-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6"
          >
            <div className="flex items-center space-x-3 text-2xl font-bold text-slate-900">
              <MapPin className="text-orange-600" />
              <h2>Shipping Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Full Name</label>
                <input 
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Phone Number</label>
                <input 
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="08012345678"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">Email Address</label>
                <input 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">Street Address</label>
                <input 
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="123 Shopping Street"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">State</label>
                <select 
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                >
                  <option value="">Select State</option>
                  <option value="Lagos">Lagos</option>
                  <option value="Abuja">Abuja</option>
                  <option value="Rivers">Rivers</option>
                  <option value="Oyo">Oyo</option>
                  <option value="Kano">Kano</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">City</label>
                <input 
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Ikeja"
                />
              </div>
            </div>

            <button 
              onClick={() => setStep(2)}
              disabled={!formData.full_name || !formData.phone || !formData.address}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Payment <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center space-x-3 text-2xl font-bold text-slate-900">
                <CreditCard className="text-orange-600" />
                <h2>Payment Method</h2>
              </div>
              
              <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-orange-900">Bank Transfer</h3>
                  <div className="bg-orange-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase">Available</div>
                </div>
                <p className="text-sm text-orange-800">
                  Please transfer the total amount to the account details below and upload your receipt in the next step.
                </p>
                <div className="bg-white p-4 rounded-xl border border-orange-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Bank Name</span>
                    <span className="font-bold text-slate-900">GTBank</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Account Name</span>
                    <span className="font-bold text-slate-900">ZAMS Mart Limited</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Account Number</span>
                    <span className="font-bold text-slate-900">0123456789</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl space-y-3">
                <h4 className="font-bold text-slate-900">Order Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-bold">₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shipping</span>
                    <span className="font-bold">₦{(subtotal > 50000 ? 0 : 2500).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg pt-2 border-t border-slate-200">
                    <span className="font-bold">Total to Pay</span>
                    <span className="font-black text-orange-600">₦{(subtotal + (subtotal > 50000 ? 0 : 2500)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 bg-slate-100 text-slate-900 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Back
                </button>
                <button 
                  onClick={() => setStep(3)}
                  className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all"
                >
                  I've Made the Transfer
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6"
          >
            <div className="flex items-center space-x-3 text-2xl font-bold text-slate-900">
              <Upload className="text-orange-600" />
              <h2>Upload Proof of Payment</h2>
            </div>

            <p className="text-slate-500 text-sm">
              Please upload a screenshot or photo of your bank transfer receipt. We accept JPG, PNG, or PDF.
            </p>

            <div className="relative group">
              <input 
                type="file" 
                onChange={handleFileChange}
                accept="image/*,.pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
                paymentProof ? 'border-green-500 bg-green-50' : 'border-slate-200 group-hover:border-orange-500 group-hover:bg-orange-50'
              }`}>
                {paymentProof ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                    <p className="font-bold text-green-700">{paymentProof.name}</p>
                    <button className="text-xs text-slate-500 underline">Change file</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 text-slate-300 mx-auto group-hover:text-orange-500" />
                    <p className="font-bold text-slate-700">Click or drag to upload</p>
                    <p className="text-xs text-slate-400">Max file size: 5MB</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setStep(2)}
                className="flex-1 bg-slate-100 text-slate-900 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Back
              </button>
              <button 
                onClick={handleSubmitOrder}
                disabled={!paymentProof || loading}
                className="flex-[2] bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all flex items-center justify-center disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : 'Complete Order'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-12 rounded-3xl border border-slate-100 shadow-xl text-center space-y-6"
          >
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-slate-900">Order Received!</h2>
              <p className="text-slate-500">
                Thank you for shopping with ZAMS Mart. Your order is now being reviewed.
              </p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl text-sm text-slate-600 max-w-sm mx-auto">
              We will notify you via email once your payment has been verified and your order is processing.
            </div>
            <button 
              onClick={() => navigate('/')}
              className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all"
            >
              Back to Home
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
