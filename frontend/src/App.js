import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [naturalQuery, setNaturalQuery] = useState('');
  const [queryResults, setQueryResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [semanticMappings, setSemanticMappings] = useState([]);
  const [activeTab, setActiveTab] = useState('query');
  const [newMapping, setNewMapping] = useState({
    business_term: '',
    database_field: '',
    description: '',
    table_name: ''
  });

  // ERD State
  const [tableSchemas, setTableSchemas] = useState([]);
  const [tableRelationships, setTableRelationships] = useState([]);
  const [erdConfigurations, setErdConfigurations] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState(null);
  const [draggedTable, setDraggedTable] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    loadDashboardData();
    loadSemanticMappings();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/overview`);
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadSemanticMappings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/semantic-mappings`);
      const data = await response.json();
      setSemanticMappings(data.mappings || []);
    } catch (error) {
      console.error('Error loading semantic mappings:', error);
    }
  };

  const handleNaturalQuery = async (e) => {
    e.preventDefault();
    if (!naturalQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: naturalQuery }),
      });

      const data = await response.json();
      setQueryResults(data);
    } catch (error) {
      console.error('Error processing query:', error);
      setQueryResults({ error: 'Failed to process query' });
    } finally {
      setLoading(false);
    }
  };

  const addSemanticMapping = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/semantic-mappings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMapping),
      });

      if (response.ok) {
        setNewMapping({
          business_term: '',
          database_field: '',
          description: '',
          table_name: ''
        });
        loadSemanticMappings();
      }
    } catch (error) {
      console.error('Error adding semantic mapping:', error);
    }
  };

  const renderChart = (data, type = 'bar') => {
    if (!data || data.length === 0) return null;

    const maxValue = Math.max(...data.map(item => 
      Object.values(item).find(val => typeof val === 'number') || 0
    ));

    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Query Results</h3>
        <div className="space-y-3">
          {data.map((item, index) => {
            const label = item._id || `Item ${index + 1}`;
            const value = Object.values(item).find(val => typeof val === 'number') || 0;
            const percentage = (value / maxValue) * 100;

            return (
              <div key={index} className="flex items-center">
                <div className="w-32 text-sm font-medium truncate">{label}</div>
                <div className="flex-1 mx-3">
                  <div className="bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-blue-500 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-20 text-right text-sm font-semibold">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDashboardOverview = () => {
    if (!dashboardData) return null;

    const { production_summary, production_by_line, defect_trends, equipment_downtime } = dashboardData;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* KPI Cards */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium opacity-90">Total Production</h3>
          <p className="text-2xl font-bold">{production_summary?.total_actual?.toLocaleString() || 0}</p>
          <p className="text-sm opacity-75">
            Efficiency: {production_summary?.total_actual && production_summary?.total_planned 
              ? Math.round((production_summary.total_actual / production_summary.total_planned) * 100) 
              : 0}%
          </p>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium opacity-90">Total Defects</h3>
          <p className="text-2xl font-bold">{production_summary?.total_defects?.toLocaleString() || 0}</p>
          <p className="text-sm opacity-75">
            Rate: {production_summary?.total_defects && production_summary?.total_actual
              ? ((production_summary.total_defects / production_summary.total_actual) * 100).toFixed(2)
              : 0}%
          </p>
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium opacity-90">Total Downtime</h3>
          <p className="text-2xl font-bold">{production_summary?.total_downtime || 0} min</p>
          <p className="text-sm opacity-75">
            {production_summary?.total_downtime ? Math.round(production_summary.total_downtime / 60) : 0} hours
          </p>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium opacity-90">Production Lines</h3>
          <p className="text-2xl font-bold">{production_by_line?.length || 0}</p>
          <p className="text-sm opacity-75">Active lines</p>
        </div>
      </div>
    );
  };

  const sampleQueries = [
    "Show me production efficiency by production line",
    "What are the defect rates for each line last week?",
    "Display equipment downtime by type",
    "Show me quality issues by severity",
    "Which production line has the highest defect rate?",
    "Show me production trends over time"
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">
                  <span className="text-blue-600">Gen</span>BI
                </h1>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Tyre Manufacturing Intelligence</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('query')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'query'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Natural Language Query
              </button>
              <button
                onClick={() => setActiveTab('semantic')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'semantic'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Semantic Layer
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'query' && (
          <div className="space-y-8">
            {/* Dashboard Overview */}
            {renderDashboardOverview()}

            {/* Natural Language Query Interface */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-6">Ask Questions About Your Manufacturing Data</h2>
              
              <form onSubmit={handleNaturalQuery} className="mb-6">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={naturalQuery}
                    onChange={(e) => setNaturalQuery(e.target.value)}
                    placeholder="e.g., Show me defect rates by production line this week"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !naturalQuery.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Processing...' : 'Query'}
                  </button>
                </div>
              </form>

              {/* Sample Queries */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Try these sample queries:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {sampleQueries.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => setNaturalQuery(query)}
                      className="text-left p-3 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      "{query}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Query Results */}
              {queryResults && (
                <div className="space-y-6">
                  {queryResults.error ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      Error: {queryResults.error}
                    </div>
                  ) : (
                    <>
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900">Query: "{queryResults.query}"</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Found {queryResults.total_records} results
                        </p>
                      </div>
                      
                      {renderChart(queryResults.results, queryResults.chart_type)}
                      
                      {/* Raw Data */}
                      <details className="bg-gray-50 p-4 rounded-lg">
                        <summary className="cursor-pointer font-medium">View Raw Data</summary>
                        <pre className="mt-4 text-xs overflow-x-auto">
                          {JSON.stringify(queryResults.results, null, 2)}
                        </pre>
                      </details>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'semantic' && (
          <div className="space-y-8">
            {/* Semantic Layer Management */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-6">Semantic Layer - Business Context Mapping</h2>
              
              {/* Add New Mapping */}
              <form onSubmit={addSemanticMapping} className="mb-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Add New Business Term Mapping</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Business Term (e.g., 'efficiency')"
                    value={newMapping.business_term}
                    onChange={(e) => setNewMapping({...newMapping, business_term: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Database Field (e.g., 'actual_production')"
                    value={newMapping.database_field}
                    onChange={(e) => setNewMapping({...newMapping, database_field: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Table Name (e.g., 'production_data')"
                    value={newMapping.table_name}
                    onChange={(e) => setNewMapping({...newMapping, table_name: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newMapping.description}
                    onChange={(e) => setNewMapping({...newMapping, description: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Mapping
                </button>
              </form>

              {/* Existing Mappings */}
              <div>
                <h3 className="text-lg font-medium mb-4">Current Business Term Mappings</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Business Term
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Database Field
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Table
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {semanticMappings.map((mapping, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {mapping.business_term}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                            {mapping.database_field}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {mapping.table_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {mapping.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;