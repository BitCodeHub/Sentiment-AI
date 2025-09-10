import React, { useState } from 'react';
import { Calendar, Info } from 'lucide-react';
import './DateRangePicker.css';

const DateRangePicker = ({ 
  metadata, 
  onRangeChange, 
  disabled = false 
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showQuickSelect, setShowQuickSelect] = useState(false);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Format date for input field
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Quick date range options
  const quickRanges = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Last 6 months', days: 180 },
    { label: 'Last year', days: 365 },
    { label: 'All reviews', days: null }
  ];

  const handleQuickSelect = (days) => {
    if (days === null) {
      setStartDate('');
      setEndDate('');
      onRangeChange(null, null);
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      
      setStartDate(startStr);
      setEndDate(endStr);
      onRangeChange(startStr, endStr);
    }
    setShowQuickSelect(false);
  };

  const handleStartDateChange = (e) => {
    const value = e.target.value;
    setStartDate(value);
    onRangeChange(value, endDate);
  };

  const handleEndDateChange = (e) => {
    const value = e.target.value;
    setEndDate(value);
    onRangeChange(startDate, value);
  };

  // Get min and max dates from metadata
  const minDate = metadata?.dateRange?.oldest ? 
    formatDateForInput(metadata.dateRange.oldest) : '';
  const maxDate = metadata?.dateRange?.newest ? 
    formatDateForInput(metadata.dateRange.newest) : '';

  return (
    <div className="date-range-picker">
      {metadata && (
        <div className="metadata-info">
          <Info size={16} />
          <span className="info-text">
            {metadata.estimatedCount} reviews available from {formatDate(metadata.dateRange.oldest)} to {formatDate(metadata.dateRange.newest)}
          </span>
        </div>
      )}

      <div className="date-inputs">
        <div className="date-input-group">
          <label>
            <Calendar size={16} />
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            min={minDate}
            max={maxDate}
            disabled={disabled || !metadata}
          />
        </div>

        <div className="date-input-group">
          <label>
            <Calendar size={16} />
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            min={minDate}
            max={maxDate}
            disabled={disabled || !metadata}
          />
        </div>

        <div className="quick-select-wrapper">
          <button
            type="button"
            className="quick-select-btn"
            onClick={() => setShowQuickSelect(!showQuickSelect)}
            disabled={disabled || !metadata}
          >
            Quick Select
          </button>
          
          {showQuickSelect && (
            <div className="quick-select-dropdown">
              {quickRanges.map((range) => (
                <button
                  key={range.label}
                  type="button"
                  className="quick-range-option"
                  onClick={() => handleQuickSelect(range.days)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {(startDate || endDate) && (
        <div className="selected-range-info">
          <span>
            Selected range: {startDate || 'Any'} to {endDate || 'Any'}
          </span>
          <button
            type="button"
            className="clear-range-btn"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              onRangeChange(null, null);
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;