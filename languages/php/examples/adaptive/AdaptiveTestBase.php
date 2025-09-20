<?php

namespace Adaptive\Testing;

use PHPUnit\Framework\TestCase;

/**
 * Base class for creating adaptive tests in PHP
 * Provides discovery engine integration and helper methods
 */
abstract class AdaptiveTestBase extends TestCase
{
    protected $discoveryEngine;
    protected $target;

    /**
     * Define the signature of the target to discover
     * @return array Signature configuration
     */
    abstract protected function getTargetSignature(): array;

    /**
     * Setup discovery engine and discover the target
     */
    protected function setUp(): void
    {
        parent::setUp();

        // Initialize discovery engine
        $this->discoveryEngine = new DiscoveryEngine($this->getSearchPath());

        // Discover the target
        $signature = new Signature($this->getTargetSignature());
        $targetClass = $this->discoveryEngine->discover($signature);

        if (!$targetClass) {
            $this->fail('Could not discover target matching signature: ' . json_encode($this->getTargetSignature()));
        }

        // Create instance if it's a class
        if (class_exists($targetClass)) {
            $this->target = new $targetClass();
        } else {
            $this->target = $targetClass;
        }
    }

    /**
     * Get the search path for discovery
     * Override this method to customize search location
     */
    protected function getSearchPath(): string
    {
        return dirname(__DIR__);
    }

    /**
     * Helper to assert method exists on target
     */
    protected function assertMethodExists(string $method): void
    {
        $this->assertTrue(
            method_exists($this->target, $method),
            "Method '$method' does not exist on discovered target"
        );
    }

    /**
     * Helper to assert multiple methods exist
     */
    protected function assertMethodsExist(array $methods): void
    {
        foreach ($methods as $method) {
            $this->assertMethodExists($method);
        }
    }

    /**
     * Helper to get the discovered target
     */
    protected function getTarget()
    {
        return $this->target;
    }

    /**
     * Helper to validate discovered target structure
     */
    protected function validateTargetStructure(): void
    {
        $signature = $this->getTargetSignature();

        if (isset($signature['methods'])) {
            $this->assertMethodsExist($signature['methods']);
        }

        if (isset($signature['properties'])) {
            foreach ($signature['properties'] as $property) {
                $this->assertTrue(
                    property_exists($this->target, $property),
                    "Property '$property' does not exist on discovered target"
                );
            }
        }
    }
}

/**
 * Discovery Engine for PHP
 * Discovers classes and functions based on signatures
 */
class DiscoveryEngine
{
    private $searchPath;

    public function __construct(string $searchPath)
    {
        $this->searchPath = $searchPath;
    }

    /**
     * Discover a target matching the given signature
     */
    public function discover(Signature $signature)
    {
        $name = $signature->getName();
        $methods = $signature->getMethods();

        // Search for PHP files
        $files = $this->findPhpFiles($this->searchPath);

        foreach ($files as $file) {
            require_once $file;
        }

        // Find matching class
        $classes = get_declared_classes();
        foreach ($classes as $class) {
            if ($this->matchesSignature($class, $signature)) {
                return $class;
            }
        }

        return null;
    }

    /**
     * Check if a class matches the signature
     */
    private function matchesSignature(string $class, Signature $signature): bool
    {
        $reflection = new \ReflectionClass($class);
        $className = $reflection->getShortName();

        // Check name match
        if ($signature->getName() && stripos($className, $signature->getName()) === false) {
            return false;
        }

        // Check methods match
        $methods = $signature->getMethods();
        if ($methods) {
            foreach ($methods as $method) {
                if (!$reflection->hasMethod($method)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Find all PHP files in the search path
     */
    private function findPhpFiles(string $path): array
    {
        $files = [];
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path)
        );

        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'php') {
                $files[] = $file->getPathname();
            }
        }

        return $files;
    }
}

/**
 * Signature class for defining discovery targets
 */
class Signature
{
    private $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function getName(): ?string
    {
        return $this->config['name'] ?? null;
    }

    public function getMethods(): ?array
    {
        return $this->config['methods'] ?? null;
    }

    public function getType(): ?string
    {
        return $this->config['type'] ?? 'class';
    }

    public function getProperties(): ?array
    {
        return $this->config['properties'] ?? null;
    }
}