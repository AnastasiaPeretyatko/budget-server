app: 
	yarn start:dev

migrate-generate:
	yarn migration:generate ./db/migrations/$(name)

migrate-up: 
	yarn migration:up

migrate-down:
	migration:down