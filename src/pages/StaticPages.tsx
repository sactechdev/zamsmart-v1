import React from 'react';
import { HelpCircle, Truck, RefreshCw, Mail, Phone, MapPin } from 'lucide-react';

const PageWrapper: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="max-w-4xl mx-auto space-y-8 py-12">
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
        {icon}
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900">{title}</h1>
    </div>
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 prose prose-slate max-w-none">
      {children}
    </div>
  </div>
);

export const HelpPage = () => (
  <PageWrapper title="Help Center" icon={<HelpCircle className="h-6 w-6" />}>
    <h3>Frequently Asked Questions</h3>
    <div className="space-y-6">
      <div>
        <h4 className="font-bold">How do I place an order?</h4>
        <p>Simply browse our products, add them to your cart, and proceed to checkout. You will need to provide your delivery details and upload a proof of payment.</p>
      </div>
      <div>
        <h4 className="font-bold">What payment methods do you accept?</h4>
        <p>We currently accept direct bank transfers. After making the transfer, please upload a screenshot of your transaction receipt in the checkout or order details page.</p>
      </div>
      <div>
        <h4 className="font-bold">How long does delivery take?</h4>
        <p>Delivery typically takes 2-5 business days depending on your location in Nigeria.</p>
      </div>
    </div>
  </PageWrapper>
);

export const ShippingPage = () => (
  <PageWrapper title="Shipping Information" icon={<Truck className="h-6 w-6" />}>
    <p>We provide nationwide shipping across all 36 states in Nigeria. Our primary shipping partners ensure your items arrive safely and on time.</p>
    <h3>Shipping Rates</h3>
    <ul>
      <li><strong>Lagos:</strong> ₦2,500 (Free for orders over ₦50,000)</li>
      <li><strong>South West:</strong> ₦3,500</li>
      <li><strong>Other Regions:</strong> ₦5,000 - ₦7,500</li>
    </ul>
    <p>Orders are processed within 24 hours of payment confirmation.</p>
  </PageWrapper>
);

export const ReturnsPage = () => (
  <PageWrapper title="Returns & Refunds" icon={<RefreshCw className="h-6 w-6" />}>
    <p>We want you to be completely satisfied with your purchase. If you're not happy, we're here to help.</p>
    <h3>Return Policy</h3>
    <ul>
      <li>Items must be returned within 7 days of delivery.</li>
      <li>Items must be in their original packaging and unused condition.</li>
      <li>Proof of purchase is required for all returns.</li>
    </ul>
    <h3>Refunds</h3>
    <p>Once we receive and inspect your return, we will notify you of the approval or rejection of your refund. Approved refunds will be processed via bank transfer within 3-5 business days.</p>
  </PageWrapper>
);

export const ContactPage = () => (
  <PageWrapper title="Contact Us" icon={<Mail className="h-6 w-6" />}>
    <p>Have questions or need assistance? Our team is ready to help you.</p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
      <div className="text-center space-y-2">
        <Phone className="h-6 w-6 mx-auto text-orange-600" />
        <h4 className="font-bold">Phone</h4>
        <p className="text-sm text-slate-600">+234 800 123 4567</p>
      </div>
      <div className="text-center space-y-2">
        <Mail className="h-6 w-6 mx-auto text-orange-600" />
        <h4 className="font-bold">Email</h4>
        <p className="text-sm text-slate-600">support@zamsmart.com</p>
      </div>
      <div className="text-center space-y-2">
        <MapPin className="h-6 w-6 mx-auto text-orange-600" />
        <h4 className="font-bold">Office</h4>
        <p className="text-sm text-slate-600">123 Victoria Island, Lagos, Nigeria</p>
      </div>
    </div>
  </PageWrapper>
);
