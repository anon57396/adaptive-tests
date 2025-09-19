<?php

namespace Examples\Services;

/**
 * Interface for user repository
 */
interface UserRepositoryInterface
{
    public function find($id);
    public function findByEmail($email);
    public function save(User $user);
    public function delete($id);
}

/**
 * Trait for logging functionality
 */
trait LoggableTrait
{
    protected $logs = [];

    public function log($message)
    {
        $this->logs[] = [
            'timestamp' => date('Y-m-d H:i:s'),
            'message' => $message
        ];
    }

    public function getLogs()
    {
        return $this->logs;
    }
}

/**
 * User entity class
 */
class User
{
    public $id;
    public $name;
    public $email;
    public $createdAt;

    public function __construct($name, $email)
    {
        $this->name = $name;
        $this->email = $email;
        $this->createdAt = new \DateTime();
    }
}

/**
 * User service class demonstrating various PHP features
 */
class UserService implements UserRepositoryInterface
{
    use LoggableTrait;

    private $users = [];
    private $nextId = 1;

    /**
     * Find a user by ID
     *
     * @param int $id
     * @return User|null
     */
    public function find($id)
    {
        $this->log("Finding user with ID: $id");
        return isset($this->users[$id]) ? $this->users[$id] : null;
    }

    /**
     * Find a user by email
     *
     * @param string $email
     * @return User|null
     */
    public function findByEmail($email)
    {
        $this->log("Finding user with email: $email");
        foreach ($this->users as $user) {
            if ($user->email === $email) {
                return $user;
            }
        }
        return null;
    }

    /**
     * Save a user
     *
     * @param User $user
     * @return User
     */
    public function save(User $user)
    {
        if (!$user->id) {
            $user->id = $this->nextId++;
        }
        $this->users[$user->id] = $user;
        $this->log("Saved user: {$user->name} (ID: {$user->id})");
        return $user;
    }

    /**
     * Delete a user by ID
     *
     * @param int $id
     * @return bool
     */
    public function delete($id)
    {
        if (isset($this->users[$id])) {
            unset($this->users[$id]);
            $this->log("Deleted user with ID: $id");
            return true;
        }
        return false;
    }

    /**
     * Get all users
     *
     * @return array
     */
    public function getAllUsers()
    {
        return array_values($this->users);
    }

    /**
     * Count total users
     *
     * @return int
     */
    public function countUsers()
    {
        return count($this->users);
    }
}