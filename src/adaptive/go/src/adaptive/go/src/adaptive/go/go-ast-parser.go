package main

import (
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
)

type FieldInfo struct {
	Name      string `json:"name"`
	Type      string `json:"type"`
	Tag       string `json:"tag,omitempty"`
	Exported  bool   `json:"exported"`
	IsPointer bool   `json:"isPointer"`
	IsSlice   bool   `json:"isSlice"`
	IsMap     bool   `json:"isMap"`
	IsChan    bool   `json:"isChan"`
	IsGeneric bool   `json:"isGeneric"`
}

type MethodInfo struct {
	Name       string      `json:"name"`
	Parameters []ParamInfo `json:"parameters"`
	ReturnType string      `json:"returnType"`
	Exported   bool        `json:"exported"`
	IsGeneric  bool        `json:"isGeneric"`
}

type ParamInfo struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

type ReceiverInfo struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

type StructInfo struct {
	Name    string      `json:"name"`
	Type    string      `json:"type"`
	Fields  []FieldInfo `json:"fields"`
	Methods []MethodInfo `json:"methods"`
	Embeds  []EmbedInfo `json:"embeds"`
}

type InterfaceInfo struct {
	Name    string       `json:"name"`
	Type    string       `json:"type"`
	Methods []MethodInfo `json:"methods"`
	Embeds  []string     `json:"embeds"`
}

type FunctionInfo struct {
	Name       string      `json:"name"`
	Parameters []ParamInfo `json:"parameters"`
	ReturnType string      `json:"returnType"`
	Exported   bool        `json:"exported"`
}

type MethodWithReceiver struct {
	Name       string       `json:"name"`
	Receiver   ReceiverInfo `json:"receiver"`
	Parameters []ParamInfo  `json:"parameters"`
	ReturnType string       `json:"returnType"`
	Exported   bool         `json:"exported"`
}

type EmbedInfo struct {
	Type      string `json:"type"`
	IsPointer bool   `json:"isPointer"`
	IsGeneric bool   `json:"isGeneric"`
}

type ConstInfo struct {
	Name     string `json:"name"`
	Type     string `json:"type,omitempty"`
	Value    string `json:"value,omitempty"`
	Exported bool   `json:"exported"`
}

type VarInfo struct {
	Name     string `json:"name"`
	Type     string `json:"type,omitempty"`
	Value    string `json:"value,omitempty"`
	Exported bool   `json:"exported"`
}

type ImportInfo struct {
	Path  string `json:"path"`
	Alias string `json:"alias,omitempty"`
	Name  string `json:"name"`
}

type GoMetadata struct {
	Path        string                `json:"path"`
	PackageName string                `json:"packageName"`
	Imports     []ImportInfo          `json:"imports"`
	Structs     []StructInfo          `json:"structs"`
	Interfaces  []InterfaceInfo       `json:"interfaces"`
	Functions   []FunctionInfo        `json:"functions"`
	Methods     []MethodWithReceiver  `json:"methods"`
	Types       []TypeInfo            `json:"types"`
	Constants   []ConstInfo           `json:"constants"`
	Variables   []VarInfo             `json:"variables"`
	Errors      []string              `json:"errors"`
}

type TypeInfo struct {
	Name           string `json:"name"`
	Type           string `json:"type"`
	UnderlyingType string `json:"underlyingType"`
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Usage: %s <go-file>\n", os.Args[0])
		os.Exit(1)
	}

	filePath := os.Args[1]
	metadata, err := parseGoFile(filePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing Go file: %v\n", err)
		os.Exit(1)
	}

	output, err := json.Marshal(metadata)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling JSON: %v\n", err)
		os.Exit(1)
	}

	fmt.Print(string(output))
}

func parseGoFile(filePath string) (*GoMetadata, error) {
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, filePath, nil, parser.ParseComments)
	if err != nil {
		return nil, fmt.Errorf("failed to parse file: %w", err)
	}

	metadata := &GoMetadata{
		Path:        filePath,
		PackageName: node.Name.Name,
		Imports:     []ImportInfo{},
		Structs:     []StructInfo{},
		Interfaces:  []InterfaceInfo{},
		Functions:   []FunctionInfo{},
		Methods:     []MethodWithReceiver{},
		Types:       []TypeInfo{},
		Constants:   []ConstInfo{},
		Variables:   []VarInfo{},
		Errors:      []string{},
	}

	// Extract imports
	for _, imp := range node.Imports {
		importInfo := ImportInfo{
			Path: strings.Trim(imp.Path.Value, `"`),
		}
		if imp.Name != nil {
			importInfo.Alias = imp.Name.Name
			importInfo.Name = imp.Name.Name
		} else {
			importInfo.Name = filepath.Base(importInfo.Path)
		}
		metadata.Imports = append(metadata.Imports, importInfo)
	}

	// Walk the AST
	ast.Inspect(node, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.TypeSpec:
			handleTypeSpec(x, metadata)
		case *ast.FuncDecl:
			handleFuncDecl(x, metadata)
		case *ast.GenDecl:
			handleGenDecl(x, metadata)
		}
		return true
	})

	return metadata, nil
}

func handleTypeSpec(ts *ast.TypeSpec, metadata *GoMetadata) {
	typeName := ts.Name.Name

	switch t := ts.Type.(type) {
	case *ast.StructType:
		structInfo := StructInfo{
			Name:    typeName,
			Type:    "struct",
			Fields:  []FieldInfo{},
			Methods: []MethodInfo{},
			Embeds:  []EmbedInfo{},
		}

		if t.Fields != nil {
			for _, field := range t.Fields.List {
				if len(field.Names) == 0 {
					// Embedded field
					embedInfo := EmbedInfo{
						Type:      exprToString(field.Type),
						IsPointer: isPointerType(field.Type),
						IsGeneric: containsGenerics(exprToString(field.Type)),
					}
					structInfo.Embeds = append(structInfo.Embeds, embedInfo)
				} else {
					// Named fields
					for _, name := range field.Names {
						fieldInfo := FieldInfo{
							Name:      name.Name,
							Type:      exprToString(field.Type),
							Exported:  ast.IsExported(name.Name),
							IsPointer: isPointerType(field.Type),
							IsSlice:   isSliceType(field.Type),
							IsMap:     isMapType(field.Type),
							IsChan:    isChanType(field.Type),
							IsGeneric: containsGenerics(exprToString(field.Type)),
						}
						if field.Tag != nil {
							fieldInfo.Tag = strings.Trim(field.Tag.Value, "`")
						}
						structInfo.Fields = append(structInfo.Fields, fieldInfo)
					}
				}
			}
		}

		metadata.Structs = append(metadata.Structs, structInfo)

	case *ast.InterfaceType:
		interfaceInfo := InterfaceInfo{
			Name:    typeName,
			Type:    "interface",
			Methods: []MethodInfo{},
			Embeds:  []string{},
		}

		if t.Methods != nil {
			for _, method := range t.Methods.List {
				if len(method.Names) == 0 {
					// Embedded interface
					interfaceInfo.Embeds = append(interfaceInfo.Embeds, exprToString(method.Type))
				} else {
					// Method
					for _, name := range method.Names {
						if funcType, ok := method.Type.(*ast.FuncType); ok {
							methodInfo := MethodInfo{
								Name:       name.Name,
								Parameters: extractParams(funcType.Params),
								ReturnType: extractReturnType(funcType.Results),
								Exported:   ast.IsExported(name.Name),
								IsGeneric:  containsGenericsInFunc(funcType),
							}
							interfaceInfo.Methods = append(interfaceInfo.Methods, methodInfo)
						}
					}
				}
			}
		}

		metadata.Interfaces = append(metadata.Interfaces, interfaceInfo)

	default:
		// Type alias
		typeInfo := TypeInfo{
			Name:           typeName,
			Type:           "alias",
			UnderlyingType: exprToString(ts.Type),
		}
		metadata.Types = append(metadata.Types, typeInfo)
	}
}

func handleFuncDecl(fd *ast.FuncDecl, metadata *GoMetadata) {
	if fd.Recv != nil {
		// Method
		receiver := ReceiverInfo{}
		if len(fd.Recv.List) > 0 {
			recv := fd.Recv.List[0]
			if len(recv.Names) > 0 {
				receiver.Name = recv.Names[0].Name
			}
			receiver.Type = exprToString(recv.Type)
		}

		methodInfo := MethodWithReceiver{
			Name:       fd.Name.Name,
			Receiver:   receiver,
			Parameters: extractParams(fd.Type.Params),
			ReturnType: extractReturnType(fd.Type.Results),
			Exported:   ast.IsExported(fd.Name.Name),
		}
		metadata.Methods = append(metadata.Methods, methodInfo)

		// Also add to the corresponding struct
		receiverTypeName := strings.TrimPrefix(receiver.Type, "*")
		for i := range metadata.Structs {
			if metadata.Structs[i].Name == receiverTypeName {
				structMethod := MethodInfo{
					Name:       fd.Name.Name,
					Parameters: methodInfo.Parameters,
					ReturnType: methodInfo.ReturnType,
					Exported:   methodInfo.Exported,
					IsGeneric:  containsGenericsInFunc(fd.Type),
				}
				metadata.Structs[i].Methods = append(metadata.Structs[i].Methods, structMethod)
				break
			}
		}
	} else {
		// Function
		functionInfo := FunctionInfo{
			Name:       fd.Name.Name,
			Parameters: extractParams(fd.Type.Params),
			ReturnType: extractReturnType(fd.Type.Results),
			Exported:   ast.IsExported(fd.Name.Name),
		}
		metadata.Functions = append(metadata.Functions, functionInfo)
	}
}

func handleGenDecl(gd *ast.GenDecl, metadata *GoMetadata) {
	switch gd.Tok {
	case token.CONST:
		for _, spec := range gd.Specs {
			if valueSpec, ok := spec.(*ast.ValueSpec); ok {
				for i, name := range valueSpec.Names {
					constInfo := ConstInfo{
						Name:     name.Name,
						Exported: ast.IsExported(name.Name),
					}
					if valueSpec.Type != nil {
						constInfo.Type = exprToString(valueSpec.Type)
					}
					if i < len(valueSpec.Values) {
						constInfo.Value = exprToString(valueSpec.Values[i])
					}
					metadata.Constants = append(metadata.Constants, constInfo)
				}
			}
		}
	case token.VAR:
		for _, spec := range gd.Specs {
			if valueSpec, ok := spec.(*ast.ValueSpec); ok {
				for i, name := range valueSpec.Names {
					varInfo := VarInfo{
						Name:     name.Name,
						Exported: ast.IsExported(name.Name),
					}
					if valueSpec.Type != nil {
						varInfo.Type = exprToString(valueSpec.Type)
					}
					if i < len(valueSpec.Values) {
						varInfo.Value = exprToString(valueSpec.Values[i])
					}
					metadata.Variables = append(metadata.Variables, varInfo)
				}
			}
		}
	}
}

func extractParams(params *ast.FieldList) []ParamInfo {
	if params == nil {
		return []ParamInfo{}
	}

	var result []ParamInfo
	for _, param := range params.List {
		paramType := exprToString(param.Type)
		if len(param.Names) == 0 {
			// Unnamed parameter
			result = append(result, ParamInfo{
				Name: "",
				Type: paramType,
			})
		} else {
			// Named parameters
			for _, name := range param.Names {
				result = append(result, ParamInfo{
					Name: name.Name,
					Type: paramType,
				})
			}
		}
	}
	return result
}

func extractReturnType(results *ast.FieldList) string {
	if results == nil || len(results.List) == 0 {
		return "void"
	}

	var types []string
	for _, result := range results.List {
		types = append(types, exprToString(result.Type))
	}

	if len(types) == 1 {
		return types[0]
	}
	return "(" + strings.Join(types, ", ") + ")"
}

func exprToString(expr ast.Expr) string {
	if expr == nil {
		return ""
	}

	switch e := expr.(type) {
	case *ast.Ident:
		return e.Name
	case *ast.StarExpr:
		return "*" + exprToString(e.X)
	case *ast.ArrayType:
		if e.Len == nil {
			return "[]" + exprToString(e.Elt)
		}
		return "[" + exprToString(e.Len) + "]" + exprToString(e.Elt)
	case *ast.MapType:
		return "map[" + exprToString(e.Key) + "]" + exprToString(e.Value)
	case *ast.ChanType:
		switch e.Dir {
		case ast.SEND:
			return "chan<- " + exprToString(e.Value)
		case ast.RECV:
			return "<-chan " + exprToString(e.Value)
		default:
			return "chan " + exprToString(e.Value)
		}
	case *ast.SelectorExpr:
		return exprToString(e.X) + "." + e.Sel.Name
	case *ast.IndexExpr:
		return exprToString(e.X) + "[" + exprToString(e.Index) + "]"
	case *ast.IndexListExpr:
		var indices []string
		for _, idx := range e.Indices {
			indices = append(indices, exprToString(idx))
		}
		return exprToString(e.X) + "[" + strings.Join(indices, ", ") + "]"
	case *ast.FuncType:
		params := extractParams(e.Params)
		var paramStrs []string
		for _, p := range params {
			if p.Name != "" {
				paramStrs = append(paramStrs, p.Name+" "+p.Type)
			} else {
				paramStrs = append(paramStrs, p.Type)
			}
		}
		return "func(" + strings.Join(paramStrs, ", ") + ") " + extractReturnType(e.Results)
	case *ast.InterfaceType:
		return "interface{}"
	case *ast.StructType:
		return "struct{}"
	default:
		return "unknown"
	}
}

func isPointerType(expr ast.Expr) bool {
	_, ok := expr.(*ast.StarExpr)
	return ok
}

func isSliceType(expr ast.Expr) bool {
	if arrayType, ok := expr.(*ast.ArrayType); ok {
		return arrayType.Len == nil
	}
	return false
}

func isMapType(expr ast.Expr) bool {
	_, ok := expr.(*ast.MapType)
	return ok
}

func isChanType(expr ast.Expr) bool {
	_, ok := expr.(*ast.ChanType)
	return ok
}

func containsGenerics(typeStr string) bool {
	return strings.Contains(typeStr, "[") && strings.Contains(typeStr, "]") &&
		!strings.HasPrefix(typeStr, "[]") && !strings.HasPrefix(typeStr, "map[")
}

func containsGenericsInFunc(funcType *ast.FuncType) bool {
	if funcType.TypeParams != nil && len(funcType.TypeParams.List) > 0 {
		return true
	}

	// Check parameters for generic types
	for _, param := range extractParams(funcType.Params) {
		if containsGenerics(param.Type) {
			return true
		}
	}

	// Check return type for generics
	returnType := extractReturnType(funcType.Results)
	return containsGenerics(returnType)
}