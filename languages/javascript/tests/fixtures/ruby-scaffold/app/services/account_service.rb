module Services
  class AccountService
    def initialize(repository:)
      @repository = repository
    end

    def create_account(owner:)
      return nil if owner.nil? || owner.empty?

      account_id = "acct-#{owner.downcase}"
      repository.save(account_id)
      account_id
    end

    def self.build(repository:)
      new(repository: repository)
    end

    private

    attr_reader :repository
  end
end

def calculate_monthly_accounts
  0
end
