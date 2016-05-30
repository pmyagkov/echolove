#!/bin/sh

rm -rf extension/static extension/static.zip;
cd extension && gulp;
cd -;
zip -r extension/static.zip extension/static;
