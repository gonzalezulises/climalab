.DEFAULT_GOAL := help

.PHONY: check
check: ## Full verification pipeline — must exit 0 before every commit
	npm ci --no-audit --no-fund
	npx tsc --noEmit
	npm test
	NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run build

.PHONY: verify-claims
verify-claims: ## Re-run every feature this repo claims is passing (none in lite). CI runs this too.
	bash scripts/verify-claims.sh

.PHONY: verify-decisions
verify-decisions: ## Confirm no earlier decision was rewritten. CI runs this too.
	bash scripts/verify-decisions.sh

.PHONY: help
help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'
