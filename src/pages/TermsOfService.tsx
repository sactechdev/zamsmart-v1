import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { FileText, Loader2 } from 'lucide-react';

export const TermsOfService: React.FC = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'terms_of_service')
        .single();
      
      if (data) {
        setContent(data.value.content);
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 md:p-12 rounded-3xl border border-slate-100 shadow-xl space-y-8"
      >
        <div className="flex items-center space-x-4 border-b border-slate-100 pb-6">
          <div className="p-3 bg-orange-100 rounded-2xl">
            <FileText className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Terms of Service</h1>
            <p className="text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="prose prose-slate max-w-none">
          {content ? (
            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
              {content}
            </div>
          ) : (
            <p className="text-slate-500 italic">Terms of Service content is currently being updated. Please check back later.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
