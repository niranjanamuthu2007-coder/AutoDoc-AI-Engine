import ast
import re
from typing import List, Dict, Any, Optional

from app.parser.base import BaseParser


class DjangoParser(BaseParser):
    """
    Django / Django REST Framework parser.

    Supports:
    - path()
    - re_path()
    - router.register()
    - APIView
    - GenericAPIView
    - ViewSets
    - ModelViewSets
    - @action
    """

    def __init__(self):
        super().__init__()
        self.class_routes: Dict[str, List[Dict[str, Any]]] = {}

    # -------------------------------------------------------
    # URL PARSER
    # -------------------------------------------------------

    def parse_urls_file(self, code: str) -> None:
        try:
            tree = ast.parse(code)
        except SyntaxError:
            return

        parser = self

        class UrlVisitor(ast.NodeVisitor):

            def visit_Call(self, node: ast.Call):

                func_name = ""

                if isinstance(node.func, ast.Name):
                    func_name = node.func.id

                elif isinstance(node.func, ast.Attribute):
                    func_name = node.func.attr

                # -----------------------------------
                # path(...)
                # -----------------------------------

                if func_name in ("path", "re_path"):

                    if len(node.args) >= 2:

                        route = ""
                        view_name = None

                        if isinstance(node.args[0], ast.Constant):
                            route = str(node.args[0].value)

                        view = node.args[1]

                        if (
                            isinstance(view, ast.Call)
                            and isinstance(view.func, ast.Attribute)
                            and view.func.attr == "as_view"
                            and isinstance(view.func.value, ast.Name)
                        ):
                            view_name = view.func.value.id

                        if view_name:

                            route = re.sub(
                                r"<(?:\w+:)?(\w+)>",
                                r"{\1}",
                                route,
                            )

                            if not route.startswith("/"):
                                route = "/" + route

                            parser.class_routes.setdefault(
                                view_name,
                                [],
                            ).append(
                                {
                                    "route": route,
                                    "is_viewset": False,
                                }
                            )

                # -----------------------------------
                # router.register(...)
                # -----------------------------------

                elif func_name == "register":

                    if len(node.args) >= 2:

                        prefix = ""
                        viewset = None

                        if isinstance(node.args[0], ast.Constant):
                            prefix = str(node.args[0].value)

                        if isinstance(node.args[1], ast.Name):
                            viewset = node.args[1].id

                        if viewset:

                            if not prefix.startswith("/"):
                                prefix = "/" + prefix

                            prefix = prefix.rstrip("/")

                            parser.class_routes.setdefault(
                                viewset,
                                [],
                            ).append(
                                {
                                    "route": prefix,
                                    "is_viewset": True,
                                }
                            )

                self.generic_visit(node)

        UrlVisitor().visit(tree)

    # -------------------------------------------------------
    # MAIN PARSER
    # -------------------------------------------------------

    def parse_file(
        self,
        filepath: str,
        code: str,
        module_name: str,
    ) -> List[Dict[str, Any]]:

        try:
            tree = ast.parse(code)

        except SyntaxError:
            return []

        visitor = self.ViewVisitor(
            self,
            filepath,
            module_name,
        )

        visitor.visit(tree)

        return visitor.endpoints

    # -------------------------------------------------------
    # VIEW VISITOR
    # -------------------------------------------------------

    class ViewVisitor(ast.NodeVisitor):

        def __init__(
            self,
            parser,
            filepath: str,
            module_name: str,
        ):

            self.parser = parser
            self.filepath = filepath
            self.module_name = module_name
            self.endpoints: List[Dict[str, Any]] = []
        def visit_ClassDef(self, node: ast.ClassDef):

            base_names = []

            for base in node.bases:

                if isinstance(base, ast.Name):
                    base_names.append(base.id)

                elif isinstance(base, ast.Attribute):
                    base_names.append(base.attr)

            is_drf = any(
                b in (
                    "APIView",
                    "GenericAPIView",
                    "ViewSet",
                    "ModelViewSet",
                    "GenericViewSet",
                    "ReadOnlyModelViewSet",
                )
                or "view" in b.lower()
                or "viewset" in b.lower()
                for b in base_names
            )

            if not is_drf:
                return self.generic_visit(node)

            permission_classes = []
            auth_required = False

            for item in node.body:

                if not isinstance(item, ast.Assign):
                    continue

                for target in item.targets:

                    if (
                        isinstance(target, ast.Name)
                        and target.id == "permission_classes"
                    ):

                        if isinstance(item.value, (ast.List, ast.Tuple)):

                            permission_classes = []

                            for p in item.value.elts:

                                name = self.parser.get_type_annotation(p)

                                if name:
                                    permission_classes.append(name)

                                    if "authenticated" in name.lower():
                                        auth_required = True

            routes = self.parser.class_routes.get(node.name)

            if not routes:

                routes = [
                    {
                        "route": "/api/"
                        + node.name.lower()
                        .replace("viewset", "")
                        .replace("view", ""),
                        "is_viewset": "ViewSet" in node.name,
                    }
                ]

            for fn in node.body:

                if not isinstance(
                    fn,
                    (
                        ast.FunctionDef,
                        ast.AsyncFunctionDef,
                    ),
                ):
                    continue

                if fn.name == "__init__":
                    continue

                parameters = []

                args = fn.args.args
                defaults = fn.args.defaults

                padded_defaults = (
                    [None] * (len(args) - len(defaults))
                    + list(defaults)
                )

                for arg, default in zip(
                    args,
                    padded_defaults,
                ):

                    if arg.arg in ("self", "request"):
                        continue

                    default_value = None

                    if (
                        default
                        and isinstance(
                            default,
                            ast.Constant,
                        )
                    ):
                        default_value = repr(default.value)

                    parameters.append(
                        {
                            "name": arg.arg,
                            "type": self.parser.get_type_annotation(
                                arg.annotation
                            ),
                            "required": default is None,
                            "default": default_value,
                            "location": "query",
                        }
                    )

                docstring = self.parser.get_docstring(fn)

                return_type = self.parser.get_type_annotation(
                    fn.returns
                )

                valid_methods = {
                    "get": "GET",
                    "post": "POST",
                    "put": "PUT",
                    "patch": "PATCH",
                    "delete": "DELETE",
                    "options": "OPTIONS",
                    "head": "HEAD",
                }
                # ------------------------------------------
                # Detect custom @action decorators
                # ------------------------------------------

                custom_action = None

                for dec in fn.decorator_list:

                    if (
                        isinstance(dec, ast.Call)
                        and isinstance(dec.func, ast.Name)
                        and dec.func.id == "action"
                    ):
                        custom_action = dec
                        break

                    elif (
                        isinstance(dec, ast.Name)
                        and dec.id == "action"
                    ):
                        custom_action = dec
                        break

                # ------------------------------------------
                # Generate endpoints
                # ------------------------------------------

                for route in routes:

                    route_path = route["route"]
                    is_viewset = route["is_viewset"]

                    # --------------------------------------
                    # APIView
                    # --------------------------------------

                    if not is_viewset:

                        if fn.name.lower() not in valid_methods:
                            continue

                        method = valid_methods[fn.name.lower()]

                        self.endpoints.append(
                            {
                                "route": route_path,
                                "method": method,
                                "function_name": f"{node.name}.{fn.name}",
                                "parameters": parameters,
                                "return_type": return_type,
                                "response_model": None,
                                "status_code": (
                                    201 if method == "POST" else 200
                                ),
                                "tags": [node.name],
                                "docstring": docstring,
                                "file_path": self.filepath,
                                "line_number": fn.lineno,
                                "module_name": self.module_name,
                                "dependencies": permission_classes,
                                "auth": auth_required,
                            }
                        )

                        continue

                    # --------------------------------------
                    # ViewSet Standard Actions
                    # --------------------------------------

                    action_map = {
                        "list": ("GET", ""),
                        "retrieve": ("GET", "/{id}"),
                        "create": ("POST", ""),
                        "update": ("PUT", "/{id}"),
                        "partial_update": ("PATCH", "/{id}"),
                        "destroy": ("DELETE", "/{id}"),
                    }

                    if fn.name in action_map:

                        method, suffix = action_map[fn.name]

                        final_route = route_path + suffix

                        params = list(parameters)

                        if suffix:

                            params.append(
                                {
                                    "name": "id",
                                    "type": "int",
                                    "required": True,
                                    "default": None,
                                    "location": "path",
                                }
                            )

                        self.endpoints.append(
                            {
                                "route": final_route,
                                "method": method,
                                "function_name": f"{node.name}.{fn.name}",
                                "parameters": params,
                                "return_type": return_type,
                                "response_model": None,
                                "status_code": (
                                    204
                                    if method == "DELETE"
                                    else (
                                        201
                                        if method == "POST"
                                        else 200
                                    )
                                ),
                                "tags": [node.name],
                                "docstring": docstring,
                                "file_path": self.filepath,
                                "line_number": fn.lineno,
                                "module_name": self.module_name,
                                "dependencies": permission_classes,
                                "auth": auth_required,
                            }
                        )

                        continue                
                                # --------------------------------------
                    # Custom @action methods
                    # --------------------------------------

                    if custom_action:

                        methods = ["GET"]
                        detail = False
                        url_path = fn.name

                        if isinstance(custom_action, ast.Call):

                            for kw in custom_action.keywords:

                                if kw.arg == "methods":

                                    if isinstance(kw.value, ast.List):

                                        methods = []

                                        for method_node in kw.value.elts:

                                            if isinstance(method_node, ast.Constant):

                                                methods.append(
                                                    str(method_node.value).upper()
                                                )

                                elif kw.arg == "detail":

                                    if isinstance(
                                        kw.value,
                                        ast.Constant,
                                    ):
                                        detail = bool(
                                            kw.value.value
                                        )

                                elif kw.arg == "url_path":

                                    if isinstance(
                                        kw.value,
                                        ast.Constant,
                                    ):
                                        url_path = str(
                                            kw.value.value
                                        )

                        if detail:
                            final_route = (
                                route_path
                                + "/{id}/"
                                + url_path
                            )
                        else:
                            final_route = (
                                route_path
                                + "/"
                                + url_path
                            )

                        params = list(parameters)

                        if detail:

                            params.append(
                                {
                                    "name": "id",
                                    "type": "int",
                                    "required": True,
                                    "default": None,
                                    "location": "path",
                                }
                            )

                        for method in methods:

                            self.endpoints.append(
                                {
                                    "route": final_route,
                                    "method": method,
                                    "function_name": f"{node.name}.{fn.name}",
                                    "parameters": params,
                                    "return_type": return_type,
                                    "response_model": None,
                                    "status_code": 200,
                                    "tags": [node.name],
                                    "docstring": docstring,
                                    "file_path": self.filepath,
                                    "line_number": fn.lineno,
                                    "module_name": self.module_name,
                                    "dependencies": permission_classes,
                                    "auth": auth_required,
                                }
                            )

            self.generic_visit(node)