import requests
import unittest
import json
import sys
from datetime import datetime
import uuid

class GenBIAPITester:
    def __init__(self, base_url="https://5041aa39-bdbf-431d-8310-44c70da6152e.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.text}")
                    return False, response.json()
                except:
                    return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test the health endpoint"""
        success, response = self.run_test(
            "Health Endpoint",
            "GET",
            "api/health",
            200
        )
        if success:
            print(f"Health Status: {response.get('status')}")
            print(f"Timestamp: {response.get('timestamp')}")
        return success

    def test_dashboard_overview(self):
        """Test the dashboard overview endpoint"""
        success, response = self.run_test(
            "Dashboard Overview",
            "GET",
            "api/dashboard/overview",
            200
        )
        if success:
            print("Dashboard Overview Data:")
            if 'production_summary' in response:
                print(f"- Total Production: {response['production_summary'].get('total_actual', 0)}")
                print(f"- Total Defects: {response['production_summary'].get('total_defects', 0)}")
                print(f"- Total Downtime: {response['production_summary'].get('total_downtime', 0)} minutes")
            
            if 'production_by_line' in response:
                print(f"- Production Lines: {len(response['production_by_line'])}")
                for line in response['production_by_line']:
                    print(f"  * {line.get('_id')}: {line.get('production')} units, {line.get('defects')} defects")
        return success

    def test_semantic_mappings_get(self):
        """Test getting semantic mappings"""
        success, response = self.run_test(
            "Get Semantic Mappings",
            "GET",
            "api/semantic-mappings",
            200
        )
        if success:
            mappings = response.get('mappings', [])
            print(f"Retrieved {len(mappings)} semantic mappings")
            for mapping in mappings[:3]:  # Show first 3 mappings
                print(f"- {mapping.get('business_term')}: {mapping.get('database_field')} ({mapping.get('table_name')})")
        return success

    def test_semantic_mappings_post(self):
        """Test creating a semantic mapping"""
        test_mapping = {
            "business_term": f"test_term_{datetime.now().strftime('%H%M%S')}",
            "database_field": "test_field",
            "description": "Test mapping for API validation",
            "table_name": "production_data"
        }
        
        success, response = self.run_test(
            "Create Semantic Mapping",
            "POST",
            "api/semantic-mappings",
            200,
            data=test_mapping
        )
        if success:
            print(f"Created mapping with ID: {response.get('id')}")
        return success

    def test_natural_language_query(self, query_text):
        """Test the natural language query endpoint"""
        success, response = self.run_test(
            f"Natural Language Query: '{query_text}'",
            "POST",
            "api/query",
            200,
            data={"query": query_text}
        )
        if success:
            print(f"Query: {response.get('query')}")
            print(f"Results: {response.get('total_records')} records")
            print(f"Chart Type: {response.get('chart_type')}")
            
            # Print first few results
            results = response.get('results', [])
            for i, result in enumerate(results[:3]):
                print(f"- Result {i+1}: {result}")
                
            if 'pipeline' in response:
                print(f"Pipeline: {json.dumps(response['pipeline'][:2])}...")
        return success
    
    # ERD Builder API Tests
    def test_table_schemas_get(self):
        """Test getting table schemas for ERD"""
        success, response = self.run_test(
            "Get Table Schemas",
            "GET",
            "api/table-schemas",
            200
        )
        if success:
            schemas = response.get('schemas', [])
            print(f"Retrieved {len(schemas)} table schemas")
            for schema in schemas[:3]:  # Show first 3 schemas
                print(f"- {schema.get('table_name')}: {len(schema.get('columns', []))} columns")
                if 'position' in schema:
                    print(f"  Position: x={schema['position'].get('x')}, y={schema['position'].get('y')}")
        return success
    
    def test_table_relationships_get(self):
        """Test getting table relationships for ERD"""
        success, response = self.run_test(
            "Get Table Relationships",
            "GET",
            "api/table-relationships",
            200
        )
        if success:
            relationships = response.get('relationships', [])
            print(f"Retrieved {len(relationships)} table relationships")
            for rel in relationships[:3]:  # Show first 3 relationships
                print(f"- {rel.get('from_table')} → {rel.get('to_table')} ({rel.get('relationship_type')})")
                print(f"  Columns: {rel.get('from_column')} → {rel.get('to_column')}")
        return success
    
    def test_erd_configurations_get(self):
        """Test getting ERD configurations"""
        success, response = self.run_test(
            "Get ERD Configurations",
            "GET",
            "api/erd-configurations",
            200
        )
        if success:
            configs = response.get('configurations', [])
            print(f"Retrieved {len(configs)} ERD configurations")
            for config in configs:
                print(f"- {config.get('name')}: {len(config.get('tables', []))} tables, {len(config.get('relationships', []))} relationships")
        return success
    
    def test_table_schema_update(self, table_name):
        """Test updating a table schema position"""
        # First get the current schema
        _, response = self.run_test(
            f"Get Table Schema for {table_name}",
            "GET",
            "api/table-schemas",
            200
        )
        
        schemas = response.get('schemas', [])
        table_schema = next((s for s in schemas if s.get('table_name') == table_name), None)
        
        if not table_schema:
            print(f"❌ Table schema for {table_name} not found")
            return False
        
        # Update the position
        new_x = 200 + int(datetime.now().timestamp()) % 300
        new_y = 150 + int(datetime.now().timestamp()) % 200
        
        updated_schema = table_schema.copy()
        if 'position' not in updated_schema:
            updated_schema['position'] = {}
        updated_schema['position']['x'] = new_x
        updated_schema['position']['y'] = new_y
        
        success, response = self.run_test(
            f"Update Table Schema Position for {table_name}",
            "PUT",
            f"api/table-schemas/{table_name}",
            200,
            data=updated_schema
        )
        
        if success:
            print(f"Updated {table_name} position to x={new_x}, y={new_y}")
        
        return success
    
    def test_table_relationship_create(self):
        """Test creating a new table relationship"""
        # Create a test relationship
        test_relationship = {
            "from_table": "production_data",
            "to_table": "quality_metrics",
            "from_column": "production_line",
            "to_column": "production_line",
            "relationship_type": "one-to-many",
            "description": f"Test relationship created at {datetime.now().isoformat()}"
        }
        
        success, response = self.run_test(
            "Create Table Relationship",
            "POST",
            "api/table-relationships",
            200,
            data=test_relationship
        )
        
        if success:
            print(f"Created relationship with ID: {response.get('id')}")
            print(f"From: {test_relationship['from_table']} → To: {test_relationship['to_table']}")
        
        return success
    
    def test_table_relationship_delete(self):
        """Test deleting a table relationship"""
        # First get all relationships
        _, response = self.run_test(
            "Get Table Relationships for Delete Test",
            "GET",
            "api/table-relationships",
            200
        )
        
        relationships = response.get('relationships', [])
        if not relationships:
            print("❌ No relationships found to delete")
            return False
        
        # Find a relationship to delete (preferably a test one)
        relationship_to_delete = next(
            (r for r in relationships if r.get('description', '').startswith('Test relationship')),
            relationships[0]
        )
        
        relationship_id = relationship_to_delete.get('_id')
        if not relationship_id:
            print("❌ No relationship ID found to delete")
            return False
        
        success, _ = self.run_test(
            f"Delete Table Relationship {relationship_id}",
            "DELETE",
            f"api/table-relationships/{relationship_id}",
            200
        )
        
        if success:
            print(f"Successfully deleted relationship between {relationship_to_delete.get('from_table')} and {relationship_to_delete.get('to_table')}")
        
        return success

def main():
    # Setup
    tester = GenBIAPITester()
    
    # Run tests
    print("\n===== GenBI API Testing =====\n")
    
    # Test health endpoint
    health_ok = tester.test_health_endpoint()
    if not health_ok:
        print("❌ Health check failed, stopping tests")
        return 1
    
    # Test dashboard overview
    tester.test_dashboard_overview()
    
    # Test semantic mappings
    tester.test_semantic_mappings_get()
    tester.test_semantic_mappings_post()
    
    # Test natural language queries
    test_queries = [
        "Show me production efficiency by production line",
        "What are the defect rates for each line?",
        "Display equipment downtime by type"
    ]
    
    for query in test_queries:
        tester.test_natural_language_query(query)
    
    # Test ERD Builder APIs
    print("\n===== ERD Builder API Testing =====\n")
    
    # Test table schemas endpoint
    tester.test_table_schemas_get()
    
    # Test table relationships endpoint
    tester.test_table_relationships_get()
    
    # Test ERD configurations endpoint
    tester.test_erd_configurations_get()
    
    # Test updating a table schema position
    tester.test_table_schema_update("production_data")
    
    # Test creating a new relationship
    tester.test_table_relationship_create()
    
    # Test deleting a relationship
    tester.test_table_relationship_delete()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
