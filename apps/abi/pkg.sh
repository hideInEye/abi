#!/bin/bash

rm -rf dist;

rm dist.tar.gz;

pnpm build;

tar -zcvf dist.tar.gz dist

scp dist.tar.gz root@8.141.13.156:/tmp;

ssh root@8.141.13.156;
