// Major Automotive OEMs (Original Equipment Manufacturers)
export const automotiveOEMs = [
  // Traditional OEMs
  {
    id: 'toyota',
    name: 'Toyota',
    country: 'Japan',
    brands: ['Toyota', 'Lexus'],
    marketCap: '250B',
    founded: 1937,
    categories: ['Mass Market', 'Luxury', 'Hybrid Leader'],
    strengths: ['Reliability', 'Hybrid Technology', 'Production Efficiency'],
    appNames: ['Toyota', 'Lexus', 'myToyota']
  },
  {
    id: 'volkswagen',
    name: 'Volkswagen Group',
    country: 'Germany',
    brands: ['VW', 'Audi', 'Porsche', 'Bentley', 'Lamborghini', 'Bugatti'],
    marketCap: '80B',
    founded: 1937,
    categories: ['Mass Market', 'Luxury', 'Performance'],
    strengths: ['Engineering', 'Brand Portfolio', 'European Market Share'],
    appNames: ['We Connect', 'myAudi', 'Porsche Connect']
  },
  {
    id: 'stellantis',
    name: 'Stellantis',
    country: 'Netherlands',
    brands: ['Jeep', 'Ram', 'Chrysler', 'Dodge', 'Fiat', 'Alfa Romeo', 'Maserati', 'Peugeot', 'Citroën', 'Opel'],
    marketCap: '55B',
    founded: 2021,
    categories: ['Mass Market', 'SUV/Truck Leader', 'Global Reach'],
    strengths: ['SUV Portfolio', 'Brand Diversity', 'Merger Synergies'],
    appNames: ['Uconnect', 'My Jeep', 'Ram App']
  },
  {
    id: 'gm',
    name: 'General Motors',
    country: 'USA',
    brands: ['Chevrolet', 'GMC', 'Cadillac', 'Buick'],
    marketCap: '60B',
    founded: 1908,
    categories: ['Mass Market', 'Trucks', 'EV Transition'],
    strengths: ['Truck Market', 'EV Platform', 'North American Presence'],
    appNames: ['myChevrolet', 'myCadillac', 'myGMC']
  },
  {
    id: 'ford',
    name: 'Ford Motor Company',
    country: 'USA',
    brands: ['Ford', 'Lincoln'],
    marketCap: '55B',
    founded: 1903,
    categories: ['Mass Market', 'Trucks', 'Performance'],
    strengths: ['F-Series Dominance', 'Mustang Brand', 'Commercial Vehicles'],
    appNames: ['FordPass', 'Lincoln Way']
  },
  {
    id: 'mercedes',
    name: 'Mercedes-Benz Group',
    country: 'Germany',
    brands: ['Mercedes-Benz', 'Mercedes-AMG', 'Maybach'],
    marketCap: '75B',
    founded: 1926,
    categories: ['Luxury', 'Performance', 'Innovation'],
    strengths: ['Luxury Technology', 'Brand Prestige', 'Safety Innovation'],
    appNames: ['Mercedes me', 'Mercedes-Benz']
  },
  {
    id: 'bmw',
    name: 'BMW Group',
    country: 'Germany',
    brands: ['BMW', 'MINI', 'Rolls-Royce'],
    marketCap: '70B',
    founded: 1916,
    categories: ['Luxury', 'Performance', 'Premium'],
    strengths: ['Driving Dynamics', 'Premium Brand', 'Engineering Excellence'],
    appNames: ['My BMW', 'MINI', 'BMW Connected']
  },
  {
    id: 'honda',
    name: 'Honda Motor Company',
    country: 'Japan',
    brands: ['Honda', 'Acura'],
    marketCap: '55B',
    founded: 1948,
    categories: ['Mass Market', 'Reliability', 'Motorcycles'],
    strengths: ['Engine Technology', 'Fuel Efficiency', 'Reliability'],
    appNames: ['HondaLink', 'AcuraLink']
  },
  {
    id: 'nissan',
    name: 'Nissan Motor Corporation',
    country: 'Japan',
    brands: ['Nissan', 'Infiniti'],
    marketCap: '20B',
    founded: 1933,
    categories: ['Mass Market', 'EV Pioneer', 'Value'],
    strengths: ['Early EV Adoption', 'Value Proposition', 'Global Alliance'],
    appNames: ['NissanConnect', 'INFINITI InTouch']
  },
  {
    id: 'hyundai-kia',
    name: 'Hyundai-Kia',
    country: 'South Korea',
    brands: ['Hyundai', 'Kia', 'Genesis'],
    marketCap: '85B',
    founded: 1967,
    categories: ['Mass Market', 'Value', 'Design'],
    strengths: ['Design Innovation', 'Warranty', 'Value for Money'],
    appNames: ['Hyundai Bluelink', 'Kia Connect', 'Genesis Connected Services']
  },
  
  // EV-Focused OEMs
  {
    id: 'tesla',
    name: 'Tesla',
    country: 'USA',
    brands: ['Tesla'],
    marketCap: '800B',
    founded: 2003,
    categories: ['Pure EV', 'Technology', 'Autonomous'],
    strengths: ['EV Technology', 'Software', 'Charging Network', 'Brand Loyalty'],
    appNames: ['Tesla']
  },
  {
    id: 'rivian',
    name: 'Rivian',
    country: 'USA',
    brands: ['Rivian'],
    marketCap: '25B',
    founded: 2009,
    categories: ['Pure EV', 'Adventure', 'Trucks/SUVs'],
    strengths: ['Adventure Focus', 'Electric Trucks', 'Amazon Partnership'],
    appNames: ['Rivian']
  },
  {
    id: 'lucid',
    name: 'Lucid Motors',
    country: 'USA',
    brands: ['Lucid'],
    marketCap: '15B',
    founded: 2007,
    categories: ['Pure EV', 'Luxury', 'Technology'],
    strengths: ['Range Leadership', 'Luxury Interior', 'Battery Technology'],
    appNames: ['Lucid Mobile']
  },
  {
    id: 'nio',
    name: 'NIO',
    country: 'China',
    brands: ['NIO'],
    marketCap: '20B',
    founded: 2014,
    categories: ['Pure EV', 'Premium', 'Battery Swap'],
    strengths: ['Battery Swap Technology', 'User Experience', 'China Market'],
    appNames: ['NIO']
  },
  {
    id: 'xpeng',
    name: 'XPeng',
    country: 'China',
    brands: ['XPeng'],
    marketCap: '15B',
    founded: 2014,
    categories: ['Pure EV', 'Technology', 'Autonomous'],
    strengths: ['Autonomous Features', 'OTA Updates', 'Young Demographics'],
    appNames: ['XPeng']
  },
  {
    id: 'byd',
    name: 'BYD',
    country: 'China',
    brands: ['BYD'],
    marketCap: '100B',
    founded: 1995,
    categories: ['EV Leader', 'Battery Manufacturer', 'Commercial'],
    strengths: ['Battery Production', 'Vertical Integration', 'China Dominance'],
    appNames: ['BYD']
  },
  {
    id: 'polestar',
    name: 'Polestar',
    country: 'Sweden',
    brands: ['Polestar'],
    marketCap: '10B',
    founded: 2017,
    categories: ['Pure EV', 'Performance', 'Scandinavian Design'],
    strengths: ['Design', 'Performance EV', 'Sustainability Focus'],
    appNames: ['Polestar']
  },
  
  // Luxury/Specialty OEMs
  {
    id: 'ferrari',
    name: 'Ferrari',
    country: 'Italy',
    brands: ['Ferrari'],
    marketCap: '50B',
    founded: 1939,
    categories: ['Ultra Luxury', 'Performance', 'Exclusive'],
    strengths: ['Brand Exclusivity', 'Racing Heritage', 'Profit Margins'],
    appNames: ['Ferrari']
  },
  {
    id: 'porsche',
    name: 'Porsche (standalone)',
    country: 'Germany',
    brands: ['Porsche'],
    marketCap: '80B',
    founded: 1931,
    categories: ['Luxury Performance', 'Sports Cars', 'SUVs'],
    strengths: ['Engineering Excellence', 'Brand Value', 'Taycan Success'],
    appNames: ['Porsche Connect', 'My Porsche']
  },
  {
    id: 'jaguar-land-rover',
    name: 'Jaguar Land Rover',
    country: 'UK',
    brands: ['Jaguar', 'Land Rover', 'Range Rover'],
    marketCap: '15B',
    founded: 2008,
    categories: ['Luxury', 'SUV', 'British Heritage'],
    strengths: ['Off-Road Capability', 'Luxury SUVs', 'British Design'],
    appNames: ['Jaguar InControl', 'Land Rover InControl']
  },
  {
    id: 'mazda',
    name: 'Mazda',
    country: 'Japan',
    brands: ['Mazda'],
    marketCap: '5B',
    founded: 1920,
    categories: ['Premium Mass Market', 'Design', 'Driving Dynamics'],
    strengths: ['Design Philosophy', 'Driving Engagement', 'SkyActiv Technology'],
    appNames: ['MyMazda']
  },
  {
    id: 'subaru',
    name: 'Subaru',
    country: 'Japan',
    brands: ['Subaru'],
    marketCap: '15B',
    founded: 1953,
    categories: ['AWD Specialist', 'Safety', 'Outdoors'],
    strengths: ['All-Wheel Drive', 'Safety Ratings', 'Brand Loyalty'],
    appNames: ['MySubaru']
  }
];

// Helper function to get OEM by ID
export const getOEMById = (id) => {
  return automotiveOEMs.find(oem => oem.id === id);
};

// Helper function to get OEMs by category
export const getOEMsByCategory = (category) => {
  return automotiveOEMs.filter(oem => 
    oem.categories.some(cat => cat.toLowerCase().includes(category.toLowerCase()))
  );
};

// Helper function to get competitor OEMs for a given OEM
export const getCompetitors = (oemId) => {
  const oem = getOEMById(oemId);
  if (!oem) return [];
  
  // Find OEMs with overlapping categories
  const competitors = automotiveOEMs.filter(competitor => {
    if (competitor.id === oemId) return false;
    
    const sharedCategories = competitor.categories.filter(cat =>
      oem.categories.some(oemCat => 
        oemCat.toLowerCase().includes(cat.toLowerCase()) ||
        cat.toLowerCase().includes(oemCat.toLowerCase())
      )
    );
    
    return sharedCategories.length > 0;
  });
  
  return competitors;
};

// Categories for filtering
export const oemCategories = [
  'All',
  'Mass Market',
  'Luxury',
  'Pure EV',
  'Performance',
  'Trucks/SUVs',
  'Premium',
  'Technology'
];