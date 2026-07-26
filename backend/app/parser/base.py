import ast
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
class BaseParser(ABC):
    @abstractmethod
    def parse_file(self, filepath: str, code: str, module_name: str) -> List[Dict[str, Any]]:
        """
        Parses a single source file content and extracts REST API endpoint metadata.
        Returns:
            List of dictionaries representing API endpoints.
        """
        pass
    def get_docstring(self, node: ast.AST) -> Optional[str]:
        """Extract docstring helper"""
        return ast.get_docstring(node)
    def get_type_annotation(self, annotation: Optional[ast.AST]) -> Optional[str]:
        """
        Recursively converts AST annotation node into a string representation.
        """
        if not annotation:
            return None
        
        if isinstance(annotation, ast.Name):
            return annotation.id
        elif isinstance(annotation, ast.Constant):
            return str(annotation.value)
        elif isinstance(annotation, ast.Subscript):
            value = self.get_type_annotation(annotation.value)
            slice_val = self.get_type_annotation(annotation.slice)
            return f"{value}[{slice_val}]"
        elif isinstance(annotation, ast.Attribute):
            value = self.get_type_annotation(annotation.value)
            return f"{value}.{annotation.attr}"
        elif isinstance(annotation, ast.Tuple):
            elts = [self.get_type_annotation(e) for e in annotation.elts]
            return f"Tuple[{', '.join(filter(None, elts))}]"
        elif isinstance(annotation, ast.List):
            elts = [self.get_type_annotation(e) for e in annotation.elts]
            return f"List[{', '.join(filter(None, elts))}]"
        elif isinstance(annotation, ast.BinOp) and isinstance(annotation.op, ast.BitOr):
            # Support Python 3.10+ type union syntax (int | str)
            left = self.get_type_annotation(annotation.left)
            right = self.get_type_annotation(annotation.right)
            return f"{left} | {right}"
        return None
