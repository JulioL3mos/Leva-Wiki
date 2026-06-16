# Portal LEVA — Makefile de Testes

.PHONY: test-backend test-frontend test-all install-backend install-frontend

## Roda todos os testes de backend (pytest contra o servidor em execução)
test-backend:
	cd backend && python -m pytest tests/ -v --tb=short

## Roda os testes de backend com relatório de cobertura
test-backend-cov:
	cd backend && python -m pytest tests/ -v --tb=short --cov=. --cov-report=term-missing

## Roda os testes de frontend (React Testing Library)
test-frontend:
	cd frontend && yarn test --watchAll=false --passWithNoTests

## Roda todos os testes
test-all: test-backend test-frontend

## Instala dependências do backend
install-backend:
	cd backend && pip install -r requirements.txt

## Instala dependências do frontend
install-frontend:
	cd frontend && yarn install
