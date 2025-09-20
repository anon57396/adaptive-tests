(* MathUtils Package - Sample Wolfram Language Package *)
(* Demonstrates adaptive test discovery for Wolfram packages *)

BeginPackage["MathUtils`", {"System`"}]

(* Public exports *)
Factorial2::usage = "Factorial2[n] computes n!! (double factorial)"
PrimeQ2::usage = "PrimeQ2[n] alternative prime checking implementation"
Fibonacci::usage = "Fibonacci[n] computes the nth Fibonacci number with memoization"
GCD2::usage = "GCD2[a, b] computes greatest common divisor"
IsPerfect::usage = "IsPerfect[n] checks if n is a perfect number"

Begin["`Private`"]

(* Private helper function *)
sumDivisors[n_Integer] := Total[Divisors[n]] - n

(* Public function implementations *)

(* Double factorial with pattern matching *)
Factorial2[0] = 1
Factorial2[1] = 1
Factorial2[n_Integer?Positive] := n * Factorial2[n - 2]
Factorial2[n_Integer?Negative] := "Undefined for negative numbers"

(* Alternative prime checker with conditional patterns *)
PrimeQ2[n_Integer /; n < 2] := False
PrimeQ2[2] = True
PrimeQ2[n_Integer?EvenQ] := False
PrimeQ2[n_Integer?OddQ] := Module[{i = 3},
  While[i * i <= n,
    If[Mod[n, i] == 0, Return[False]];
    i += 2
  ];
  True
]

(* Fibonacci with memoization *)
Fibonacci[0] = 0
Fibonacci[1] = 1
Fibonacci[n_Integer?Positive] := Fibonacci[n] = Fibonacci[n - 1] + Fibonacci[n - 2]

(* Greatest common divisor using Euclidean algorithm *)
GCD2[a_Integer, 0] := Abs[a]
GCD2[0, b_Integer] := Abs[b]
GCD2[a_Integer, b_Integer] := GCD2[b, Mod[a, b]]

(* Perfect number checker *)
IsPerfect[n_Integer?Positive] := sumDivisors[n] == n
IsPerfect[_] := False

(* Options for advanced functions *)
Options[AdvancedCompute] = {Method -> "Fast", Precision -> MachinePrecision}

AdvancedCompute[data_List, opts___] := Module[{method, precision},
  {method, precision} = {Method, Precision} /. {opts} /. Options[AdvancedCompute];
  (* Implementation would go here *)
  {method, precision, Length[data]}
]

End[] (* End Private *)

EndPackage[]