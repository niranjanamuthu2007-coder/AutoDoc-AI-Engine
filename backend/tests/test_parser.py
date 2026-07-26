import pytest
from app.parser.fastapi_p import FastAPIParser
from app.parser.flask_p import FlaskParser
from app.parser.django_p import DjangoParser
def test_fastapi_parser():
    code = """
from fastapi import FastAPI, Depends, Query
app = FastAPI()
def common_auth(token: str = Depends(get_token)):
    return token
@app.get("/items/{item_id}", status_code=201)
def read_item(item_id: int, q: str = Query(None), current_user = Depends(common_auth)):
    \"\"\"Read item from database\"\"\"
    return {"item_id": item_id, "q": q}
"""
    parser = FastAPIParser()
    endpoints = parser.parse_file("main.py", code, "main")
    
    assert len(endpoints) == 1
    ep = endpoints[0]
    assert ep["route"] == "/items/{item_id}"
    assert ep["method"] == "GET"
    assert ep["function_name"] == "read_item"
    assert ep["status_code"] == 201
    assert ep["auth"] is True
    assert "Read item from database" in ep["docstring"]
    
    # Assert parameters
    params = {p["name"]: p for p in ep["parameters"]}
    assert "item_id" in params
    assert params["item_id"]["location"] == "path"
    assert params["item_id"]["type"] == "int"
    
    assert "q" in params
    assert params["q"]["location"] == "query"
def test_flask_parser():
    code = """
from flask import Flask, Blueprint
bp = Blueprint('api', __name__, url_prefix='/v1')
@bp.route('/users/<int:user_id>', methods=['GET', 'POST'])
def handle_user(user_id):
    \"\"\"Get or update user record\"\"\"
    return "OK"
"""
    parser = FlaskParser()
    # To mock the blueprint prefix parsing, we evaluate the Blueprint call
    endpoints = parser.parse_file("views.py", code, "views")
    
    # Returns both GET and POST endpoints
    assert len(endpoints) == 2
    
    routes = [e["route"] for e in endpoints]
    assert all(r == "/v1/users/<int:user_id>" for r in routes)
    
    methods = [e["method"] for e in endpoints]
    assert "GET" in methods
    assert "POST" in methods
def test_django_parser():
    code = """
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
class UserViewSet(viewsets.ModelViewSet):
    \"\"\"Manage users database records\"\"\"
    permission_classes = [IsAuthenticated]
    def list(self, request):
        return []
        
    def retrieve(self, request, pk=None):
        return {}
"""
    parser = DjangoParser()
    # Simulate urls mapping viewset registry mapping
    parser.class_routes["UserViewSet"] = [{
        "route": "/api/users",
        "is_viewset": True
    }]
    
    endpoints = parser.parse_file("views.py", code, "views")
    assert len(endpoints) == 2
    
    routes = [e["route"] for e in endpoints]
    assert "/api/users" in routes
    assert "/api/users/{id}" in routes
    
    methods = [e["method"] for e in endpoints]
    assert "GET" in methods