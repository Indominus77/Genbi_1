from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import httpx
import json
from datetime import datetime, timedelta
import uuid
import random

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URL)
db = client.genbi_manufacturing

# LMStudio configuration
LMSTUDIO_URL = "http://localhost:1234"

# Pydantic models
class NLQuery(BaseModel):
    query: str

class SemanticMapping(BaseModel):
    business_term: str
    database_field: str
    description: str
    table_name: str

class TableSchema(BaseModel):
    table_name: str
    columns: List[Dict[str, Any]]
    position: Optional[Dict[str, float]] = None
    description: Optional[str] = None

class TableRelationship(BaseModel):
    from_table: str
    to_table: str
    from_column: str
    to_column: str
    relationship_type: str  # "one-to-one", "one-to-many", "many-to-many"
    description: Optional[str] = None

class ERDConfiguration(BaseModel):
    name: str
    tables: List[TableSchema]
    relationships: List[TableRelationship]
    description: Optional[str] = None

# Initialize sample data
def init_sample_data():
    """Initialize sample tyre manufacturing data"""
    
    # Clear existing data
    db.production_data.delete_many({})
    db.quality_metrics.delete_many({})
    db.equipment_downtime.delete_many({})
    db.semantic_mappings.delete_many({})
    db.table_schemas.delete_many({})
    db.table_relationships.delete_many({})
    db.erd_configurations.delete_many({})
    
    # Production lines and tyre types
    production_lines = ["Line-A-Radial", "Line-B-Bias", "Line-C-HeavyDuty"]
    tyre_types = [
        "175/70R13", "185/65R15", "205/55R16", "225/60R17", 
        "245/45R18", "285/75R24.5", "315/80R22.5"
    ]
    
    # Sample production data for last 30 days
    production_data = []
    base_date = datetime.now() - timedelta(days=30)
    
    for day in range(30):
        current_date = base_date + timedelta(days=day)
        for line in production_lines:
            for shift in ["Day", "Night"]:
                for tyre_type in random.sample(tyre_types, 3):
                    production_data.append({
                        "_id": str(uuid.uuid4()),
                        "date": current_date.strftime("%Y-%m-%d"),
                        "production_line": line,
                        "shift": shift,
                        "tyre_type": tyre_type,
                        "planned_production": random.randint(800, 1200),
                        "actual_production": random.randint(700, 1100),
                        "defect_count": random.randint(5, 50),
                        "downtime_minutes": random.randint(0, 120),
                        "operator_id": f"OP{random.randint(100, 999)}",
                        "raw_material_usage": random.randint(500, 800),
                        "energy_consumption": random.randint(2000, 3500)
                    })
    
    # Sample quality metrics
    quality_metrics = []
    defect_types = ["Bubbles", "Uneven_Tread", "Sidewall_Defect", "Bead_Separation", "Pressure_Leak"]
    
    for day in range(30):
        current_date = base_date + timedelta(days=day)
        for line in production_lines:
            for defect_type in defect_types:
                quality_metrics.append({
                    "_id": str(uuid.uuid4()),
                    "date": current_date.strftime("%Y-%m-%d"),
                    "production_line": line,
                    "defect_type": defect_type,
                    "defect_count": random.randint(1, 20),
                    "severity": random.choice(["Low", "Medium", "High"]),
                    "root_cause": random.choice([
                        "Material Quality", "Equipment Calibration", "Operator Error", 
                        "Temperature Variation", "Pressure Issues"
                    ])
                })
    
    # Sample equipment downtime
    equipment_downtime = []
    equipment_types = ["Mixer", "Extruder", "Building_Machine", "Curing_Press", "Testing_Equipment"]
    
    for day in range(30):
        current_date = base_date + timedelta(days=day)
        for equipment in equipment_types:
            if random.random() < 0.3:  # 30% chance of downtime per day
                equipment_downtime.append({
                    "_id": str(uuid.uuid4()),
                    "date": current_date.strftime("%Y-%m-%d"),
                    "equipment_type": equipment,
                    "equipment_id": f"{equipment}_{random.randint(1, 5)}",
                    "downtime_minutes": random.randint(30, 480),
                    "reason": random.choice([
                        "Scheduled Maintenance", "Breakdown", "Setup Change", 
                        "Material Shortage", "Quality Issues"
                    ]),
                    "production_line": random.choice(production_lines)
                })
    
    # Semantic mappings for business context
    semantic_mappings = [
        {
            "_id": str(uuid.uuid4()),
            "business_term": "production efficiency",
            "database_field": "actual_production / planned_production",
            "description": "Ratio of actual vs planned production",
            "table_name": "production_data"
        },
        {
            "_id": str(uuid.uuid4()),
            "business_term": "defect rate",
            "database_field": "defect_count / actual_production",
            "description": "Number of defects per unit produced",
            "table_name": "production_data"
        },
        {
            "_id": str(uuid.uuid4()),
            "business_term": "downtime",
            "database_field": "downtime_minutes",
            "description": "Equipment downtime in minutes",
            "table_name": "production_data"
        },
        {
            "_id": str(uuid.uuid4()),
            "business_term": "equipment availability",
            "database_field": "(1440 - downtime_minutes) / 1440",
            "description": "Percentage of time equipment was available",
            "table_name": "equipment_downtime"
        },
        {
            "_id": str(uuid.uuid4()),
            "business_term": "quality issues",
            "database_field": "defect_count",
            "description": "Total number of quality defects",
            "table_name": "quality_metrics"
        }
    ]
    
    # Initialize table schemas for ERD
    table_schemas = [
        {
            "_id": str(uuid.uuid4()),
            "table_name": "production_data",
            "columns": [
                {"name": "_id", "type": "string", "primary_key": True},
                {"name": "date", "type": "string", "nullable": False},
                {"name": "production_line", "type": "string", "nullable": False},
                {"name": "shift", "type": "string", "nullable": False},
                {"name": "tyre_type", "type": "string", "nullable": False},
                {"name": "planned_production", "type": "integer", "nullable": False},
                {"name": "actual_production", "type": "integer", "nullable": False},
                {"name": "defect_count", "type": "integer", "nullable": False},
                {"name": "downtime_minutes", "type": "integer", "nullable": False},
                {"name": "operator_id", "type": "string", "nullable": True},
                {"name": "raw_material_usage", "type": "integer", "nullable": True},
                {"name": "energy_consumption", "type": "integer", "nullable": True}
            ],
            "position": {"x": 100, "y": 100},
            "description": "Daily production data by line and shift"
        },
        {
            "_id": str(uuid.uuid4()),
            "table_name": "quality_metrics",
            "columns": [
                {"name": "_id", "type": "string", "primary_key": True},
                {"name": "date", "type": "string", "nullable": False},
                {"name": "production_line", "type": "string", "nullable": False},
                {"name": "defect_type", "type": "string", "nullable": False},
                {"name": "defect_count", "type": "integer", "nullable": False},
                {"name": "severity", "type": "string", "nullable": False},
                {"name": "root_cause", "type": "string", "nullable": True}
            ],
            "position": {"x": 400, "y": 100},
            "description": "Quality defect tracking and analysis"
        },
        {
            "_id": str(uuid.uuid4()),
            "table_name": "equipment_downtime",
            "columns": [
                {"name": "_id", "type": "string", "primary_key": True},
                {"name": "date", "type": "string", "nullable": False},
                {"name": "equipment_type", "type": "string", "nullable": False},
                {"name": "equipment_id", "type": "string", "nullable": False},
                {"name": "downtime_minutes", "type": "integer", "nullable": False},
                {"name": "reason", "type": "string", "nullable": False},
                {"name": "production_line", "type": "string", "nullable": True}
            ],
            "position": {"x": 700, "y": 100},
            "description": "Equipment downtime tracking and reasons"
        },
        {
            "_id": str(uuid.uuid4()),
            "table_name": "operators",
            "columns": [
                {"name": "operator_id", "type": "string", "primary_key": True},
                {"name": "name", "type": "string", "nullable": False},
                {"name": "shift_preference", "type": "string", "nullable": True},
                {"name": "skill_level", "type": "string", "nullable": False},
                {"name": "certification_date", "type": "string", "nullable": True}
            ],
            "position": {"x": 100, "y": 350},
            "description": "Operator information and qualifications"
        },
        {
            "_id": str(uuid.uuid4()),
            "table_name": "tyre_specifications",
            "columns": [
                {"name": "tyre_type", "type": "string", "primary_key": True},
                {"name": "category", "type": "string", "nullable": False},
                {"name": "target_pressure", "type": "float", "nullable": False},
                {"name": "weight_kg", "type": "float", "nullable": False},
                {"name": "material_cost", "type": "float", "nullable": False}
            ],
            "position": {"x": 400, "y": 350},
            "description": "Tyre type specifications and costs"
        }
    ]
    
    # Initialize table relationships for ERD
    table_relationships = [
        {
            "_id": str(uuid.uuid4()),
            "from_table": "production_data",
            "to_table": "operators",
            "from_column": "operator_id",
            "to_column": "operator_id",
            "relationship_type": "many-to-one",
            "description": "Each production record is associated with an operator"
        },
        {
            "_id": str(uuid.uuid4()),
            "from_table": "production_data",
            "to_table": "tyre_specifications",
            "from_column": "tyre_type",
            "to_column": "tyre_type",
            "relationship_type": "many-to-one",
            "description": "Production data references tyre specifications"
        },
        {
            "_id": str(uuid.uuid4()),
            "from_table": "quality_metrics",
            "to_table": "production_data",
            "from_column": "production_line",
            "to_column": "production_line",
            "relationship_type": "one-to-many",
            "description": "Quality metrics are linked to production lines"
        },
        {
            "_id": str(uuid.uuid4()),
            "from_table": "equipment_downtime",
            "to_table": "production_data",
            "from_column": "production_line",
            "to_column": "production_line",
            "relationship_type": "one-to-many",
            "description": "Equipment downtime affects production lines"
        }
    ]
    
    # Create sample ERD configuration
    erd_configurations = [
        {
            "_id": str(uuid.uuid4()),
            "name": "Tyre Manufacturing ERD",
            "description": "Complete entity relationship diagram for tyre manufacturing operations",
            "tables": table_schemas,
            "relationships": table_relationships,
            "created_date": datetime.now().isoformat()
        }
    ]
    
    # Insert sample data
    db.production_data.insert_many(production_data)
    db.quality_metrics.insert_many(quality_metrics)
    db.equipment_downtime.insert_many(equipment_downtime)
    db.semantic_mappings.insert_many(semantic_mappings)
    
    print(f"Initialized {len(production_data)} production records")
    print(f"Initialized {len(quality_metrics)} quality records")
    print(f"Initialized {len(equipment_downtime)} downtime records")
    print(f"Initialized {len(semantic_mappings)} semantic mappings")

async def query_lmstudio(prompt: str) -> str:
    """Query LMStudio for natural language processing"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{LMSTUDIO_URL}/v1/chat/completions",
                json={
                    "model": "llama-3-8b-instruct",
                    "messages": [
                        {
                            "role": "system",
                            "content": """You are a GenBI expert for tyre manufacturing. Convert natural language queries to MongoDB aggregation pipelines.

Available Collections:
- production_data: date, production_line, shift, tyre_type, planned_production, actual_production, defect_count, downtime_minutes
- quality_metrics: date, production_line, defect_type, defect_count, severity, root_cause
- equipment_downtime: date, equipment_type, equipment_id, downtime_minutes, reason, production_line

Business Terms:
- "efficiency" = actual_production / planned_production
- "defect rate" = defect_count / actual_production
- "downtime" = downtime_minutes
- "last week" = last 7 days
- "this week" = current week
- "production lines" = Line-A-Radial, Line-B-Bias, Line-C-HeavyDuty

Return ONLY a valid MongoDB aggregation pipeline as JSON array. Include proper date filtering and grouping."""
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.1,
                    "max_tokens": 1000
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                return "[]"
                
    except Exception as e:
        print(f"LMStudio error: {e}")
        # Fallback pipeline for demo
        return """[
            {"$match": {"date": {"$gte": "2024-12-01"}}},
            {"$group": {"_id": "$production_line", "total_production": {"$sum": "$actual_production"}, "total_defects": {"$sum": "$defect_count"}}},
            {"$addFields": {"defect_rate": {"$divide": ["$total_defects", "$total_production"]}}},
            {"$sort": {"total_production": -1}}
        ]"""

def parse_pipeline_from_llm_response(llm_response: str) -> List[Dict]:
    """Extract MongoDB pipeline from LLM response"""
    try:
        # Try to find JSON array in the response
        start_idx = llm_response.find('[')
        end_idx = llm_response.rfind(']') + 1
        
        if start_idx != -1 and end_idx != -1:
            pipeline_str = llm_response[start_idx:end_idx]
            pipeline = json.loads(pipeline_str)
            return pipeline
        else:
            # Fallback pipeline
            return [
                {"$group": {"_id": "$production_line", "total_production": {"$sum": "$actual_production"}}},
                {"$sort": {"total_production": -1}}
            ]
    except Exception as e:
        print(f"Pipeline parsing error: {e}")
        return [{"$group": {"_id": "$production_line", "total_production": {"$sum": "$actual_production"}}}]

@app.on_event("startup")
async def startup_event():
    """Initialize data on startup"""
    init_sample_data()

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/query")
async def process_natural_language_query(query: NLQuery):
    """Process natural language query and return dashboard data"""
    try:
        # Get MongoDB pipeline from LMStudio
        llm_response = await query_lmstudio(query.query)
        pipeline = parse_pipeline_from_llm_response(llm_response)
        
        # Execute pipeline on production_data collection
        results = list(db.production_data.aggregate(pipeline))
        
        # If no results from production_data, try quality_metrics
        if not results:
            results = list(db.quality_metrics.aggregate(pipeline))
        
        # If still no results, try equipment_downtime
        if not results:
            results = list(db.equipment_downtime.aggregate(pipeline))
        
        # Generate chart recommendations based on data structure
        chart_type = "bar"
        if len(results) > 0:
            first_result = results[0]
            if any(key for key in first_result.keys() if 'rate' in key.lower() or 'percentage' in key.lower()):
                chart_type = "line"
            elif len(results) > 10:
                chart_type = "line"
        
        return {
            "query": query.query,
            "pipeline": pipeline,
            "results": results,
            "chart_type": chart_type,
            "total_records": len(results),
            "llm_response": llm_response
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query processing error: {str(e)}")

@app.get("/api/semantic-mappings")
async def get_semantic_mappings():
    """Get all semantic mappings"""
    mappings = list(db.semantic_mappings.find({}, {"_id": 0}))
    return {"mappings": mappings}

@app.post("/api/semantic-mappings")
async def create_semantic_mapping(mapping: SemanticMapping):
    """Create new semantic mapping"""
    mapping_doc = mapping.dict()
    mapping_doc["_id"] = str(uuid.uuid4())
    db.semantic_mappings.insert_one(mapping_doc)
    return {"message": "Semantic mapping created", "id": mapping_doc["_id"]}

@app.get("/api/dashboard/overview")
async def dashboard_overview():
    """Get dashboard overview data"""
    try:
        # Production summary
        production_summary = list(db.production_data.aggregate([
            {"$group": {
                "_id": None,
                "total_planned": {"$sum": "$planned_production"},
                "total_actual": {"$sum": "$actual_production"},
                "total_defects": {"$sum": "$defect_count"},
                "total_downtime": {"$sum": "$downtime_minutes"}
            }}
        ]))
        
        # Production by line
        production_by_line = list(db.production_data.aggregate([
            {"$group": {
                "_id": "$production_line",
                "production": {"$sum": "$actual_production"},
                "defects": {"$sum": "$defect_count"}
            }},
            {"$sort": {"production": -1}}
        ]))
        
        # Defect trends (last 7 days)
        defect_trends = list(db.quality_metrics.aggregate([
            {"$group": {
                "_id": "$date",
                "total_defects": {"$sum": "$defect_count"}
            }},
            {"$sort": {"_id": -1}},
            {"$limit": 7}
        ]))
        
        # Equipment downtime
        equipment_downtime = list(db.equipment_downtime.aggregate([
            {"$group": {
                "_id": "$equipment_type",
                "total_downtime": {"$sum": "$downtime_minutes"}
            }},
            {"$sort": {"total_downtime": -1}}
        ]))
        
        return {
            "production_summary": production_summary[0] if production_summary else {},
            "production_by_line": production_by_line,
            "defect_trends": defect_trends,
            "equipment_downtime": equipment_downtime
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dashboard error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)