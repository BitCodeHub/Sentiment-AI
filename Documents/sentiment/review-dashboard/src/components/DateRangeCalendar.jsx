import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import './DateRangeCalendar.css';

const DateRangeCalendar = ({ reviews, onDateRangeChange, initialRange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedRange, setSelectedRange] = useState(() => {
    return initialRange && (initialRange.start || initialRange.end) 
      ? initialRange 
      : { start: null, end: null };
  });
  const [selectingStart, setSelectingStart] = useState(true);
  const [hoveredDate, setHoveredDate] = useState(null);
  const displayRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Calculate date range from reviews data
  const dataDateRange = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      const now = new Date();
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      return { min: threeMonthsAgo, max: now };
    }

    const dates = reviews.map(review => {
      // Handle various date formats from the review data
      const dateValue = review.date || review.Date || review['Review Date'];
      if (!dateValue) return null;
      
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
      return isNaN(date.getTime()) ? null : date;
    }).filter(date => date !== null);
    
    if (dates.length === 0) {
      const now = new Date();
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      return { min: threeMonthsAgo, max: now };
    }
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    return { min: minDate, max: maxDate };
  }, [reviews]);

  // Set initial current month to the start of the data range
  useEffect(() => {
    if (dataDateRange.min) {
      setCurrentMonth(new Date(dataDateRange.min.getFullYear(), dataDateRange.min.getMonth(), 1));
    }
  }, [dataDateRange]);

  // Update selectedRange when initialRange changes
  useEffect(() => {
    if (initialRange && (initialRange.start || initialRange.end)) {
      setSelectedRange(initialRange);
    }
  }, [initialRange]);

  // Preset date ranges
  const presets = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return [
      {
        label: 'Last 7 Days',
        start: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
        end: today
      },
      {
        label: 'Last 14 Days',
        start: new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000),
        end: today
      },
      {
        label: 'Last 90 Days',
        start: new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000),
        end: today
      },
      {
        label: 'Last 365 Days',
        start: new Date(today.getTime() - 364 * 24 * 60 * 60 * 1000),
        end: today
      },
      {
        label: 'This Month',
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
      },
      {
        label: 'Last Month',
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0)
      },
      {
        label: 'This Year',
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31)
      },
      {
        label: 'All Time',
        start: dataDateRange.min,
        end: dataDateRange.max
      }
    ];
  }, [dataDateRange]);

  const formatDateRange = () => {
    if (!selectedRange.start && !selectedRange.end) {
      return 'Select date range';
    }
    
    const start = selectedRange.start || dataDateRange.min;
    const end = selectedRange.end || dataDateRange.max;
    return `${formatDate(start)} → ${formatDate(end)}`;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const handlePresetClick = (preset) => {
    const newRange = { start: preset.start, end: preset.end };
    setSelectedRange(newRange);
    setSelectingStart(true);
    onDateRangeChange(newRange);
    setIsOpen(false);
  };

  const handleDateClick = (date) => {
    if (selectingStart) {
      setSelectedRange({ start: date, end: null });
      setSelectingStart(false);
    } else {
      const start = selectedRange.start;
      const end = date;
      
      // Ensure start is before end
      const finalRange = start <= end 
        ? { start, end }
        : { start: end, end: start };
      
      setSelectedRange(finalRange);
      onDateRangeChange(finalRange);
      setSelectingStart(true);
      setIsOpen(false);
    }
  };

  const isDateInRange = (date) => {
    if (!selectedRange.start) return false;
    
    if (selectingStart || !selectedRange.end) {
      // If we're selecting start or no end date, only highlight start
      return date.toDateString() === selectedRange.start.toDateString();
    }
    
    // Check if date is in the selected range
    const start = selectedRange.start;
    const end = selectedRange.end;
    return date >= start && date <= end;
  };

  const isDateInHoverRange = (date) => {
    if (!selectedRange.start || selectingStart || !hoveredDate) return false;
    
    const start = selectedRange.start;
    const end = hoveredDate;
    const minDate = start <= end ? start : end;
    const maxDate = start <= end ? end : start;
    
    return date >= minDate && date <= maxDate;
  };

  const generateCalendarDays = (month) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const current = new Date(startDate);
    
    // Generate 6 weeks worth of days (42 days)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const renderCalendar = (monthOffset = 0) => {
    const month = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset, 1);
    const days = generateCalendarDays(month);
    const monthName = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    return (
      <div className="calendar-month">
        <div className="calendar-header">
          {monthOffset === 0 && (
            <button className="nav-button" onClick={() => navigateMonth(-1)}>
              <ChevronLeft size={16} />
            </button>
          )}
          <h3 className="month-title">{monthName}</h3>
          {monthOffset === 1 && (
            <button className="nav-button" onClick={() => navigateMonth(1)}>
              <ChevronRight size={16} />
            </button>
          )}
        </div>
        
        <div className="calendar-weekdays">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="weekday">{day}</div>
          ))}
        </div>
        
        <div className="calendar-grid">
          {days.map((date, index) => {
            const isCurrentMonth = date.getMonth() === month.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = isDateInRange(date);
            const isHovered = isDateInHoverRange(date);
            const isOutsideDataRange = date < dataDateRange.min || date > dataDateRange.max;
            
            return (
              <button
                key={index}
                className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isOutsideDataRange ? 'disabled' : ''}`}
                onClick={() => !isOutsideDataRange && handleDateClick(date)}
                onMouseEnter={() => !isOutsideDataRange && setHoveredDate(date)}
                onMouseLeave={() => setHoveredDate(null)}
                disabled={isOutsideDataRange}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && displayRef.current) {
      const rect = displayRef.current.getBoundingClientRect();
      const dropdownHeight = 600; // Approximate height of dropdown
      const dropdownWidth = 700; // Width of dropdown
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const margin = 20; // Margin from viewport edges
      
      let top = rect.bottom + 8;
      let left = rect.left - 200;
      
      // Check if dropdown would go off bottom of screen
      if (top + dropdownHeight > viewportHeight - margin) {
        // Position above the button instead
        top = rect.top - dropdownHeight - 8;
        
        // If still too high, center it vertically
        if (top < margin) {
          top = Math.max(margin, (viewportHeight - dropdownHeight) / 2);
        }
      }
      
      // Check horizontal boundaries
      if (left < margin) {
        left = margin;
      } else if (left + dropdownWidth > viewportWidth - margin) {
        left = viewportWidth - dropdownWidth - margin;
      }
      
      setDropdownPosition({ top, left });
    }
  }, [isOpen]);

  return (
    <div className="date-range-filter">
      <div 
        ref={displayRef}
        className="date-range-display" 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        style={{ cursor: 'pointer' }}
        tabIndex={0}
        role="button"
        aria-label="Select date range"
        aria-expanded={isOpen}
      >
        <Calendar size={16} />
        <span className="date-range-text">{formatDateRange()}</span>
        <ChevronRight size={16} className={`chevron ${isOpen ? 'open' : ''}`} />
      </div>
      
      {isOpen && createPortal(
        <>
          <div 
            className="date-range-backdrop" 
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
              background: 'transparent'
            }}
          />
          <div 
            className="date-range-dropdown"
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              zIndex: 9999,
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto'
            }}
          >
            <div className="date-range-content">
            <div className="presets-section">
              <h4>Presets</h4>
              <div className="presets-list">
                {presets.map((preset, index) => (
                  <button
                    key={index}
                    className="preset-button"
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="calendar-section">
              <div className="calendar-header-info">
                <h4>Date Range</h4>
                <div className="range-inputs">
                  <input
                    type="text"
                    value={selectedRange.start ? formatDate(selectedRange.start) : ''}
                    placeholder="Start date"
                    readOnly
                  />
                  <span>to</span>
                  <input
                    type="text"
                    value={selectedRange.end ? formatDate(selectedRange.end) : ''}
                    placeholder="End date"
                    readOnly
                  />
                </div>
              </div>
              
              <div className="calendars-container">
                {renderCalendar(0)}
                {renderCalendar(1)}
              </div>
              
              <div className="calendar-actions">
                <button 
                  className="cancel-button" 
                  onClick={() => {
                    setSelectedRange(initialRange || { start: null, end: null });
                    setSelectingStart(true);
                    setIsOpen(false);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="apply-button"
                  onClick={() => {
                    onDateRangeChange(selectedRange);
                    setIsOpen(false);
                  }}
                  disabled={!selectedRange.start && !selectedRange.end}
                >
                  <span>{selectedRange.start && selectedRange.end ? 'Apply Date Range' : 'Select Dates'}</span>
                </button>
              </div>
            </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default DateRangeCalendar;