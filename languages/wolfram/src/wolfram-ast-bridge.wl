(* Wolfram Language AST Bridge using CodeParse *)
(* Advanced parsing with full AST analysis *)

(* Check for CodeParse availability and load if present *)
hasCodeParse = Quiet[Check[
  Needs["CodeParser`"];
  True,
  False
]];

(* Main parsing function *)
parseFile[filePath_String] := Module[
  {content, result, metadata},

  (* Read file content *)
  content = Import[filePath, "Text"];
  If[content === $Failed,
    Return[ExportString[<|"error" -> "Failed to read file"|>, "JSON"]]
  ];

  (* Choose parsing method based on availability *)
  If[hasCodeParse,
    result = parseWithCodeParse[content, filePath],
    result = parseWithToExpression[content, filePath]
  ];

  (* Export as JSON *)
  ExportString[result, "JSON", "Compact" -> True]
]

(* Modern AST parsing with CodeParse *)
parseWithCodeParse[content_String, filePath_String] := Module[
  {ast, metadata, aggregateAST},

  (* Parse to concrete syntax tree *)
  ast = CodeParse[content, "SourceConvention" -> "SourceCharacterIndex"];

  If[FailureQ[ast],
    Return[<|"error" -> "Parse failed", "fallback" -> True|>]
  ];

  (* Initialize metadata *)
  metadata = <|
    "packages" -> {},
    "contexts" -> {},
    "functions" -> {},
    "symbols" -> {},
    "patterns" -> {},
    "rules" -> {},
    "tests" -> {},
    "options" -> {},
    "imports" -> {},
    "version" -> "CodeParse"
  |>;

  (* Aggregate AST if available *)
  If[MatchQ[ast, _CodeParser`AggregateNode | _CodeParser`ContainerNode],
    aggregateAST = CodeParser`Abstract[ast];
    extractFromAST[aggregateAST, metadata]
  ];

  (* Also scan the concrete tree *)
  scanConcreteTree[ast, metadata];

  metadata
]

(* Fallback parsing with ToExpression and Hold *)
parseWithToExpression[content_String, filePath_String] := Module[
  {expressions, metadata, held, currentContext = "Global`", currentPackage = None},

  metadata = <|
    "packages" -> {},
    "contexts" -> {},
    "functions" -> {},
    "symbols" -> {},
    "patterns" -> {},
    "rules" -> {},
    "tests" -> {},
    "options" -> {},
    "imports" -> {},
    "version" -> "ToExpression"
  |>;

  (* Parse with Hold to prevent evaluation *)
  expressions = Quiet[Check[
    ToExpression[content, InputForm, Hold],
    Hold[Null]
  ]];

  (* Process held expressions *)
  processHeldExpressions[expressions, metadata, currentContext, currentPackage];

  metadata
]

(* Extract metadata from CodeParse AST *)
extractFromAST[ast_, metadata_] := Module[{},
  Which[
    (* Package declaration *)
    MatchQ[ast, CodeParser`CallNode[
      CodeParser`LeafNode[Symbol, "BeginPackage", _],
      {CodeParser`LeafNode[String, name_, _], ___},
      _
    ]],
    AppendTo[metadata["packages"], <|
      "name" -> name,
      "line" -> getLineNumber[ast],
      "exports" -> {},
      "dependencies" -> Cases[ast[[2]], CodeParser`LeafNode[String, dep_, _] :> dep]
    |>],

    (* Function definitions *)
    MatchQ[ast, CodeParser`BinaryNode[
      Set | SetDelayed,
      {CodeParser`CallNode[CodeParser`LeafNode[Symbol, fname_, _], args_, _], _},
      _
    ]],
    processFunctionAST[ast, metadata],

    (* Symbol definitions *)
    MatchQ[ast, CodeParser`BinaryNode[
      Set | SetDelayed,
      {CodeParser`LeafNode[Symbol, sname_, _], _},
      _
    ]],
    processSymbolAST[ast, metadata],

    (* VerificationTest *)
    MatchQ[ast, CodeParser`CallNode[
      CodeParser`LeafNode[Symbol, "VerificationTest", _],
      _,
      _
    ]],
    processTestAST[ast, metadata],

    (* Options definition *)
    MatchQ[ast, CodeParser`BinaryNode[
      Set,
      {CodeParser`CallNode[
        CodeParser`LeafNode[Symbol, "Options", _],
        {CodeParser`LeafNode[Symbol, fname_, _]},
        _
      ], _},
      _
    ]],
    processOptionsAST[ast, metadata],

    (* Recurse for container nodes *)
    MatchQ[ast, CodeParser`ContainerNode[_, children_, _]],
    Scan[extractFromAST[#, metadata]&, children],

    (* Recurse for call nodes *)
    MatchQ[ast, CodeParser`CallNode[_, children_, _]],
    Scan[extractFromAST[#, metadata]&, children],

    True,
    Null
  ]
]

(* Process function from AST *)
processFunctionAST[ast_, metadata_] := Module[
  {fname, args, hasPattern, isMemoized, params, source},

  fname = ast[[2, 1, 2, 2]];
  args = ast[[2, 1, 3]];

  (* Check for patterns in arguments *)
  hasPattern = !FreeQ[args, _Pattern | _Blank | _BlankSequence | _BlankNullSequence];

  (* Check for memoization pattern *)
  source = getSourceString[ast];
  isMemoized = StringContainsQ[source, fname <> "[" ~~ ___ ~~ "]" ~~ ___ ~~ "=" ~~ ___ ~~ fname <> "["];

  (* Extract parameters *)
  params = extractParametersFromAST[args];

  AppendTo[metadata["functions"], <|
    "name" -> fname,
    "line" -> getLineNumber[ast],
    "hasPattern" -> hasPattern,
    "isMemoized" -> isMemoized,
    "isDelayed" -> ast[[1]] === SetDelayed,
    "parameters" -> params,
    "source" -> Take[source, UpTo[100]]  (* First 100 chars for reference *)
  |>]
]

(* Process symbol from AST *)
processSymbolAST[ast_, metadata_] := Module[
  {sname},

  sname = ast[[2, 1, 2]];

  AppendTo[metadata["symbols"], <|
    "name" -> sname,
    "line" -> getLineNumber[ast],
    "isConstant" -> StringMatchQ[sname, UpperCaseQ[StringTake[#, 1]]&],
    "isDelayed" -> ast[[1]] === SetDelayed
  |>]
]

(* Process test from AST *)
processTestAST[ast_, metadata_] := Module[
  {testContent},

  testContent = getSourceString[ast];

  AppendTo[metadata["tests"], <|
    "type" -> "VerificationTest",
    "line" -> getLineNumber[ast],
    "content" -> Take[testContent, UpTo[200]]
  |>]
]

(* Process options from AST *)
processOptionsAST[ast_, metadata_] := Module[
  {fname, options},

  fname = ast[[2, 1, 3, 1, 2]];
  options = ast[[2, 2]];

  AppendTo[metadata["options"], <|
    "function" -> fname,
    "line" -> getLineNumber[ast],
    "options" -> extractOptionsFromAST[options]
  |>]
]

(* Extract parameters from AST arguments *)
extractParametersFromAST[args_] := Module[{params = {}},
  If[MatchQ[args, {___}],
    params = Map[
      Function[{arg},
        Which[
          MatchQ[arg, CodeParser`BinaryNode[Pattern, {CodeParser`LeafNode[Symbol, name_, _], pat_}, _]],
          <|"name" -> name, "pattern" -> getPatternType[pat], "optional" -> False|>,

          MatchQ[arg, CodeParser`BinaryNode[Optional, _, _]],
          <|"name" -> "optional", "pattern" -> "Any", "optional" -> True|>,

          MatchQ[arg, CodeParser`LeafNode[Symbol, name_, _]],
          <|"name" -> name, "pattern" -> "None", "optional" -> False|>,

          True,
          <|"name" -> "arg", "pattern" -> "Any", "optional" -> False|>
        ]
      ],
      args
    ]
  ];
  params
]

(* Get pattern type from AST *)
getPatternType[pat_] := Which[
  MatchQ[pat, CodeParser`LeafNode[Symbol, "Blank", _]], "Any",
  MatchQ[pat, CodeParser`CallNode[CodeParser`LeafNode[Symbol, "Blank", _], {CodeParser`LeafNode[Symbol, head_, _]}, _]], head,
  MatchQ[pat, CodeParser`LeafNode[Symbol, "BlankSequence", _]], "Sequence",
  MatchQ[pat, CodeParser`LeafNode[Symbol, "BlankNullSequence", _]], "NullSequence",
  True, "Unknown"
]

(* Extract options from AST *)
extractOptionsFromAST[optionsNode_] := Module[{opts = {}},
  If[MatchQ[optionsNode, CodeParser`CallNode[CodeParser`LeafNode[Symbol, "List", _], items_, _]],
    opts = Map[
      Function[{item},
        If[MatchQ[item, CodeParser`BinaryNode[Rule | RuleDelayed, {left_, right_}, _]],
          <|"name" -> getNodeString[left], "default" -> getNodeString[right]|>,
          <|"name" -> "unknown", "default" -> "unknown"|>
        ]
      ],
      items
    ]
  ];
  opts
]

(* Scan concrete tree (for nodes not in abstract tree) *)
scanConcreteTree[tree_, metadata_] := Module[{},
  Which[
    (* Look for usage messages *)
    MatchQ[tree, CodeParser`BinaryNode[
      MessageName,
      {CodeParser`LeafNode[Symbol, name_, _], CodeParser`LeafNode[String, "usage", _]},
      _
    ]],
    (* Mark the symbol as having documentation *)
    metadata["symbols"] = Append[
      metadata["symbols"],
      <|"name" -> name, "hasUsage" -> True, "line" -> getLineNumber[tree]|>
    ],

    (* Look for Begin["context`"] *)
    MatchQ[tree, CodeParser`CallNode[
      CodeParser`LeafNode[Symbol, "Begin", _],
      {CodeParser`LeafNode[String, ctx_, _]},
      _
    ]],
    AppendTo[metadata["contexts"], ctx],

    (* Look for Needs or Get *)
    MatchQ[tree, CodeParser`CallNode[
      CodeParser`LeafNode[Symbol, "Needs" | "Get", _],
      {CodeParser`LeafNode[String, pkg_, _]},
      _
    ]],
    AppendTo[metadata["imports"], pkg],

    (* Recurse *)
    MatchQ[tree, _[_, children_List, ___]],
    Scan[scanConcreteTree[#, metadata]&, children],

    True,
    Null
  ]
]

(* Process held expressions (fallback method) *)
processHeldExpressions[Hold[exprs___], metadata_, context_, package_] := Module[
  {currentContext = context, currentPackage = package},

  Scan[
    Function[{expr},
      Which[
        (* BeginPackage *)
        MatchQ[expr, BeginPackage[name_String, ___]],
        (
          currentPackage = name;
          AppendTo[metadata["packages"], <|
            "name" -> name,
            "exports" -> {},
            "dependencies" -> Cases[{expr}, BeginPackage[_, deps___] :> {deps}][[1]]
          |>]
        ),

        (* Begin context *)
        MatchQ[expr, Begin[ctx_String]],
        currentContext = ctx,

        (* Function definition *)
        MatchQ[expr, (Set | SetDelayed)[f_[___], _]],
        processFunctionHeld[expr, metadata, currentContext],

        (* Symbol definition *)
        MatchQ[expr, (Set | SetDelayed)[s_Symbol, _]],
        processSymbolHeld[expr, metadata, currentContext],

        (* VerificationTest *)
        MatchQ[expr, VerificationTest[___]],
        AppendTo[metadata["tests"], <|
          "type" -> "VerificationTest",
          "content" -> ToString[InputForm[expr], CharacterEncoding -> "ASCII"]
        |>],

        (* Options *)
        MatchQ[expr, Options[f_] = opts_List],
        AppendTo[metadata["options"], <|
          "function" -> ToString[f],
          "options" -> Map[{ToString[#[[1]]], ToString[#[[2]]]}&, opts]
        |>],

        (* Compound expression *)
        MatchQ[expr, CompoundExpression[___]],
        processHeldExpressions[Hold @@ {expr}, metadata, currentContext, currentPackage],

        True,
        Null
      ]
    ],
    {exprs}
  ]
]

(* Process function from held expression *)
processFunctionHeld[expr_, metadata_, context_] := Module[
  {fname, args, hasPattern},

  fname = expr[[1, 0]];
  args = expr[[1]];
  hasPattern = !FreeQ[args, _Pattern | _Blank | _BlankSequence | _BlankNullSequence];

  AppendTo[metadata["functions"], <|
    "name" -> ToString[fname],
    "context" -> context,
    "hasPattern" -> hasPattern,
    "isDelayed" -> Head[expr] === SetDelayed,
    "arity" -> Length[args]
  |>]
]

(* Process symbol from held expression *)
processSymbolHeld[expr_, metadata_, context_] := Module[
  {sname},

  sname = expr[[1]];

  AppendTo[metadata["symbols"], <|
    "name" -> ToString[sname],
    "context" -> context,
    "isConstant" -> UpperCaseQ[StringTake[ToString[sname], 1]],
    "isDelayed" -> Head[expr] === SetDelayed
  |>]
]

(* Utility functions *)
getLineNumber[node_] := Module[{data},
  data = Replace[node, {
    _[_, _, KeyValuePattern[CodeParser`Source -> {start_, _}]] :> start,
    _ -> Missing[]
  }];
  If[MissingQ[data], 1, data[[1]]]
]

getSourceString[node_] := Module[{},
  Replace[node, {
    _[_, _, KeyValuePattern["String" -> s_]] :> s,
    _ -> ""
  }]
]

getNodeString[node_] := Module[{},
  Replace[node, {
    CodeParser`LeafNode[_, value_, _] :> ToString[value],
    _ -> "unknown"
  }]
]

(* Main entry point *)
If[Length[$ScriptCommandLine] >= 2,
  result = parseFile[$ScriptCommandLine[[2]]];
  WriteString["stdout", result];
  Exit[0],
  WriteString["stderr", ExportString[<|"error" -> "No file path provided"|>, "JSON"]];
  Exit[1]
]