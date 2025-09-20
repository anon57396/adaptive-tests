package services

type AccountRepository interface {
    Save(id string) error
}

type AccountService struct {
    repo AccountRepository
}

func newAccountService(repo AccountRepository) *AccountService {
    return &AccountService{repo: repo}
}

func (s *AccountService) CreateAccount(owner string) (string, error) {
    if owner == "" {
        return "", nil
    }
    accountID := "acct-123"
    return accountID, s.repo.Save(accountID)
}

func CalculateMonthlyAccounts() int {
    return 0
}
