import requests
import unittest
import json
import sys
from datetime import datetime

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
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
