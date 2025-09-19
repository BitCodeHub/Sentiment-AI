// Mock data for testing and development
export const getMockReviews = () => {
  return [
    {
      id: 1,
      rating: 5,
      content: "Great app! Remote start works perfectly and I love being able to check my car status from anywhere.",
      date: new Date().toISOString(),
      author: "Happy User",
      sentiment: "Positive",
      version: "3.9.0"
    },
    {
      id: 2,
      rating: 1,
      content: "App crashes constantly after the latest update. Can't even open it without it freezing.",
      date: new Date().toISOString(),
      author: "Frustrated User",
      sentiment: "Negative",
      version: "3.9.0"
    },
    {
      id: 3,
      rating: 3,
      content: "Works okay but could use some improvements. Login process is confusing.",
      date: new Date().toISOString(),
      author: "Average User",
      sentiment: "Neutral",
      version: "3.8.5"
    },
    {
      id: 4,
      rating: 2,
      content: "Remote features are unreliable. Sometimes works, sometimes doesn't. Very frustrating.",
      date: new Date().toISOString(),
      author: "Disappointed User",
      sentiment: "Negative",
      version: "3.9.0"
    },
    {
      id: 5,
      rating: 4,
      content: "Good app overall. Would be 5 stars if it had Apple Watch support.",
      date: new Date().toISOString(),
      author: "Tech User",
      sentiment: "Positive",
      version: "3.9.0"
    }
  ];
};

export const getMockAggregatedData = () => {
  return {
    summary: {
      totalReviews: 5,
      avgRating: 3.0,
      totalDownloads: "1M+"
    },
    sentimentDistribution: {
      Positive: 2,
      Negative: 2,
      Neutral: 1
    },
    ratingDistribution: {
      5: 1,
      4: 1,
      3: 1,
      2: 1,
      1: 1
    },
    topKeywords: [
      { word: "app", count: 5 },
      { word: "remote", count: 3 },
      { word: "crashes", count: 2 },
      { word: "works", count: 3 },
      { word: "features", count: 2 }
    ]
  };
};