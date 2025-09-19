import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import RivueChatbot from './RivueChatbot';
import './RivueDashboard.css';

const RivueDashboard = ({ appName, appData }) => {
  const [showChatbot, setShowChatbot] = useState(false);

  return (
    <>
      {/* Rivue AI Assistant Button for Dashboard */}
      <button 
        className="rivue-dashboard-trigger"
        onClick={() => setShowChatbot(true)}
        aria-label="Open Rivue AI Assistant"
      >
        <Bot size={20} />
        <span>Rivue AI</span>
      </button>
      
      {/* Rivue Chatbot for Dashboard Context */}
      <RivueChatbot 
        competitors={[]}
        userApp={appName || 'Your App'}
        analysisType="dashboard"
        isOpen={showChatbot}
        onClose={() => setShowChatbot(false)}
        context="dashboard"
      />
    </>
  );
};

export default RivueDashboard;