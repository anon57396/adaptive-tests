(* DataAnalysis Module - Wolfram Language Module File *)
(* Demonstrates pattern-based programming and symbolic computation *)

(* Standalone functions without package wrapper *)

(* Statistical functions with pattern matching *)
Mean[data_List] := Total[data]/Length[data]

Variance[data_List] := Module[{mean = Mean[data]},
  Mean[(data - mean)^2]
]

StandardDeviation[data_List] := Sqrt[Variance[data]]

(* Pattern-based data transformation *)
Normalize[data_List] := Module[{mean, sd},
  mean = Mean[data];
  sd = StandardDeviation[data];
  (data - mean)/sd
]

(* Compiled function for performance *)
fastSum = Compile[{{x, _Real, 1}},
  Module[{sum = 0.0},
    Do[sum += x[[i]], {i, Length[x]}];
    sum
  ]
]

(* Rule-based transformations *)
dataRules = {
  Missing[] -> 0,
  Null -> 0,
  Indeterminate -> Mean[#] &
}

CleanData[data_List] := data /. dataRules

(* Conditional pattern definitions *)
Outliers[data_List, z_: 3] := Module[{mean, sd},
  mean = Mean[data];
  sd = StandardDeviation[data];
  Select[data, Abs[# - mean] > z * sd &]
]

(* Function with multiple definitions based on arguments *)
Process[data_List, "normalize"] := Normalize[data]
Process[data_List, "clean"] := CleanData[data]
Process[data_List, "outliers"] := Outliers[data]
Process[data_List, method_String] := Missing["UnknownMethod", method]

(* Symbol definitions *)
DataVersion = "1.0.0"
MaxDataPoints = 10000
DefaultMethod = "normalize"

(* Pattern with condition *)
ValidateData[data_List /; Length[data] > 0] := True
ValidateData[_] := False

(* Pure function assignment *)
QuickStats = Function[{data},
  <|
    "Mean" -> Mean[data],
    "Variance" -> Variance[data],
    "StandardDeviation" -> StandardDeviation[data],
    "Min" -> Min[data],
    "Max" -> Max[data]
  |>
]

(* VerificationTest examples for testing *)
RunTests[] := Module[{testData = {1, 2, 3, 4, 5}},
  {
    VerificationTest[
      Mean[testData],
      3.0,
      TestID -> "Mean-Test"
    ],
    VerificationTest[
      ValidateData[testData],
      True,
      TestID -> "Validation-Test"
    ],
    VerificationTest[
      Process[testData, "normalize"],
      _List,
      TestID -> "Process-Normalize"
    ]
  }
]