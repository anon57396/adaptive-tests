(* Wolfram Language Bridge Script for AST Parsing *)
(* This script is executed by the discovery collector to extract metadata *)

BeginPackage["AdaptiveTestsBridge`"]

ExtractMetadata::usage = "ExtractMetadata[filePath] extracts discovery metadata from a Wolfram file"

Begin["`Private`"]

(* Parse a Wolfram file and extract metadata *)
ExtractMetadata[filePath_String] := Module[
  {content, expressions, metadata},

  (* Initialize metadata structure *)
  metadata = <|
    "packages" -> {},
    "contexts" -> {},
    "functions" -> {},
    "patterns" -> {},
    "symbols" -> {},
    "rules" -> {},
    "tests" -> {},
    "options" -> {}
  |>;

  (* Read and parse file *)
  content = Import[filePath, "Text"];
  If[content === $Failed, Return[ExportString[metadata, "JSON"]]];

  (* Parse expressions safely *)
  expressions = Quiet[Check[
    ToExpression[content, InputForm, HoldComplete],
    HoldComplete[Null]
  ]];

  (* Extract information from parsed expressions *)
  ScanExpressions[expressions, metadata];

  (* Export as JSON *)
  ExportString[metadata, "JSON"]
]

(* Scan expressions recursively *)
ScanExpressions[expr_, metadata_] := Module[{},
  Switch[expr,
    (* Package definitions *)
    HoldComplete[BeginPackage[name_String, deps___]],
    AppendTo[metadata["packages"], <|
      "name" -> name,
      "dependencies" -> {deps},
      "exports" -> {},
      "privateSymbols" -> {}
    |>],

    (* Context management *)
    HoldComplete[Begin[ctx_String]],
    AppendTo[metadata["contexts"], ctx],

    (* Function definitions *)
    HoldComplete[Set[f_[___], _]] | HoldComplete[SetDelayed[f_[___], _]],
    ProcessFunction[expr, metadata],

    (* Symbol definitions *)
    HoldComplete[Set[s_Symbol, _]],
    ProcessSymbol[expr, metadata],

    (* Pattern definitions *)
    HoldComplete[TagSet[_, _, _]] | HoldComplete[TagSetDelayed[_, _, _]],
    ProcessPattern[expr, metadata],

    (* Options *)
    HoldComplete[Options[f_] = opts_],
    ProcessOptions[f, opts, metadata],

    (* VerificationTest *)
    HoldComplete[VerificationTest[___]],
    ProcessTest[expr, metadata],

    (* Recurse for compound expressions *)
    HoldComplete[CompoundExpression[exprs___]],
    Scan[ScanExpressions[HoldComplete[#], metadata]&, {exprs}],

    (* Default case *)
    _, Null
  ]
]

(* Process function definitions *)
ProcessFunction[expr_, metadata_] := Module[
  {funcName, params, isDelayed, hasPattern, context},

  funcName = Extract[expr, {1, 1, 0}, HoldComplete];
  params = Extract[expr, {1, 1}, HoldComplete];
  isDelayed = MatchQ[expr, HoldComplete[SetDelayed[_, _]]];
  hasPattern = StringContainsQ[ToString[params], "_"];
  context = Context[funcName];

  AppendTo[metadata["functions"], <|
    "name" -> ToString[funcName],
    "fullName" -> ToString[funcName] <> "`" <> context,
    "parameters" -> ExtractParameters[params],
    "context" -> context,
    "isPublic" -> Not[StringEndsQ[context, "Private`"]],
    "hasPattern" -> hasPattern,
    "isDelayed" -> isDelayed
  |>]
]

(* Extract parameter information *)
ExtractParameters[HoldComplete[_[args___]]] := Map[
  Function[{param},
    <|
      "name" -> ToString[param /. {
        Pattern[n_, _] :> n,
        Optional[Pattern[n_, _], _] :> n,
        _ :> param
      }],
      "pattern" -> Switch[param,
        _Pattern, ToString[param[[2]]],
        _, "Any"
      ],
      "optional" -> MatchQ[param, _Optional],
      "sequence" -> MatchQ[param, _BlankSequence | _BlankNullSequence]
    |>
  ],
  {args}
]

(* Process symbol definitions *)
ProcessSymbol[expr_, metadata_] := Module[
  {symbolName, context},

  symbolName = Extract[expr, {1, 1}, HoldComplete];
  context = Context[symbolName];

  AppendTo[metadata["symbols"], <|
    "name" -> ToString[symbolName],
    "fullName" -> ToString[symbolName] <> "`" <> context,
    "context" -> context,
    "isConstant" -> MatchQ[symbolName, _Symbol?UpperCaseQ]
  |>]
]

(* Process pattern definitions *)
ProcessPattern[expr_, metadata_] := Module[{},
  AppendTo[metadata["patterns"], <|
    "expression" -> ToString[expr]
  |>]
]

(* Process options *)
ProcessOptions[func_, opts_, metadata_] := Module[{},
  AppendTo[metadata["options"], <|
    "function" -> ToString[func],
    "options" -> Map[
      Function[{opt},
        <|
          "name" -> ToString[opt[[1]]],
          "defaultValue" -> ToString[opt[[2]]]
        |>
      ],
      opts
    ]
  |>]
]

(* Process tests *)
ProcessTest[expr_, metadata_] := Module[{},
  AppendTo[metadata["tests"], <|
    "type" -> "VerificationTest",
    "content" -> ToString[expr]
  |>]
]

End[] (* Private *)
EndPackage[]

(* Main execution *)
If[Length[$ScriptCommandLine] >= 2,
  result = AdaptiveTestsBridge`ExtractMetadata[$ScriptCommandLine[[2]]];
  WriteString["stdout", result];
  Exit[0],
  WriteString["stderr", "Error: No file path provided"];
  Exit[1]
]