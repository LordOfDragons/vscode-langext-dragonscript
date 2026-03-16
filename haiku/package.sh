rm -rf build
PACKAGEDIR=$( realpath -m build/collect )
SYSTEMPATH="add-ons/Language Server Providers/DragonScript"
SERVERDIR="$PACKAGEDIR/$SYSTEMPATH"
GENIODIR="$PACKAGEDIR/data/Genio"
VERSION="1.0"
REVISION="1"

cd ../server || exit 1
npm install @vercel/ncc || exit 1

mkdir -p "$SERVERDIR"/server || exit 1
npx @vercel/ncc build out/server.js -e @node-rs/crc32 -o "$SERVERDIR"/server || exit 1
mv "$SERVERDIR"/server/index.js "$SERVERDIR"/server/server.js || exit 1
mkdir -p "$SERVERDIR"/server/node_modules || exit 1
cp -a node_modules/crc-32 "$SERVERDIR"/server/node_modules || exit 1

cp -a out/data "$SERVERDIR"/server || exit 1

cd ../haiku || exit 1
cp haiku-server.js "$SERVERDIR"/server || exit 1

mkdir -p "$GENIODIR" || exit 1
cp -a Genio/* "$GENIODIR" || exit 1
sed -i -e "s@%INSTALLDIR%@/boot/system/$SYSTEMPATH/server@g" "$GENIODIR"/lspServerConfigs/dragonscript.yaml || exit 1

cp packageinfo "$PACKAGEDIR"/.PackageInfo || exit 1
sed -i -e "s/%VERSION%/$VERSION/g" "$PACKAGEDIR"/.PackageInfo || exit 1
sed -i -e "s/%REVISION%/$REVISION/g" "$PACKAGEDIR"/.PackageInfo || exit 1

package create -q -C "$PACKAGEDIR" build/LSPDragonScript.hpkg || exit 1

echo "*** Packaging Done ***"
