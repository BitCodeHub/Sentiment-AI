import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart
} from 'recharts';
import './ChatVisualization.css';

const COLORS = ['#8b5cf6', '#60a5fa', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

const ChatVisualization = ({ type, data, title, config = {} }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chat-visualization-error">
        No data available for visualization
      </div>
    );
  }

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis 
          dataKey={config.xAxis || "date"} 
          stroke="rgba(255, 255, 255, 0.5)"
          tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
        />
        <YAxis 
          stroke="rgba(255, 255, 255, 0.5)"
          tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.8)', 
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px'
          }}
        />
        <Legend wrapperStyle={{ color: 'rgba(255, 255, 255, 0.7)' }} />
        {config.lines?.map((line, index) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name || line.key}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            dot={{ fill: COLORS[index % COLORS.length], r: 4 }}
            activeDot={{ r: 6 }}
          />
        )) || (
          <Line
            type="monotone"
            dataKey={config.yAxis || "value"}
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis 
          dataKey={config.xAxis || "name"} 
          stroke="rgba(255, 255, 255, 0.5)"
          tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
        />
        <YAxis 
          stroke="rgba(255, 255, 255, 0.5)"
          tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.8)', 
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px'
          }}
        />
        <Legend wrapperStyle={{ color: 'rgba(255, 255, 255, 0.7)' }} />
        {config.bars?.map((bar, index) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.name || bar.key}
            fill={COLORS[index % COLORS.length]}
          />
        )) || (
          <Bar 
            dataKey={config.yAxis || "value"} 
            fill="#8b5cf6"
            radius={[8, 8, 0, 0]}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey={config.valueKey || "value"}
          nameKey={config.nameKey || "name"}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.8)', 
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px'
          }}
        />
        <Legend wrapperStyle={{ color: 'rgba(255, 255, 255, 0.7)' }} />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderTable = () => (
    <div className="chat-table-container">
      <table className="chat-table">
        <thead>
          <tr>
            {config.columns?.map((col) => (
              <th key={col.key}>{col.label || col.key}</th>
            )) || Object.keys(data[0] || {}).map((key) => (
              <th key={key}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              {config.columns?.map((col) => (
                <td key={col.key}>
                  {col.formatter ? col.formatter(row[col.key]) : row[col.key]}
                </td>
              )) || Object.keys(row).map((key) => (
                <td key={key}>{row[key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis 
          dataKey={config.xAxis || "date"} 
          stroke="rgba(255, 255, 255, 0.5)"
          tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
        />
        <YAxis 
          stroke="rgba(255, 255, 255, 0.5)"
          tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.8)', 
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px'
          }}
        />
        <Legend wrapperStyle={{ color: 'rgba(255, 255, 255, 0.7)' }} />
        {config.areas?.map((area, index) => (
          <Area
            key={area.key}
            type="monotone"
            dataKey={area.key}
            name={area.name || area.key}
            stroke={COLORS[index % COLORS.length]}
            fill={COLORS[index % COLORS.length]}
            fillOpacity={0.3}
          />
        )) || (
          <Area
            type="monotone"
            dataKey={config.yAxis || "value"}
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.3}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderVisualization = () => {
    switch (type) {
      case 'line':
      case 'trend':
        return renderLineChart();
      case 'bar':
        return renderBarChart();
      case 'pie':
        return renderPieChart();
      case 'table':
        return renderTable();
      case 'area':
        return renderAreaChart();
      default:
        return <div className="chat-visualization-error">Unknown visualization type: {type}</div>;
    }
  };

  return (
    <div className="chat-visualization">
      {title && <h4 className="visualization-title">{title}</h4>}
      {renderVisualization()}
    </div>
  );
};

export default ChatVisualization;