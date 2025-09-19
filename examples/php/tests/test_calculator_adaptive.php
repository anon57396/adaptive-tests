<?php

require_once __DIR__ . '/../adaptive/AdaptiveTestBase.php';

use Adaptive\Testing\AdaptiveTestBase;

class CalculatorAdaptiveTest extends AdaptiveTestBase
{
    protected function getTargetSignature(): array
    {
        return [
            'name' => 'Calculator',
            'methods' => ['add', 'subtract', 'multiply', 'divide'],
            'type' => 'class'
        ];
    }

    public function testDiscoveryValidation()
    {
        $this->validateTargetStructure();
    }

    public function testAddition()
    {
        $calculator = $this->getTarget();
        $this->assertEquals(5, $calculator->add(2, 3));
        $this->assertEquals(0, $calculator->add(-5, 5));
    }

    public function testSubtraction()
    {
        $calculator = $this->getTarget();
        $this->assertEquals(2, $calculator->subtract(5, 3));
        $this->assertEquals(-10, $calculator->subtract(5, 15));
    }

    public function testMultiplication()
    {
        $calculator = $this->getTarget();
        $this->assertEquals(15, $calculator->multiply(3, 5));
        $this->assertEquals(0, $calculator->multiply(100, 0));
    }

    public function testDivision()
    {
        $calculator = $this->getTarget();
        $this->assertEquals(4, $calculator->divide(12, 3));
        $this->assertEquals(2.5, $calculator->divide(5, 2));
    }

    public function testDivisionByZero()
    {
        $calculator = $this->getTarget();
        $this->expectException(\InvalidArgumentException::class);
        $calculator->divide(10, 0);
    }
}