jq '
    if .name != "@thingblock/thingblock-gui-standalone" then
        .name = "@thingblock/thingblock-gui-standalone" |
        del(.peerDependencies) |
        .exports."." = .exports."./standalone" |
        del(.exports."./standalone")
    else
        .
    end
' ./packages/thingblock-gui/package.json | npx sponge ./packages/thingblock-gui/package.json