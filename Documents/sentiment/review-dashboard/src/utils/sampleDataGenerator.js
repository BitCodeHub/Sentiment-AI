import * as XLSX from 'xlsx';

// Sample review templates
const reviewTemplates = {
  positive: [
    "This app is amazing! Love all the features and smooth performance. Great work!",
    "Great app for managing my vehicle. Love how easy it is to use every time.",
    "Perfect! Everything works as expected. Saves me so much time. Love it!",
    "Love the remote start feature. Works flawlessly every time I use it.",
    "Best car app I've used. Great work on the GPS tracking. Love the accuracy.",
    "Excellent app! Love that it works great and saves time with maintenance reminders.",
    "5 stars! The app makes owning a Hyundai great. Love using it all the time.",
    "Fantastic update! Great new features that work perfectly. Love the improvements!"
  ],
  negative: [
    "App crashes constantly. Doesn't work at all. Waste of time trying to use it.",
    "Login doesn't work. Can't use the app. Wasted so much time troubleshooting.",
    "Too slow to use. Doesn't work properly. Time consuming and frustrating.",
    "Remote start doesn't work half the time I try to use it. Very disappointed.",
    "App freezes and doesn't work when I use it to check vehicle status.",
    "Terrible to use. Hard to make it work. Wastes my time every day.",
    "Connection errors every time I use it. Doesn't work! Please fix this!",
    "App stopped working after update. Can't use any features. Total waste of time."
  ],
  neutral: [
    "App works okay but could use some improvements. Use it from time to time.",
    "Basic functionality works but missing features. Use it when I have time.",
    "It's fine for basic use. Works most of the time. Nothing special.",
    "Average app. Works when I use it. Does what it's supposed to do.",
    "Works most of the time I use it. Some minor issues with daily use.",
    "Decent app that works but room for improvement. Use it regularly.",
    "Functional app that works but not impressive. Time to update it.",
    "Gets the work done but interface could use improvement over time."
  ],
  featureRequest: [
    "Please add Apple Watch support!",
    "Would love to see widget support for quick access.",
    "Can you add scheduled remote start feature?",
    "Please add dark mode to the app.",
    "Would be nice to have voice commands.",
    "Add support for multiple vehicles please.",
    "Need better notification customization options.",
    "Please add fuel price tracking feature."
  ],
  bugReport: [
    "Bug: GPS location not updating correctly.",
    "Error when trying to lock doors remotely.",
    "Climate control settings not saving properly.",
    "Push notifications not working on iOS 17.",
    "Bug report: Vehicle status shows incorrect mileage.",
    "Map view crashes when zooming in.",
    "Bluetooth connection drops frequently.",
    "Error 404 when accessing service history."
  ]
};

const authors = [
  "John D.", "Sarah M.", "Mike R.", "Lisa K.", "David S.",
  "Emma W.", "Chris P.", "Amy L.", "Robert T.", "Jennifer B.",
  "User123", "CarLover", "TechGuy", "HappyDriver", "Anonymous"
];

const versions = ["3.7.0", "3.7.1", "3.7.2", "3.8.0", "3.8.1", "5.3.2"];
const devices = [
  { model: "iPhone 14 Pro Max", os: "iOS 17.0" },
  { model: "iPhone 13", os: "iOS 16.5" },
  { model: "iPhone 14", os: "iOS 17.1" },
  { model: "Samsung Galaxy S23", os: "Android 13" },
  { model: "Samsung Galaxy Z Fold4", os: "Android 13" },
  { model: "Google Pixel 7", os: "Android 14" },
  { model: "iPad Pro", os: "iPadOS 16.0" },
  { model: "Samsung Galaxy S22", os: "Android 13" },
  { model: "iPhone 15 Pro", os: "iOS 17.2" },
  { model: "OnePlus 11", os: "Android 13" },
  { model: "Google Pixel 8", os: "Android 14" }
];

// Language and country distribution matching the dashboard image
const languageDistribution = [
  { language: 'English', weight: 0.97 },
  { language: 'Spanish', weight: 0.02 },
  { language: 'Korean', weight: 0.005 },
  { language: 'Russian', weight: 0.005 }
];

export const generateSampleExcelData = () => {
  const reviews = [];
  const totalReviews = 400; // Generate 400 reviews to match the dashboard
  
  // Generate reviews with distribution matching the review stars breakdown
  // Based on the image: 5 stars: 159, 4 stars: 28, 3 stars: 31, 2 stars: 42, 1 star: 144
  const distribution = {
    positive: 0.47,      // ~47% positive (159+28)/400
    negative: 0.46,      // ~46% negative (144+42)/400
    neutral: 0.07,       // ~7% neutral (31)/400
    featureRequest: 0.0, // Included in above categories
    bugReport: 0.0       // Included in above categories
  };
  
  let reviewId = 1;
  
  Object.entries(distribution).forEach(([type, percentage]) => {
    const count = Math.floor(totalReviews * percentage);
    const templates = reviewTemplates[type];
    
    for (let i = 0; i < count; i++) {
      // For feature requests and bug reports, pick from appropriate templates
      const actualType = (type === 'featureRequest' || type === 'bugReport') ? 
        (Math.random() < 0.5 ? 'positive' : 'negative') : type;
      
      const templateArray = templates[type] || templates[actualType];
      const template = templateArray[Math.floor(Math.random() * templateArray.length)];
      
      // Distribute ratings to match the breakdown: 5:159, 4:28, 3:31, 2:42, 1:144
      let rating;
      if (actualType === 'positive') {
        // For positive reviews: most are 5 stars (159), some are 4 stars (28)
        rating = Math.random() < 0.85 ? 5 : 4;
      } else if (actualType === 'negative') {
        // For negative reviews: most are 1 star (144), some are 2 stars (42)
        rating = Math.random() < 0.77 ? 1 : 2;
      } else {
        // Neutral reviews get 3 stars
        rating = 3;
      }
      
      const daysAgo = Math.floor(Math.random() * 90); // Reviews from last 90 days
      const reviewDate = new Date();
      reviewDate.setDate(reviewDate.getDate() - daysAgo);
      
      // Determine language based on distribution
      const langRandom = Math.random();
      let cumulative = 0;
      let selectedLang = 'English';
      
      for (const lang of languageDistribution) {
        cumulative += lang.weight;
        if (langRandom <= cumulative) {
          selectedLang = lang.language;
          break;
        }
      }
      
      const deviceInfo = devices[Math.floor(Math.random() * devices.length)];
      const platform = deviceInfo.model.includes('iPhone') || deviceInfo.model.includes('iPad') ? 'iOS' : 'Android';
      
      reviews.push({
        'Review ID': `R${reviewId++}`,
        'Rating': rating,
        'Review Title': type === 'positive' ? 'Great app!' :
                       type === 'negative' ? 'Needs work' :
                       type === 'featureRequest' ? 'Feature request' :
                       type === 'bugReport' ? 'Bug report' :
                       'My experience',
        'Body': template, // Add Body column as shown in the dashboard requirement
        'Review Text': template,
        'Author': authors[Math.floor(Math.random() * authors.length)],
        'Date': reviewDate.toISOString().split('T')[0],
        'App Version': versions[Math.floor(Math.random() * versions.length)],
        'Device Model': deviceInfo.model,
        'Platform': platform,
        'OS': deviceInfo.os,
        'Country': 'U.S.', // Set all to U.S. as shown in the dashboard
        'Language': selectedLang,
        'Developer Response': Math.random() > 0.8 ? 'Thank you for your feedback! We appreciate your input and are working to improve the app.' : ''
      });
    }
  });
  
  // Shuffle reviews to mix dates
  reviews.sort(() => Math.random() - 0.5);
  
  return reviews;
};

export const downloadSampleExcel = () => {
  const data = generateSampleExcelData();
  
  // Create workbook and worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reviews");
  
  // Generate buffer
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  // Create blob and download
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sample_app_reviews.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};