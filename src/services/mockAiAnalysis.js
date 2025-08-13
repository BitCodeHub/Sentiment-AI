// Mock AI Analysis for testing when OpenAI API is not available

export const getMockAnalysis = () => {
  return {
    mainPainPoints: [
      "App crashes frequently when trying to connect to vehicle",
      "Remote start feature is unreliable and often fails",
      "Login issues - users getting logged out randomly",
      "Slow loading times when accessing vehicle status",
      "Push notifications arrive late or not at all"
    ],
    featureRequests: [
      "Apple Watch app support",
      "Widget for quick access to remote start",
      "Ability to schedule remote climate control",
      "Integration with Siri shortcuts",
      "Dark mode support"
    ],
    technicalIssues: [
      "Bluetooth connectivity drops frequently",
      "GPS location not updating in real-time",
      "App freezes on splash screen",
      "Error messages not descriptive enough"
    ],
    uiuxFeedback: "Users find the interface cluttered and navigation confusing. Many request a simpler, more intuitive design with fewer taps to access common features.",
    overallSentiment: "Mixed - While users appreciate the remote features, technical issues and reliability problems significantly impact user satisfaction",
    recommendations: [
      "Prioritize fixing app stability and crash issues",
      "Implement comprehensive error handling and recovery",
      "Redesign UI for simpler navigation",
      "Add offline mode for basic features",
      "Improve server response times"
    ]
  };
};

export const getMockInsights = () => {
  return {
    executiveSummary: "The MyHyundai app shows strong potential but is hindered by technical reliability issues. With an average rating of 3.2/5, users appreciate the remote features but are frustrated by frequent crashes and connectivity problems.",
    keyStrengths: [
      "Remote start and climate control features are highly valued",
      "Vehicle status monitoring saves users time",
      "Integration with Blue Link services",
      "Helpful maintenance reminders",
      "Good customer support response"
    ],
    criticalIssues: [
      "App stability - 35% of negative reviews mention crashes",
      "Login/authentication problems affecting 20% of users",
      "Slow performance impacting user experience",
      "Inconsistent remote command execution",
      "Poor error handling and recovery"
    ],
    trendAnalysis: "Review sentiment has declined 15% over the past 3 months, primarily due to increased crash reports after the latest update. Positive reviews focus on convenience features, while negative reviews consistently cite reliability issues.",
    competitivePositioning: "Compared to competitors like Tesla and Ford apps, MyHyundai needs to improve reliability and add modern features like widgets and smartwatch support to remain competitive in the connected car app market."
  };
};