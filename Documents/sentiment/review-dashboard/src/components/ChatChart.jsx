import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart
} from 'recharts';
import { Card } from './ui/card';

const CHART_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#f97316', '#6366f1', '#84cc16'
];

const ChatChart = ({ chartData, chartType, title }) => {
  if (!chartData || !chartType) return null;

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={chartData.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey={chartData.xKey || 'name'} 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1a1f2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            {chartData.legend !== false && <Legend />}
            {chartData.bars?.map((bar, index) => (
              <Bar 
                key={bar.key}
                dataKey={bar.key}
                fill={bar.color || CHART_COLORS[index]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={chartData.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey={chartData.xKey || 'name'}
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1a1f2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            {chartData.legend !== false && <Legend />}
            {chartData.lines?.map((line, index) => (
              <Line 
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={line.color || CHART_COLORS[index]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData.data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey={chartData.valueKey || 'value'}
            >
              {chartData.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1a1f2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
            />
            {chartData.legend !== false && <Legend />}
          </PieChart>
        );

      case 'area':
        return (
          <AreaChart data={chartData.data}>
            <defs>
              {chartData.areas?.map((area, index) => (
                <linearGradient key={area.key} id={`gradient-${area.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={area.color || CHART_COLORS[index]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={area.color || CHART_COLORS[index]} stopOpacity={0.1}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey={chartData.xKey || 'name'}
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1a1f2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            {chartData.legend !== false && <Legend />}
            {chartData.areas?.map((area, index) => (
              <Area 
                key={area.key}
                type="monotone"
                dataKey={area.key}
                stroke={area.color || CHART_COLORS[index]}
                fillOpacity={1}
                fill={`url(#gradient-${area.key})`}
              />
            ))}
          </AreaChart>
        );

      case 'radar':
        return (
          <RadarChart data={chartData.data}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis 
              dataKey={chartData.angleKey || 'subject'}
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <PolarRadiusAxis 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1a1f2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
            />
            {chartData.radars?.map((radar, index) => (
              <Radar 
                key={radar.key}
                dataKey={radar.key}
                stroke={radar.color || CHART_COLORS[index]}
                fill={radar.color || CHART_COLORS[index]}
                fillOpacity={0.6}
              />
            ))}
            {chartData.legend !== false && <Legend />}
          </RadarChart>
        );

      case 'composed':
        return (
          <ComposedChart data={chartData.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey={chartData.xKey || 'name'}
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              yAxisId="left"
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            {chartData.rightAxis && (
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
              />
            )}
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1a1f2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            {chartData.legend !== false && <Legend />}
            {chartData.bars?.map((bar, index) => (
              <Bar 
                key={bar.key}
                yAxisId={bar.axis || 'left'}
                dataKey={bar.key}
                fill={bar.color || CHART_COLORS[index]}
                radius={[4, 4, 0, 0]}
              />
            ))}
            {chartData.lines?.map((line, index) => (
              <Line 
                key={line.key}
                yAxisId={line.axis || 'left'}
                type="monotone"
                dataKey={line.key}
                stroke={line.color || CHART_COLORS[index + 2]}
                strokeWidth={2}
              />
            ))}
          </ComposedChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width="100%" height={400}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default ChatChart;