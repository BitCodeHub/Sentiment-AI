// Gemini API Quota Tracker
// Helps track API usage and provides user-friendly quota information

class GeminiQuotaTracker {
  constructor() {
    this.storageKey = 'gemini-api-usage';
    this.quotaLimits = {
      'gemini-1.5-flash': { daily: 1500, perMinute: 15 },
      'gemini-1.5-pro': { daily: 50, perMinute: 2 },
      'gemini-2.0-flash-exp': { daily: 1500, perMinute: 15 }
    };
    this.loadUsage();
  }

  // Load usage data from localStorage
  loadUsage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      this.usage = stored ? JSON.parse(stored) : this.getEmptyUsage();
      this.cleanupOldData();
    } catch (err) {
      console.error('[QuotaTracker] Error loading usage:', err);
      this.usage = this.getEmptyUsage();
    }
  }

  // Get empty usage object
  getEmptyUsage() {
    return {
      daily: {},
      minutely: {},
      lastReset: new Date().toISOString()
    };
  }

  // Clean up data older than 24 hours
  cleanupOldData() {
    const now = new Date();
    const yesterday = new Date(now - 24 * 60 * 60 * 1000);
    
    // Clean daily usage
    Object.keys(this.usage.daily).forEach(date => {
      if (new Date(date) < yesterday) {
        delete this.usage.daily[date];
      }
    });

    // Clean minutely usage
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    Object.keys(this.usage.minutely).forEach(timestamp => {
      if (new Date(parseInt(timestamp)) < oneHourAgo) {
        delete this.usage.minutely[timestamp];
      }
    });

    this.saveUsage();
  }

  // Save usage data
  saveUsage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.usage));
    } catch (err) {
      console.error('[QuotaTracker] Error saving usage:', err);
    }
  }

  // Track API call
  trackCall(modelName, success = true) {
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    const minuteKey = Math.floor(now.getTime() / 60000) * 60000; // Round to minute

    // Initialize if needed
    if (!this.usage.daily[dateKey]) {
      this.usage.daily[dateKey] = {};
    }
    if (!this.usage.daily[dateKey][modelName]) {
      this.usage.daily[dateKey][modelName] = { success: 0, failed: 0 };
    }
    if (!this.usage.minutely[minuteKey]) {
      this.usage.minutely[minuteKey] = {};
    }
    if (!this.usage.minutely[minuteKey][modelName]) {
      this.usage.minutely[minuteKey][modelName] = 0;
    }

    // Track the call
    if (success) {
      this.usage.daily[dateKey][modelName].success++;
    } else {
      this.usage.daily[dateKey][modelName].failed++;
    }
    this.usage.minutely[minuteKey][modelName]++;

    this.saveUsage();
    console.log(`[QuotaTracker] Tracked ${success ? 'successful' : 'failed'} call for ${modelName}`);
  }

  // Get current usage stats
  getUsageStats(modelName) {
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    const minuteKey = Math.floor(now.getTime() / 60000) * 60000;

    const dailyUsage = this.usage.daily[dateKey]?.[modelName] || { success: 0, failed: 0 };
    const minuteUsage = this.usage.minutely[minuteKey]?.[modelName] || 0;
    
    // If model not in quotaLimits, treat as unlimited (experimental models)
    const limits = this.quotaLimits[modelName] || { daily: 'unlimited', perMinute: 'unlimited' };

    return {
      model: modelName,
      daily: {
        used: dailyUsage.success + dailyUsage.failed,
        successful: dailyUsage.success,
        failed: dailyUsage.failed,
        limit: limits.daily,
        remaining: limits.daily === 'unlimited' ? 'unlimited' : Math.max(0, limits.daily - dailyUsage.success)
      },
      perMinute: {
        used: minuteUsage,
        limit: limits.perMinute,
        remaining: limits.perMinute === 'unlimited' ? 'unlimited' : Math.max(0, limits.perMinute - minuteUsage)
      }
    };
  }

  // Check if quota is exceeded
  isQuotaExceeded(modelName) {
    const stats = this.getUsageStats(modelName);
    
    if (stats.daily.limit !== 'unlimited' && stats.daily.successful >= stats.daily.limit) {
      return { exceeded: true, type: 'daily', resetTime: this.getNextResetTime() };
    }
    
    if (stats.perMinute.limit !== 'unlimited' && stats.perMinute.used >= stats.perMinute.limit) {
      return { exceeded: true, type: 'minute', resetTime: new Date(Date.now() + 60000) };
    }

    return { exceeded: false };
  }

  // Get next reset time
  getNextResetTime() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  // Get human-readable quota message
  getQuotaMessage(modelName) {
    const stats = this.getUsageStats(modelName);
    const quotaCheck = this.isQuotaExceeded(modelName);

    if (quotaCheck.exceeded) {
      const resetIn = this.formatTimeUntil(quotaCheck.resetTime);
      if (quotaCheck.type === 'daily') {
        return `Daily quota exceeded (${stats.daily.used}/${stats.daily.limit}). Resets in ${resetIn}.`;
      } else {
        return `Rate limit exceeded. Please wait ${resetIn} before trying again.`;
      }
    }

    if (stats.daily.limit !== 'unlimited') {
      const percentUsed = (stats.daily.successful / stats.daily.limit) * 100;
      if (percentUsed >= 80) {
        return `Warning: ${stats.daily.remaining} API calls remaining today (${percentUsed.toFixed(0)}% used).`;
      }
    }

    return null;
  }

  // Format time until a future date
  formatTimeUntil(futureDate) {
    const diff = futureDate - new Date();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // Reset all usage data (for testing)
  resetUsage() {
    this.usage = this.getEmptyUsage();
    this.saveUsage();
    console.log('[QuotaTracker] Usage data reset');
  }
}

// Export singleton instance
export const geminiQuotaTracker = new GeminiQuotaTracker();