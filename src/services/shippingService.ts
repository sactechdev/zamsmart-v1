import { supabase } from '../lib/supabase';

export interface ShippingCalculationInput {
  state: string;
  items: { product_id: string; quantity: number }[];
}

export interface ShippingCalculationResult {
  zone: string;
  shipping_fee: number;
  chargeable_weight: number;
  estimated_days_min: number;
  estimated_days_max: number;
}

const DEFAULT_SHIPPING_FEE = 2500;

export async function calculateShipping(input: ShippingCalculationInput): Promise<ShippingCalculationResult> {
  try {
    if (!input.state || !input.items || input.items.length === 0) {
      throw new Error('Invalid input');
    }

    // 1. Get Zone for the state
    const { data: stateData, error: stateError } = await supabase
      .from('shipping_states')
      .select('zone_id, shipping_zones(*)')
      .eq('state_name', input.state)
      .single();

    if (stateError || !stateData) {
      console.warn('No zone found for state:', input.state);
      return fallbackResult();
    }

    const zone = Array.isArray(stateData.shipping_zones) 
      ? stateData.shipping_zones[0] 
      : stateData.shipping_zones;

    if (!zone) {
      return fallbackResult();
    }

    const zoneId = stateData.zone_id;

    // 2. Fetch all products in the cart to get weights and dimensions
    const productIds = input.items.map(item => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, weight_kg, length_cm, width_cm, height_cm')
      .in('id', productIds);

    if (productsError || !products) {
      console.warn('Error fetching products for shipping calculation');
      return fallbackResult(zone.name, zone.estimated_days_min, zone.estimated_days_max);
    }

    // 3. Calculate total weight and volumetric weight
    let totalActualWeight = 0;
    let totalVolumetricWeight = 0;

    input.items.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        const weight = product.weight_kg || 0.5;
        const length = product.length_cm || 0;
        const width = product.width_cm || 0;
        const height = product.height_cm || 0;

        totalActualWeight += weight * item.quantity;
        
        if (length > 0 && width > 0 && height > 0) {
          // Volumetric weight formula: (L x W x H) / 5000
          const volumetric = (length * width * height) / 5000;
          totalVolumetricWeight += volumetric * item.quantity;
        }
      }
    });

    const chargeableWeight = Math.max(totalActualWeight, totalVolumetricWeight);

    // 4. Fetch the rate for this zone and weight
    const { data: rateData, error: rateError } = await supabase
      .from('shipping_rates')
      .select('base_fee')
      .eq('zone_id', zoneId)
      .lte('min_weight_kg', chargeableWeight)
      .gt('max_weight_kg', chargeableWeight)
      .single();

    // If no exact match (e.g. weight exceeds max tier), try to find the highest tier
    if (rateError || !rateData) {
      const { data: maxRateData } = await supabase
        .from('shipping_rates')
        .select('base_fee')
        .eq('zone_id', zoneId)
        .order('max_weight_kg', { ascending: false })
        .limit(1)
        .single();

      if (maxRateData) {
        return {
          zone: zone.name,
          shipping_fee: maxRateData.base_fee,
          chargeable_weight: chargeableWeight,
          estimated_days_min: zone.estimated_days_min,
          estimated_days_max: zone.estimated_days_max
        };
      }

      return fallbackResult(zone.name, zone.estimated_days_min, zone.estimated_days_max);
    }

    return {
      zone: zone.name,
      shipping_fee: rateData.base_fee,
      chargeable_weight: chargeableWeight,
      estimated_days_min: zone.estimated_days_min,
      estimated_days_max: zone.estimated_days_max
    };

  } catch (error) {
    console.error('Shipping calculation error:', error);
    return fallbackResult();
  }
}

function fallbackResult(zoneName = 'Unknown', min = 3, max = 7): ShippingCalculationResult {
  return {
    zone: zoneName,
    shipping_fee: DEFAULT_SHIPPING_FEE,
    chargeable_weight: 0,
    estimated_days_min: min,
    estimated_days_max: max
  };
}
