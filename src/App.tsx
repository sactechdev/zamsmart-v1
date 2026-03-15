import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CartProvider } from './context/CartContext';
import { Home } from './pages/Home';
import { ProductDetails } from './pages/ProductDetails';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { AdminDashboard } from './pages/AdminDashboard';
import { Login } from './pages/Login';
import { CategoryPage } from './pages/Category';
import { Orders } from './pages/Orders';
import { HelpPage, ShippingPage, ReturnsPage, ContactPage } from './pages/StaticPages';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setIsAdmin(data?.role === 'admin');
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    };

    checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <CartProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/shipping" element={<ShippingPage />} />
            <Route path="/returns" element={<ReturnsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route 
              path="/admin" 
              element={
                loading ? (
                  <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                  </div>
                ) : isAdmin ? (
                  <AdminDashboard />
                ) : (
                  <Navigate to="/" />
                )
              } 
            />
          </Routes>
        </Layout>
      </Router>
    </CartProvider>
  );
}

export default App;
