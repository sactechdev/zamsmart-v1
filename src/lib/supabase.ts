import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-id')) {
  console.warn('Supabase credentials missing or invalid. Please check your environment variables.');
  // We use a timeout to ensure the toaster is ready
  setTimeout(() => {
    toast.error('Supabase Configuration Missing! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment variables.', {
      duration: 10000,
      position: 'top-center',
    });
  }, 1000);
}

export const supabase = createClient(
  supabaseUrl || 'https://auiguvhjhnzwbfwwntgg.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1aWd1dmhqaG56d2Jmd3dudGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3Mjc4NzQsImV4cCI6MjA4NzMwMzg3NH0.G4HTPZc8ULkK5c3tSWlekLphyW4_EmYwie1hU8oyTnk'
);

export const uploadImage = async (file: File, bucket: string = 'images'): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return data.publicUrl;
};
