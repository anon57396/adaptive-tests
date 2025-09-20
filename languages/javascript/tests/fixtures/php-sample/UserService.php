<?php

namespace App\Services;

class UserService
{
    public function register(array $attributes): bool
    {
        return true;
    }

    protected function normalize(array $attributes): array
    {
        return $attributes;
    }
}
