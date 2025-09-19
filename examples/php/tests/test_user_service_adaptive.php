<?php

use PHPUnit\Framework\TestCase;
use Adaptive\Discovery\DiscoveryEngine;
use Adaptive\Discovery\Signature;

class UserServiceAdaptiveTest extends TestCase
{
    private $userService;

    protected function setUp(): void
    {
        $engine = new DiscoveryEngine(__DIR__ . '/..');

        // Discover UserService class using signature
        $serviceClass = $engine->discover(new Signature([
            'name' => 'UserService',
            'methods' => ['createUser', 'updateUser', 'deleteUser', 'findUser'],
            'type' => 'class'
        ]));

        $this->userService = new $serviceClass();
    }

    public function testCreateUser()
    {
        $user = $this->userService->createUser([
            'name' => 'John Doe',
            'email' => 'john@example.com'
        ]);

        $this->assertNotNull($user);
        $this->assertEquals('John Doe', $user['name']);
        $this->assertEquals('john@example.com', $user['email']);
    }

    public function testUpdateUser()
    {
        $user = $this->userService->createUser([
            'name' => 'Jane Doe',
            'email' => 'jane@example.com'
        ]);

        $updatedUser = $this->userService->updateUser($user['id'], [
            'name' => 'Jane Smith'
        ]);

        $this->assertEquals('Jane Smith', $updatedUser['name']);
        $this->assertEquals('jane@example.com', $updatedUser['email']);
    }

    public function testFindUser()
    {
        $user = $this->userService->createUser([
            'name' => 'Test User',
            'email' => 'test@example.com'
        ]);

        $foundUser = $this->userService->findUser($user['id']);
        $this->assertEquals($user['id'], $foundUser['id']);
    }

    public function testDeleteUser()
    {
        $user = $this->userService->createUser([
            'name' => 'Temp User',
            'email' => 'temp@example.com'
        ]);

        $result = $this->userService->deleteUser($user['id']);
        $this->assertTrue($result);

        $foundUser = $this->userService->findUser($user['id']);
        $this->assertNull($foundUser);
    }
}