#!/bin/bash

# Validation script for Java adaptive tests
# Compiles and runs the Java validation

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo -e "${CYAN}Compiling Java validation script...${RESET}"

# Compile the Java validation script
javac scripts/demo/ValidateJava.java

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to compile Java validation script${RESET}"
    exit 1
fi

echo -e "${GREEN}✓ Compilation successful${RESET}"

# Run the validation
echo -e "${CYAN}Running Java validation...${RESET}"
java -cp scripts/demo ValidateJava

# Clean up compiled files
rm -f scripts/demo/ValidateJava.class

exit $?