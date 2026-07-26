import ast
from typing import List, Dict, Any, Optional
from app.parser.base import BaseParser
class FastAPIParser(BaseParser):
    def parse_file(self, filepath: str, code: str, module_name: str) -> List[Dict[str, Any]]:
        endpoints = []
        try:
            tree = ast.parse(code)
        except SyntaxError:
            # Tolerant parsing: ignore single file syntax errors
            return []
        class FastAPIVisitor(ast.NodeVisitor):
            def __init__(self, parser: FastAPIParser):
                self.endpoints = []
                self.parser = parser
                self.current_router_prefix = ""
            def visit_Call(self, node: ast.Call):
                # Detect router definitions or router inclusions to track prefixes
                # e.g., router = APIRouter(prefix="/items")
                # e.g., app.include_router(items.router, prefix="/api")
                if isinstance(node.func, ast.Name) and node.func.id == "APIRouter":
                    for kw in node.keywords:
                        if kw.arg == "prefix" and isinstance(kw.value, ast.Constant):
                            self.current_router_prefix = str(kw.value.value)
                super().generic_visit(node)
            def visit_FunctionDef(self, node: ast.FunctionDef):
                self.parse_function(node)
                super().generic_visit(node)
            def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
                self.parse_function(node)
                super().generic_visit(node)
            def parse_function(self, node: ast.AST):
                # Ensure it's a function or async function node
                if not hasattr(node, "decorator_list"):
                    return
                for decorator in node.decorator_list:
                    # Check for call-based decorators, e.g., @app.get("/route")
                    if not isinstance(decorator, ast.Call):
                        continue
                    
                    func_node = decorator.func
                    method = None
                    decorator_str = ""
                    # Case 1: @app.get("/path") -> Attribute(value=Name(id='app'), attr='get')
                    if isinstance(func_node, ast.Attribute):
                        method = func_node.attr.upper()
                        if isinstance(func_node.value, ast.Name):
                            decorator_str = f"{func_node.value.id}.{func_node.attr}"
                    # Case 2: @get("/path") -> Name(id='get')
                    elif isinstance(func_node, ast.Name):
                        method = func_node.id.upper()
                        decorator_str = func_node.id
                    valid_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]
                    if method not in valid_methods:
                        continue
                    # Extract path (first argument of decorator)
                    route_path = "/"
                    if decorator.args and isinstance(decorator.args[0], ast.Constant):
                        route_path = str(decorator.args[0].value)
                    # Extract route metadata (response_model, status_code, tags)
                    response_model = None
                    status_code = 200
                    tags = []
                    for kw in decorator.keywords:
                        if kw.arg == "response_model":
                            response_model = self.parser.get_type_annotation(kw.value)
                        elif kw.arg == "status_code" and isinstance(kw.value, ast.Constant):
                            status_code = int(kw.value.value)
                        elif kw.arg == "tags":
                            if isinstance(kw.value, ast.List):
                                tags = [str(e.value) for e in kw.value.elts if isinstance(e, ast.Constant)]
                    # Compile route parameters
                    parameters = []
                    dependencies = []
                    auth_detected = False
                    # Match function arguments and their defaults
                    # In Python ast: node.args.args represents positional arguments
                    # node.args.defaults maps to the default values (aligned to the end of node.args.args)
                    args = node.args.args
                    defaults = node.args.defaults
                    # Fill defaults offset
                    defaults_padded = [None] * (len(args) - len(defaults)) + list(defaults)
                    for arg, default in zip(args, defaults_padded):
                        if arg.arg == "self":
                            continue
                        param_name = arg.arg
                        param_type = self.parser.get_type_annotation(arg.annotation)
                        param_required = default is None
                        param_default_val = None
                        param_location = "query" # default location
                        # Inspect default values to identify FastAPI dependencies (Depends, Path, Query, Header, Cookie)
                        if default:
                            if isinstance(default, ast.Constant):
                                param_default_val = str(default.value)
                            elif isinstance(default, ast.Call):
                                default_func = default.func
                                default_func_name = ""
                                if isinstance(default_func, ast.Name):
                                    default_func_name = default_func.id
                                elif isinstance(default_func, ast.Attribute):
                                    default_func_name = default_func.attr
                                param_default_val = f"{default_func_name}(...)"
                                if default_func_name == "Depends":
                                    # This is a dependency injection
                                    dep_name = "unknown"
                                    if default.args:
                                        if isinstance(default.args[0], ast.Name):
                                            dep_name = default.args[0].id
                                        elif isinstance(default.args[0], ast.Attribute):
                                            dep_name = f"{default.args[0].value.id}.{default.args[0].attr}" if isinstance(default.args[0].value, ast.Name) else default.args[0].attr
                                    
                                    dependencies.append(dep_name)
                                    # Infer authentication
                                    if any(keyword in dep_name.lower() or keyword in param_name.lower() 
                                           for keyword in ["auth", "login", "user", "security", "token", "jwt", "cred"]):
                                        auth_detected = True
                                elif default_func_name in ["Path", "Query", "Header", "Cookie", "Body"]:
                                    param_location = default_func_name.lower()
                                    # Extract default value if provided as keyword argument or first arg
                                    if default.args:
                                        if isinstance(default.args[0], ast.Constant):
                                            param_default_val = str(default.args[0].value)
                        # Auto-assign Path location if the parameter matches a path variable {param_name}
                        if f"{{{param_name}}}" in route_path:
                            param_location = "path"
                        parameters.append({
                            "name": param_name,
                            "type": param_type,
                            "required": param_required,
                            "default": param_default_val,
                            "location": param_location
                        })
                    # If route_path starts with '/' and router prefix is set, format prefix correctly
                    full_route = route_path
                    if self.current_router_prefix and not route_path.startswith("http"):
                        prefix = self.current_router_prefix
                        if not prefix.startswith("/"):
                            prefix = "/" + prefix
                        if prefix.endswith("/"):
                            prefix = prefix[:-1]
                        
                        suffix = route_path
                        if not suffix.startswith("/"):
                            suffix = "/" + suffix
                            
                        full_route = f"{prefix}{suffix}"
                    self.endpoints.append({
                        "route": full_route,
                        "method": method,
                        "function_name": node.name,
                        "parameters": parameters,
                        "return_type": self.parser.get_type_annotation(node.returns),
                        "response_model": response_model,
                        "status_code": status_code,
                        "tags": tags if tags else [module_name.split(".")[-1]],
                        "docstring": self.parser.get_docstring(node),
                        "file_path": filepath,
                        "line_number": node.lineno,
                        "module_name": module_name,
                        "dependencies": dependencies,
                        "auth": auth_detected
                    })
        visitor = FastAPIVisitor(self)
        visitor.visit(tree)
        return visitor.endpoints