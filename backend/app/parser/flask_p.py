import ast
from typing import List, Dict, Any, Optional
from app.parser.base import BaseParser
class FlaskParser(BaseParser):
    def parse_file(self, filepath: str, code: str, module_name: str) -> List[Dict[str, Any]]:
        endpoints = []
        try:
            tree = ast.parse(code)
        except SyntaxError:
            return []
        class FlaskVisitor(ast.NodeVisitor):
            def __init__(self, parser: FlaskParser):
                self.endpoints = []
                self.parser = parser
                self.blueprint_prefix = ""
            def visit_Call(self, node: ast.Call):
                # Detect blueprint instantiations to track prefix
                # e.g., auth = Blueprint('auth', __name__, url_prefix='/auth')
                if isinstance(node.func, ast.Name) and node.func.id == "Blueprint":
                    for kw in node.keywords:
                        if kw.arg == "url_prefix" and isinstance(kw.value, ast.Constant):
                            self.blueprint_prefix = str(kw.value.value)
                super().generic_visit(node)
            def visit_FunctionDef(self, node: ast.FunctionDef):
                self.parse_function(node)
                super().generic_visit(node)
            def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
                self.parse_function(node)
                super().generic_visit(node)
            def parse_function(self, node: ast.AST):
                if not hasattr(node, "decorator_list"):
                    return
                for decorator in node.decorator_list:
                    if not isinstance(decorator, ast.Call):
                        continue
                    func_node = decorator.func
                    decorator_attr = ""
                    decorator_obj = ""
                    # Match @app.route('/path') or @bp.route('/path')
                    if isinstance(func_node, ast.Attribute):
                        decorator_attr = func_node.attr
                        if isinstance(func_node.value, ast.Name):
                            decorator_obj = func_node.value.id
                    elif isinstance(func_node, ast.Name):
                        decorator_attr = func_node.id
                    # Check if the decorator is a Flask route decorator
                    if decorator_attr not in ["route", "get", "post", "put", "delete", "patch", "options", "head"]:
                        continue
                    # Extract Path
                    route_path = "/"
                    if decorator.args and isinstance(decorator.args[0], ast.Constant):
                        route_path = str(decorator.args[0].value)
                    # Extract HTTP Methods
                    methods = []
                    if decorator_attr == "route":
                        # Check keyword arguments for methods=[...]
                        methods = ["GET"] # default
                        for kw in decorator.keywords:
                            if kw.arg == "methods":
                                if isinstance(kw.value, ast.List) or isinstance(kw.value, ast.Tuple):
                                    methods = [
                                        str(e.value).upper() 
                                        for e in kw.value.elts 
                                        if isinstance(e, ast.Constant)
                                    ]
                    else:
                        # Shorthand decorators (e.g. @app.get)
                        methods = [decorator_attr.upper()]
                    # Extract parameters
                    parameters = []
                    args = node.args.args
                    defaults = node.args.defaults
                    defaults_padded = [None] * (len(args) - len(defaults)) + list(defaults)
                    # Scan for path parameters inside path (e.g. <int:user_id> or <user_id>)
                    path_params = []
                    import re
                    # Simple regex inside parser to map variable names (but AST parsing handles structure)
                    # Flask path format: <converter:name> or <name>
                    matches = re.findall(r"<([^>]+)>", route_path)
                    for match in matches:
                        p_type = "str"
                        p_name = match
                        if ":" in match:
                            p_type, p_name = match.split(":", 1)
                        path_params.append((p_name, p_type))
                    for arg, default in zip(args, defaults_padded):
                        param_name = arg.arg
                        param_type = self.parser.get_type_annotation(arg.annotation)
                        param_required = default is None
                        param_default_val = str(default.value) if default and isinstance(default, ast.Constant) else None
                        param_location = "query"
                        # check if it is a path parameter
                        matched_path = next((p for p in path_params if p[0] == param_name), None)
                        if matched_path:
                            param_location = "path"
                            if not param_type:
                                param_type = matched_path[1]
                        parameters.append({
                            "name": param_name,
                            "type": param_type,
                            "required": param_required,
                            "default": param_default_val,
                            "location": param_location
                        })
                    # If route path is missing any path variables but functions have them, we keep them as query parameters.
                    # Handle Blueprint URL Prefix concatenation
                    full_route = route_path
                    if self.blueprint_prefix and not route_path.startswith("http"):
                        prefix = self.blueprint_prefix
                        if not prefix.startswith("/"):
                            prefix = "/" + prefix
                        if prefix.endswith("/"):
                            prefix = prefix[:-1]
                        
                        suffix = route_path
                        if not suffix.startswith("/"):
                            suffix = "/" + suffix
                        full_route = f"{prefix}{suffix}"
                    # Flask requests authentication can be inferred from decorators like @login_required
                    auth_detected = False
                    dependencies = []
                    for dec in node.decorator_list:
                        dec_name = ""
                        if isinstance(dec, ast.Name):
                            dec_name = dec.id
                        elif isinstance(dec, ast.Call) and isinstance(dec.func, ast.Name):
                            dec_name = dec.func.id
                        elif isinstance(dec, ast.Attribute):
                            dec_name = dec.attr
                        if dec_name:
                            if any(keyword in dec_name.lower() for keyword in ["login", "auth", "jwt", "admin"]):
                                auth_detected = True
                            if dec_name not in ["route", "get", "post", "put", "delete", "patch", "options", "head"]:
                                dependencies.append(dec_name)
                    for m in methods:
                        self.endpoints.append({
                            "route": full_route,
                            "method": m,
                            "function_name": node.name,
                            "parameters": parameters,
                            "return_type": self.parser.get_type_annotation(node.returns),
                            "response_model": None,
                            "status_code": 200,
                            "tags": [module_name.split(".")[-1]],
                            "docstring": self.parser.get_docstring(node),
                            "file_path": filepath,
                            "line_number": node.lineno,
                            "module_name": module_name,
                            "dependencies": dependencies,
                            "auth": auth_detected
                        })
        visitor = FlaskVisitor(self)
        visitor.visit(tree)
        return visitor.endpoints