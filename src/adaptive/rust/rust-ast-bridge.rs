// Rust AST Bridge - Uses syn for accurate AST parsing
// Compile with: rustc --edition 2021 rust-ast-bridge.rs
// Or use as part of a Cargo project with syn as dependency

use std::env;
use std::fs;
use std::path::Path;

// When compiled as standalone, use simple JSON output
// For full AST support, compile with Cargo and syn crate

#[cfg(feature = "syn")]
use syn::{parse_file, Item, ItemFn, ItemStruct, ItemEnum, ItemTrait, ItemImpl, ItemMod, ItemUse, ItemConst, ItemType};

#[cfg(feature = "syn")]
use serde_json::json;

#[derive(Debug)]
struct RustMetadata {
    structs: Vec<StructInfo>,
    enums: Vec<EnumInfo>,
    traits: Vec<TraitInfo>,
    functions: Vec<FunctionInfo>,
    impls: Vec<ImplInfo>,
    modules: Vec<ModuleInfo>,
    uses: Vec<String>,
    constants: Vec<ConstantInfo>,
    types: Vec<TypeInfo>,
}

#[derive(Debug)]
struct StructInfo {
    name: String,
    is_pub: bool,
    generics: Vec<String>,
    fields: Vec<FieldInfo>,
    derives: Vec<String>,
}

#[derive(Debug)]
struct FieldInfo {
    name: String,
    ty: String,
    is_pub: bool,
}

#[derive(Debug)]
struct EnumInfo {
    name: String,
    is_pub: bool,
    generics: Vec<String>,
    variants: Vec<String>,
    derives: Vec<String>,
}

#[derive(Debug)]
struct TraitInfo {
    name: String,
    is_pub: bool,
    generics: Vec<String>,
    methods: Vec<String>,
}

#[derive(Debug)]
struct FunctionInfo {
    name: String,
    is_pub: bool,
    is_async: bool,
    is_const: bool,
    is_unsafe: bool,
    generics: Vec<String>,
    params: Vec<ParamInfo>,
    return_type: Option<String>,
}

#[derive(Debug)]
struct ParamInfo {
    name: String,
    ty: String,
    is_mut: bool,
}

#[derive(Debug)]
struct ImplInfo {
    trait_name: Option<String>,
    target_type: String,
    methods: Vec<String>,
}

#[derive(Debug)]
struct ModuleInfo {
    name: String,
    is_pub: bool,
}

#[derive(Debug)]
struct ConstantInfo {
    name: String,
    is_pub: bool,
    ty: Option<String>,
}

#[derive(Debug)]
struct TypeInfo {
    name: String,
    is_pub: bool,
}

impl RustMetadata {
    fn new() -> Self {
        RustMetadata {
            structs: Vec::new(),
            enums: Vec::new(),
            traits: Vec::new(),
            functions: Vec::new(),
            impls: Vec::new(),
            modules: Vec::new(),
            uses: Vec::new(),
            constants: Vec::new(),
            types: Vec::new(),
        }
    }

    fn to_json(&self) -> String {
        // Manual JSON serialization for standalone compilation
        let mut json = String::from("{");

        // Structs
        json.push_str("\"structs\":[");
        for (i, s) in self.structs.iter().enumerate() {
            if i > 0 { json.push_str(","); }
            json.push_str(&format!(
                "{{\"name\":\"{}\",\"isPublic\":{},\"fields\":[",
                s.name, s.is_pub
            ));
            for (j, f) in s.fields.iter().enumerate() {
                if j > 0 { json.push_str(","); }
                json.push_str(&format!(
                    "{{\"name\":\"{}\",\"type\":\"{}\",\"isPublic\":{}}}",
                    f.name, f.ty, f.is_pub
                ));
            }
            json.push_str("]}");
        }
        json.push_str("],");

        // Enums
        json.push_str("\"enums\":[");
        for (i, e) in self.enums.iter().enumerate() {
            if i > 0 { json.push_str(","); }
            json.push_str(&format!(
                "{{\"name\":\"{}\",\"isPublic\":{},\"variants\":[",
                e.name, e.is_pub
            ));
            for (j, v) in e.variants.iter().enumerate() {
                if j > 0 { json.push_str(","); }
                json.push_str(&format!("\"{}\"", v));
            }
            json.push_str("]}");
        }
        json.push_str("],");

        // Traits
        json.push_str("\"traits\":[");
        for (i, t) in self.traits.iter().enumerate() {
            if i > 0 { json.push_str(","); }
            json.push_str(&format!(
                "{{\"name\":\"{}\",\"isPublic\":{},\"methods\":[",
                t.name, t.is_pub
            ));
            for (j, m) in t.methods.iter().enumerate() {
                if j > 0 { json.push_str(","); }
                json.push_str(&format!("\"{}\"", m));
            }
            json.push_str("]}");
        }
        json.push_str("],");

        // Functions
        json.push_str("\"functions\":[");
        for (i, f) in self.functions.iter().enumerate() {
            if i > 0 { json.push_str(","); }
            json.push_str(&format!(
                "{{\"name\":\"{}\",\"isPublic\":{},\"isAsync\":{},\"isConst\":{},\"isUnsafe\":{},\"parameters\":[",
                f.name, f.is_pub, f.is_async, f.is_const, f.is_unsafe
            ));
            for (j, p) in f.params.iter().enumerate() {
                if j > 0 { json.push_str(","); }
                json.push_str(&format!(
                    "{{\"name\":\"{}\",\"type\":\"{}\",\"isMut\":{}}}",
                    p.name, p.ty, p.is_mut
                ));
            }
            json.push_str("]");
            if let Some(ref ret) = f.return_type {
                json.push_str(&format!(",\"returnType\":\"{}\"", ret));
            }
            json.push_str("}");
        }
        json.push_str("],");

        // Impls
        json.push_str("\"impls\":[");
        for (i, imp) in self.impls.iter().enumerate() {
            if i > 0 { json.push_str(","); }
            json.push_str(&format!("{{\"targetType\":\"{}\"", imp.target_type));
            if let Some(ref trait_name) = imp.trait_name {
                json.push_str(&format!(",\"traitName\":\"{}\"", trait_name));
            }
            json.push_str(",\"methods\":[");
            for (j, m) in imp.methods.iter().enumerate() {
                if j > 0 { json.push_str(","); }
                json.push_str(&format!("\"{}\"", m));
            }
            json.push_str("]}");
        }
        json.push_str("],");

        // Modules
        json.push_str("\"modules\":[");
        for (i, m) in self.modules.iter().enumerate() {
            if i > 0 { json.push_str(","); }
            json.push_str(&format!(
                "{{\"name\":\"{}\",\"isPublic\":{}}}",
                m.name, m.is_pub
            ));
        }
        json.push_str("],");

        // Uses
        json.push_str("\"uses\":[");
        for (i, u) in self.uses.iter().enumerate() {
            if i > 0 { json.push_str(","); }
            json.push_str(&format!("\"{}\"", u));
        }
        json.push_str("],");

        // Constants
        json.push_str("\"constants\":[");
        for (i, c) in self.constants.iter().enumerate() {
            if i > 0 { json.push_str(","); }
            json.push_str(&format!(
                "{{\"name\":\"{}\",\"isPublic\":{}",
                c.name, c.is_pub
            ));
            if let Some(ref ty) = c.ty {
                json.push_str(&format!(",\"type\":\"{}\"", ty));
            }
            json.push_str("}");
        }
        json.push_str("],");

        // Type aliases
        json.push_str("\"types\":[");
        for (i, t) in self.types.iter().enumerate() {
            if i > 0 { json.push_str(","); }
            json.push_str(&format!(
                "{{\"name\":\"{}\",\"isPublic\":{}}}",
                t.name, t.is_pub
            ));
        }
        json.push_str("],");

        // Parser info
        json.push_str("\"parser\":\"rustc/syn\",");
        json.push_str("\"version\":\"1.0.0\",");
        json.push_str("\"success\":true");

        json.push_str("}");
        json
    }
}

#[cfg(feature = "syn")]
fn parse_with_syn(file_path: &str) -> Result<RustMetadata, Box<dyn std::error::Error>> {
    let content = fs::read_to_string(file_path)?;
    let syntax = parse_file(&content)?;

    let mut metadata = RustMetadata::new();

    for item in syntax.items {
        match item {
            Item::Struct(item_struct) => {
                let struct_info = StructInfo {
                    name: item_struct.ident.to_string(),
                    is_pub: matches!(item_struct.vis, syn::Visibility::Public(_)),
                    generics: extract_generics(&item_struct.generics),
                    fields: extract_fields(&item_struct.fields),
                    derives: extract_derives(&item_struct.attrs),
                };
                metadata.structs.push(struct_info);
            }
            Item::Enum(item_enum) => {
                let enum_info = EnumInfo {
                    name: item_enum.ident.to_string(),
                    is_pub: matches!(item_enum.vis, syn::Visibility::Public(_)),
                    generics: extract_generics(&item_enum.generics),
                    variants: item_enum.variants.iter()
                        .map(|v| v.ident.to_string())
                        .collect(),
                    derives: extract_derives(&item_enum.attrs),
                };
                metadata.enums.push(enum_info);
            }
            Item::Trait(item_trait) => {
                let trait_info = TraitInfo {
                    name: item_trait.ident.to_string(),
                    is_pub: matches!(item_trait.vis, syn::Visibility::Public(_)),
                    generics: extract_generics(&item_trait.generics),
                    methods: item_trait.items.iter()
                        .filter_map(|item| {
                            if let syn::TraitItem::Method(method) = item {
                                Some(method.sig.ident.to_string())
                            } else {
                                None
                            }
                        })
                        .collect(),
                };
                metadata.traits.push(trait_info);
            }
            Item::Fn(item_fn) => {
                let func_info = FunctionInfo {
                    name: item_fn.sig.ident.to_string(),
                    is_pub: matches!(item_fn.vis, syn::Visibility::Public(_)),
                    is_async: item_fn.sig.asyncness.is_some(),
                    is_const: item_fn.sig.constness.is_some(),
                    is_unsafe: item_fn.sig.unsafety.is_some(),
                    generics: extract_generics(&item_fn.sig.generics),
                    params: extract_params(&item_fn.sig.inputs),
                    return_type: extract_return_type(&item_fn.sig.output),
                };
                metadata.functions.push(func_info);
            }
            Item::Impl(item_impl) => {
                let impl_info = ImplInfo {
                    trait_name: item_impl.trait_.as_ref().map(|(_, path, _)| {
                        path.segments.last()
                            .map(|s| s.ident.to_string())
                            .unwrap_or_default()
                    }),
                    target_type: extract_type(&item_impl.self_ty),
                    methods: item_impl.items.iter()
                        .filter_map(|item| {
                            if let syn::ImplItem::Method(method) = item {
                                Some(method.sig.ident.to_string())
                            } else {
                                None
                            }
                        })
                        .collect(),
                };
                metadata.impls.push(impl_info);
            }
            Item::Mod(item_mod) => {
                let mod_info = ModuleInfo {
                    name: item_mod.ident.to_string(),
                    is_pub: matches!(item_mod.vis, syn::Visibility::Public(_)),
                };
                metadata.modules.push(mod_info);
            }
            Item::Use(item_use) => {
                if let Some(use_path) = extract_use_path(&item_use.tree) {
                    metadata.uses.push(use_path);
                }
            }
            Item::Const(item_const) => {
                let const_info = ConstantInfo {
                    name: item_const.ident.to_string(),
                    is_pub: matches!(item_const.vis, syn::Visibility::Public(_)),
                    ty: Some(extract_type(&item_const.ty)),
                };
                metadata.constants.push(const_info);
            }
            Item::Type(item_type) => {
                let type_info = TypeInfo {
                    name: item_type.ident.to_string(),
                    is_pub: matches!(item_type.vis, syn::Visibility::Public(_)),
                };
                metadata.types.push(type_info);
            }
            _ => {}
        }
    }

    Ok(metadata)
}

// Fallback parser using regex when syn is not available
fn parse_with_regex(file_path: &str) -> Result<RustMetadata, Box<dyn std::error::Error>> {
    let content = fs::read_to_string(file_path)?;
    let mut metadata = RustMetadata::new();

    // Parse structs
    let struct_re = regex::Regex::new(r"(?m)^\s*(pub\s+)?struct\s+(\w+)")?;
    for cap in struct_re.captures_iter(&content) {
        metadata.structs.push(StructInfo {
            name: cap[2].to_string(),
            is_pub: cap.get(1).is_some(),
            generics: Vec::new(),
            fields: Vec::new(),
            derives: Vec::new(),
        });
    }

    // Parse enums
    let enum_re = regex::Regex::new(r"(?m)^\s*(pub\s+)?enum\s+(\w+)")?;
    for cap in enum_re.captures_iter(&content) {
        metadata.enums.push(EnumInfo {
            name: cap[2].to_string(),
            is_pub: cap.get(1).is_some(),
            generics: Vec::new(),
            variants: Vec::new(),
            derives: Vec::new(),
        });
    }

    // Parse traits
    let trait_re = regex::Regex::new(r"(?m)^\s*(pub\s+)?trait\s+(\w+)")?;
    for cap in trait_re.captures_iter(&content) {
        metadata.traits.push(TraitInfo {
            name: cap[2].to_string(),
            is_pub: cap.get(1).is_some(),
            generics: Vec::new(),
            methods: Vec::new(),
        });
    }

    // Parse functions
    let fn_re = regex::Regex::new(r"(?m)^\s*(pub\s+)?(async\s+)?(const\s+)?(unsafe\s+)?fn\s+(\w+)")?;
    for cap in fn_re.captures_iter(&content) {
        metadata.functions.push(FunctionInfo {
            name: cap[5].to_string(),
            is_pub: cap.get(1).is_some(),
            is_async: cap.get(2).is_some(),
            is_const: cap.get(3).is_some(),
            is_unsafe: cap.get(4).is_some(),
            generics: Vec::new(),
            params: Vec::new(),
            return_type: None,
        });
    }

    // Parse use statements
    let use_re = regex::Regex::new(r"(?m)^\s*use\s+([^;]+);")?;
    for cap in use_re.captures_iter(&content) {
        metadata.uses.push(cap[1].to_string());
    }

    // Parse modules
    let mod_re = regex::Regex::new(r"(?m)^\s*(pub\s+)?mod\s+(\w+)")?;
    for cap in mod_re.captures_iter(&content) {
        metadata.modules.push(ModuleInfo {
            name: cap[2].to_string(),
            is_pub: cap.get(1).is_some(),
        });
    }

    // Parse constants
    let const_re = regex::Regex::new(r"(?m)^\s*(pub\s+)?const\s+(\w+)")?;
    for cap in const_re.captures_iter(&content) {
        metadata.constants.push(ConstantInfo {
            name: cap[2].to_string(),
            is_pub: cap.get(1).is_some(),
            ty: None,
        });
    }

    // Parse type aliases
    let type_re = regex::Regex::new(r"(?m)^\s*(pub\s+)?type\s+(\w+)")?;
    for cap in type_re.captures_iter(&content) {
        metadata.types.push(TypeInfo {
            name: cap[2].to_string(),
            is_pub: cap.get(1).is_some(),
        });
    }

    Ok(metadata)
}

// Helper functions for syn feature
#[cfg(feature = "syn")]
fn extract_generics(generics: &syn::Generics) -> Vec<String> {
    generics.params.iter()
        .filter_map(|param| {
            if let syn::GenericParam::Type(type_param) = param {
                Some(type_param.ident.to_string())
            } else {
                None
            }
        })
        .collect()
}

#[cfg(feature = "syn")]
fn extract_fields(fields: &syn::Fields) -> Vec<FieldInfo> {
    match fields {
        syn::Fields::Named(fields) => {
            fields.named.iter()
                .map(|field| FieldInfo {
                    name: field.ident.as_ref()
                        .map(|i| i.to_string())
                        .unwrap_or_default(),
                    ty: extract_type(&field.ty),
                    is_pub: matches!(field.vis, syn::Visibility::Public(_)),
                })
                .collect()
        }
        syn::Fields::Unnamed(fields) => {
            fields.unnamed.iter()
                .enumerate()
                .map(|(i, field)| FieldInfo {
                    name: i.to_string(),
                    ty: extract_type(&field.ty),
                    is_pub: matches!(field.vis, syn::Visibility::Public(_)),
                })
                .collect()
        }
        syn::Fields::Unit => Vec::new(),
    }
}

#[cfg(feature = "syn")]
fn extract_type(ty: &syn::Type) -> String {
    quote::quote!(#ty).to_string()
}

#[cfg(feature = "syn")]
fn extract_derives(attrs: &[syn::Attribute]) -> Vec<String> {
    attrs.iter()
        .filter(|attr| attr.path.is_ident("derive"))
        .flat_map(|attr| {
            if let Ok(syn::Meta::List(list)) = attr.parse_meta() {
                list.nested.iter()
                    .filter_map(|nested| {
                        if let syn::NestedMeta::Meta(syn::Meta::Path(path)) = nested {
                            path.get_ident().map(|i| i.to_string())
                        } else {
                            None
                        }
                    })
                    .collect()
            } else {
                Vec::new()
            }
        })
        .collect()
}

#[cfg(feature = "syn")]
fn extract_params(inputs: &syn::punctuated::Punctuated<syn::FnArg, syn::token::Comma>) -> Vec<ParamInfo> {
    inputs.iter()
        .filter_map(|arg| {
            if let syn::FnArg::Typed(pat_type) = arg {
                if let syn::Pat::Ident(ident) = &*pat_type.pat {
                    Some(ParamInfo {
                        name: ident.ident.to_string(),
                        ty: extract_type(&pat_type.ty),
                        is_mut: ident.mutability.is_some(),
                    })
                } else {
                    None
                }
            } else {
                None
            }
        })
        .collect()
}

#[cfg(feature = "syn")]
fn extract_return_type(output: &syn::ReturnType) -> Option<String> {
    match output {
        syn::ReturnType::Default => None,
        syn::ReturnType::Type(_, ty) => Some(extract_type(ty)),
    }
}

#[cfg(feature = "syn")]
fn extract_use_path(tree: &syn::UseTree) -> Option<String> {
    match tree {
        syn::UseTree::Path(path) => {
            Some(format!("{}::{}", path.ident, extract_use_path(&path.tree)?))
        }
        syn::UseTree::Name(name) => Some(name.ident.to_string()),
        syn::UseTree::Rename(rename) => Some(format!("{} as {}", rename.ident, rename.rename)),
        syn::UseTree::Glob(_) => Some("*".to_string()),
        syn::UseTree::Group(group) => {
            let paths: Vec<String> = group.items.iter()
                .filter_map(|item| extract_use_path(item))
                .collect();
            Some(format!("{{{}}}", paths.join(", ")))
        }
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("{{\"error\":\"No file path provided\",\"success\":false}}");
        std::process::exit(1);
    }

    let file_path = &args[1];

    if !Path::new(file_path).exists() {
        eprintln!("{{\"error\":\"File not found: {}\",\"success\":false}}", file_path);
        std::process::exit(1);
    }

    // Try to use syn if available, otherwise fall back to regex
    let result = {
        #[cfg(feature = "syn")]
        {
            parse_with_syn(file_path)
        }
        #[cfg(not(feature = "syn"))]
        {
            // For standalone compilation without syn, try simple parsing
            // In production, would use rust-analyzer or cargo metadata
            let mut metadata = RustMetadata::new();

            // Basic extraction without external crates
            if let Ok(content) = fs::read_to_string(file_path) {
                // Very basic struct detection
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.starts_with("pub struct ") || trimmed.starts_with("struct ") {
                        let is_pub = trimmed.starts_with("pub ");
                        let name_start = if is_pub { 11 } else { 7 };
                        if let Some(name_end) = trimmed[name_start..].find(|c: char| !c.is_alphanumeric() && c != '_') {
                            let name = &trimmed[name_start..name_start + name_end];
                            metadata.structs.push(StructInfo {
                                name: name.to_string(),
                                is_pub,
                                generics: Vec::new(),
                                fields: Vec::new(),
                                derives: Vec::new(),
                            });
                        }
                    } else if trimmed.starts_with("pub enum ") || trimmed.starts_with("enum ") {
                        let is_pub = trimmed.starts_with("pub ");
                        let name_start = if is_pub { 9 } else { 5 };
                        if let Some(name_end) = trimmed[name_start..].find(|c: char| !c.is_alphanumeric() && c != '_') {
                            let name = &trimmed[name_start..name_start + name_end];
                            metadata.enums.push(EnumInfo {
                                name: name.to_string(),
                                is_pub,
                                generics: Vec::new(),
                                variants: Vec::new(),
                                derives: Vec::new(),
                            });
                        }
                    } else if trimmed.starts_with("pub fn ") || trimmed.starts_with("fn ") ||
                             trimmed.starts_with("pub async fn ") || trimmed.starts_with("async fn ") {
                        let is_pub = trimmed.starts_with("pub ");
                        let is_async = trimmed.contains("async ");
                        let fn_pos = trimmed.find("fn ").unwrap();
                        let name_start = fn_pos + 3;
                        if let Some(name_end) = trimmed[name_start..].find(|c: char| c == '(' || c == '<') {
                            let name = &trimmed[name_start..name_start + name_end];
                            metadata.functions.push(FunctionInfo {
                                name: name.to_string(),
                                is_pub,
                                is_async,
                                is_const: false,
                                is_unsafe: trimmed.contains("unsafe "),
                                generics: Vec::new(),
                                params: Vec::new(),
                                return_type: None,
                            });
                        }
                    }
                }
                Ok(metadata)
            } else {
                Err("Failed to read file".into())
            }
        }
    };

    match result {
        Ok(metadata) => {
            println!("{}", metadata.to_json());
        }
        Err(e) => {
            eprintln!("{{\"error\":\"{}\",\"success\":false}}", e);
            std::process::exit(1);
        }
    }
}