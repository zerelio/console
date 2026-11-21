const React = require('react');

module.exports = {
  ResponsiveContainer: function ResponsiveContainer({ children }) {
    return React.createElement('div', { 'data-testid': 'recharts-responsive-container' }, children);
  },
  BarChart: function BarChart({ children }) {
    return React.createElement('div', { 'data-testid': 'recharts-bar-chart' }, children);
  },
  Bar: function Bar() {
    return React.createElement('div', { 'data-testid': 'recharts-bar' });
  },
  XAxis: function XAxis() {
    return React.createElement('div', { 'data-testid': 'recharts-x-axis' });
  },
  YAxis: function YAxis() {
    return React.createElement('div', { 'data-testid': 'recharts-y-axis' });
  },
  CartesianGrid: function CartesianGrid() {
    return React.createElement('div', { 'data-testid': 'recharts-cartesian-grid' });
  },
  Tooltip: function Tooltip() {
    return React.createElement('div', { 'data-testid': 'recharts-tooltip' });
  },
};
