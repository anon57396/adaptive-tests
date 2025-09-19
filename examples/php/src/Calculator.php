<?php

namespace Examples\Calculator;

/**
 * A simple calculator class for demonstrating PHP discovery
 *
 * This class shows how adaptive-tests can discover PHP classes
 * and generate PHPUnit test scaffolds automatically.
 */
class Calculator
{
    /**
     * @var array
     */
    private $history = [];

    /**
     * Add two numbers
     *
     * @param float $a First number
     * @param float $b Second number
     * @return float The sum
     */
    public function add($a, $b)
    {
        $result = $a + $b;
        $this->history[] = "add($a, $b) = $result";
        return $result;
    }

    /**
     * Subtract two numbers
     *
     * @param float $a First number
     * @param float $b Second number
     * @return float The difference
     */
    public function subtract($a, $b)
    {
        $result = $a - $b;
        $this->history[] = "subtract($a, $b) = $result";
        return $result;
    }

    /**
     * Multiply two numbers
     *
     * @param float $a First number
     * @param float $b Second number
     * @return float The product
     */
    public function multiply($a, $b)
    {
        $result = $a * $b;
        $this->history[] = "multiply($a, $b) = $result";
        return $result;
    }

    /**
     * Divide two numbers
     *
     * @param float $a Dividend
     * @param float $b Divisor
     * @return float The quotient
     * @throws \InvalidArgumentException When dividing by zero
     */
    public function divide($a, $b)
    {
        if ($b == 0) {
            throw new \InvalidArgumentException("Cannot divide by zero");
        }
        $result = $a / $b;
        $this->history[] = "divide($a, $b) = $result";
        return $result;
    }

    /**
     * Get calculation history
     *
     * @return array
     */
    public function getHistory()
    {
        return $this->history;
    }

    /**
     * Clear calculation history
     *
     * @return void
     */
    public function clearHistory()
    {
        $this->history = [];
    }
}