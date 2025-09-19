// Utility function to parse natural language date requests
export const parseDateRequest = (request) => {
  const now = new Date();
  const requestLower = request.toLowerCase();
  
  // Start of current week (Sunday)
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };
  
  // End of current week (Saturday)
  const getEndOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + 6;
    return new Date(d.setDate(diff));
  };
  
  // Parse different date requests
  if (requestLower.includes("this week") || requestLower.includes("current week")) {
    const start = getStartOfWeek(now);
    start.setHours(0, 0, 0, 0);
    const end = getEndOfWeek(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "This Week" };
  }
  
  if (requestLower.includes("last week") || requestLower.includes("previous week")) {
    const lastWeek = new Date(now);
    lastWeek.setDate(now.getDate() - 7);
    const start = getStartOfWeek(lastWeek);
    start.setHours(0, 0, 0, 0);
    const end = getEndOfWeek(lastWeek);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "Last Week" };
  }
  
  if (requestLower.includes("today")) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "Today" };
  }
  
  if (requestLower.includes("yesterday")) {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const start = new Date(yesterday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(yesterday);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "Yesterday" };
  }
  
  if (requestLower.includes("this month") || requestLower.includes("current month")) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "This Month" };
  }
  
  if (requestLower.includes("last month") || requestLower.includes("previous month")) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "Last Month" };
  }
  
  if (requestLower.includes("last 7 days") || requestLower.includes("past week")) {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "Last 7 Days" };
  }
  
  if (requestLower.includes("last 30 days") || requestLower.includes("past month")) {
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "Last 30 Days" };
  }
  
  if (requestLower.includes("last 90 days") || requestLower.includes("past quarter")) {
    const start = new Date(now);
    start.setDate(now.getDate() - 90);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "Last 90 Days" };
  }
  
  // Default: all time
  return null;
};

// Check if a request is asking for an intelligence briefing
export const isIntelligenceBriefingRequest = (request) => {
  const requestLower = request.toLowerCase();
  return requestLower.includes("intelligence briefing") || 
         requestLower.includes("executive briefing") ||
         requestLower.includes("executive analysis") ||
         requestLower.includes("executive summary");
};