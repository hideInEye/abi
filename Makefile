.PHONY: dev build docker-build docker-tag deploy

IMAGE_NAME ?= abi-web
TAG ?= latest

dev:
	pnpm dev

build:
	pnpm build

docker-build:
	docker build -f dockerfile -t $(IMAGE_NAME) .

docker-tag:
	docker tag $(IMAGE_NAME) $(IMAGE_NAME):$(TAG)

deploy: build docker-build docker-tag
