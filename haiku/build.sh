pkgman install nodejs20 npm || exit 1

cd ../server || exit 1

rm -rf \
	out \
	node_modules \
	package-lock.json

npm install || exit 1
npm install \
	typescript \
	vscode-uri \
	proper-lockfile \
	chevrotain@10.5.0 \
	|| exit 1
npm install --save-dev \
	@types/node \
	@types/vscode \
	@types/proper-lockfile \
	@types/minimatch \
	|| exit 1

npm install crc-32 || exit 1

npm run compile || exit 1
npm run copy-assets || exit 1

echo "*** Done ***"
