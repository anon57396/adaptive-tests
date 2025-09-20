(* Auto-generated adaptive test for Wolfram Language *)
(* This test will survive refactoring and symbol movement *)

(* Testing in context: MathUtils` *)
Needs["MathUtils`"];

(* Package loading test *)
VerificationTest[
  Needs["MathUtils`"];
  MemberQ[$Packages, "MathUtils`"],
  True,
  TestID -> "PackageLoad-MathUtils`"
];


(* Verify discovery mechanism *)
VerificationTest[
  Names["MathUtils``*"],
  _List,
  TestID -> "Discovery-MathUtils`"
];
