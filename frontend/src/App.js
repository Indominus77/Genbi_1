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
    loadTableSchemas();
    loadTableRelationships();
    loadERDConfigurations();
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

  const loadTableSchemas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/table-schemas`);
      const data = await response.json();
      setTableSchemas(data.schemas || []);
    } catch (error) {
      console.error('Error loading table schemas:', error);
    }
  };

  const loadTableRelationships = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/table-relationships`);
      const data = await response.json();
      setTableRelationships(data.relationships || []);
    } catch (error) {
      console.error('Error loading table relationships:', error);
    }
  };

  const loadERDConfigurations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/erd-configurations`);
      const data = await response.json();
      setErdConfigurations(data.configurations || []);
    } catch (error) {
      console.error('Error loading ERD configurations:', error);
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

  // ERD Functions
  const handleTableDragStart = (e, table) => {
    setDraggedTable(table);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTableDrag = (e, table) => {
    e.preventDefault();
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCanvasDrop = async (e) => {
    e.preventDefault();
    if (!draggedTable) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update table position
    const updatedTable = {
      ...draggedTable,
      position: { x, y }
    };

    try {
      await fetch(`${API_BASE_URL}/api/table-schemas/${draggedTable.table_name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTable),
      });

      // Update local state
      setTableSchemas(prev => 
        prev.map(table => 
          table.table_name === draggedTable.table_name 
            ? updatedTable 
            : table
        )
      );
    } catch (error) {
      console.error('Error updating table position:', error);
    }

    setDraggedTable(null);
  };

  const handleTableClick = (table) => {
    if (isConnecting) {
      if (!connectionStart) {
        setConnectionStart(table);
      } else if (connectionStart.table_name !== table.table_name) {
        // Create relationship
        createTableRelationship(connectionStart, table);
        setConnectionStart(null);
        setIsConnecting(false);
      }
    } else {
      setSelectedTable(table);
    }
  };

  const createTableRelationship = async (fromTable, toTable) => {
    const relationship = {
      from_table: fromTable.table_name,
      to_table: toTable.table_name,
      from_column: fromTable.columns.find(col => col.primary_key)?.name || fromTable.columns[0]?.name,
      to_column: toTable.columns.find(col => col.primary_key)?.name || toTable.columns[0]?.name,
      relationship_type: 'one-to-many',
      description: `Relationship between ${fromTable.table_name} and ${toTable.table_name}`
    };

    try {
      await fetch(`${API_BASE_URL}/api/table-relationships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(relationship),
      });

      loadTableRelationships();
    } catch (error) {
      console.error('Error creating table relationship:', error);
    }
  };

  const deleteTableRelationship = async (relationshipId) => {
    try {
      await fetch(`${API_BASE_URL}/api/table-relationships/${relationshipId}`, {
        method: 'DELETE',
      });

      loadTableRelationships();
    } catch (error) {
      console.error('Error deleting table relationship:', error);
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

  // ERD Rendering Functions
  const renderTableSchema = (table) => {
    const isSelected = selectedTable?.table_name === table.table_name;
    const isConnectionSource = connectionStart?.table_name === table.table_name;
    
    return (
      <div
        key={table.table_name}
        className={`absolute bg-white border-2 rounded-lg shadow-lg p-4 min-w-48 cursor-move select-none transition-all duration-200 ${
          isSelected ? 'border-blue-500 shadow-xl' : 'border-gray-300'
        } ${isConnectionSource ? 'border-green-500 bg-green-50' : ''}`}
        style={{
          left: table.position?.x || 100,
          top: table.position?.y || 100,
          zIndex: isSelected ? 10 : 1
        }}
        draggable
        onDragStart={(e) => handleTableDragStart(e, table)}
        onDrag={(e) => handleTableDrag(e, table)}
        onClick={() => handleTableClick(table)}
      >
        <div className="bg-blue-600 text-white px-3 py-2 rounded-t -mx-4 -mt-4 mb-3">
          <h3 className="font-bold text-sm">{table.table_name}</h3>
          {table.description && (
            <p className="text-xs opacity-90 mt-1">{table.description}</p>
          )}
        </div>

        <div className="space-y-1">
          {table.columns?.map((column, index) => (
            <div
              key={index}
              className={`flex items-center text-xs p-1 rounded ${
                column.primary_key ? 'bg-yellow-100 font-semibold' : 'bg-gray-50'
              }`}
            >
              <div className="flex-1">
                <span className={column.primary_key ? 'text-yellow-700' : 'text-gray-700'}>
                  {column.name}
                </span>
              </div>
              <div className="text-gray-500 text-xs">
                {column.type}
                {column.primary_key && <span className="ml-1 text-yellow-600">🔑</span>}
                {!column.nullable && <span className="ml-1 text-red-500">*</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600"
             title="Click to connect tables"></div>
        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600"
             title="Click to connect tables"></div>
      </div>
    );
  };

  const renderConnectionLines = () => {
    return tableRelationships.map((relationship, index) => {
      const fromTable = tableSchemas.find(t => t.table_name === relationship.from_table);
      const toTable = tableSchemas.find(t => t.table_name === relationship.to_table);
      
      if (!fromTable || !toTable) return null;

      const fromX = (fromTable.position?.x || 100) + 96;
      const fromY = (fromTable.position?.y || 100) + 50;
      const toX = (toTable.position?.x || 100) + 96;
      const toY = (toTable.position?.y || 100) + 50;

      return (
        <svg
          key={index}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: '100%', height: '100%', zIndex: 0 }}
        >
          <defs>
            <marker
              id={`arrowhead-${index}`}
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={relationship.relationship_type === 'one-to-many' ? '#3b82f6' : '#10b981'}
              />
            </marker>
          </defs>
          <line
            x1={fromX}
            y1={fromY}
            x2={toX}
            y2={toY}
            stroke={relationship.relationship_type === 'one-to-many' ? '#3b82f6' : '#10b981'}
            strokeWidth="2"
            markerEnd={`url(#arrowhead-${index})`}
          />
          <text
            x={(fromX + toX) / 2}
            y={(fromY + toY) / 2 - 10}
            fill="#6b7280"
            fontSize="10"
            textAnchor="middle"
            className="pointer-events-auto cursor-pointer"
            onClick={() => deleteTableRelationship(relationship._id)}
            title="Click to delete relationship"
          >
            {relationship.relationship_type}
          </text>
        </svg>
      );
    });
  };

  const renderERDBuilder = () => {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Entity Relationship Diagram Builder</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsConnecting(!isConnecting)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isConnecting
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isConnecting ? 'Cancel Connection' : 'Connect Tables'}
            </button>
            <button
              onClick={loadTableSchemas}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="relative">
          <div
            className="relative bg-gradient-to-br from-gray-50 to-gray-100 min-h-96"
            style={{ height: '600px', width: '100%' }}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
          >
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle, #94a3b8 1px, transparent 1px)`,
                backgroundSize: '20px 20px'
              }}
            ></div>

            {renderConnectionLines()}
            {tableSchemas.map(table => renderTableSchema(table))}

            {isConnecting && (
              <div className="absolute top-4 left-4 bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded-lg">
                <p className="text-sm font-medium">Connection Mode Active</p>
                <p className="text-xs">Click on two tables to create a relationship</p>
                {connectionStart && (
                  <p className="text-xs mt-1">
                    From: <span className="font-semibold">{connectionStart.table_name}</span> → Click target table
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {selectedTable && (
          <div className="border-t bg-gray-50 p-6">
            <h3 className="text-lg font-semibold mb-4">Table Details: {selectedTable.table_name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Columns</h4>
                <div className="space-y-1">
                  {selectedTable.columns?.map((column, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className={column.primary_key ? 'font-semibold text-yellow-700' : ''}>
                        {column.name}
                      </span>
                      <span className="text-gray-500">
                        {column.type}
                        {column.primary_key && ' (PK)'}
                        {!column.nullable && ' (NOT NULL)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Relationships</h4>
                <div className="space-y-1">
                  {tableRelationships
                    .filter(rel => rel.from_table === selectedTable.table_name || rel.to_table === selectedTable.table_name)
                    .map((rel, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{rel.from_table}</span>
                        <span className="text-gray-500 mx-2">→</span>
                        <span className="font-medium">{rel.to_table}</span>
                        <span className="text-xs text-gray-500 ml-2">({rel.relationship_type})</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedTable(null)}
              className="mt-4 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
            >
              Close Details
            </button>
          </div>
        )}
      </div>
    );
  };

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
              <button
                onClick={() => setActiveTab('erd')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'erd'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ERD Builder
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