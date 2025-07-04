# Roblox Data Model Generator

This tool let's you generate strongly typed data models for the server and client where the concerns about how data is handled by the server is not replicated to the clients. It generates modules with getters, setters, data validation, and computed properties. If the model is client or server only, it generates an extremely lightweight priority-based observable with optional cancellation. If it crosses the client-server boundary, each model attaches an instance to the player where the data is accessed as attributes (allowing for observability of attribute changes), and a remote event is generated in ReplicatedStorage so the server can receive update requests, perform validation, and persist data.

## Why?

This generator gets rid of the boilerplate of managing dynamic types. When you have remote events or attributes, extra effort is required to ensure the attribute is of a specific type, or when firing an event and receiving the arguments you may experience runtime errors if you accidentally treat a string as a number. With this generator, all of the boilerplate is handled and you are left with a clean, explicitly typed interface. It also generates the required and optional type definition as well as some code for what parallel data storage might look like.

## Usage

1. In your Rojo project, add this generator as a Git submodule
2. Install Deno using system package manager
3. Create a data store in Typescript that you will pass into the generator. For example:
```ts
// /stores.ts
import {Data} from "./submodule/types.ts"
export default {
    playerData: {
        store: "PlayerDataModel",
        type: "Immediate", // Immediately persist changes to datastore (at your discretion!)
        model: {
            neverShowWelcomeAgain: {
                type: "boolean",
                default: "false",
                description: "Makes welcome message disappear forever"
            },
            level1Completed: {
                type: "boolean",
                default: "false",
                description: "Did user complete level 1"
            }
        }
    },
    playerState: {
        store: "PlayerStateModel",
        type: "ClientOnly", // Lightweight, observable, ephemeral data store
        model: {
            playerCanMove: {
                type: "boolean",
                default: "false",
                description: "Allows player movement"
            },
            playerCanUseCamera: {
                type: "boolean",
                default: "false",
                description: "Allows player camera movement"
            },
            playerCanJump: {
                type: "boolean",
                default: "false",
                description: "Allows player jump"
            },
            playerInteractionEnabled: { // Computed property! 
                type: "boolean",
                description: "",
                computed: { // All getters will be formatted "module.get[A-Z][\w]?()"
                    get: "return module.getPlayerCanMove() or module.getPlayerCanUseCamera() or module.getPlayerCanJump()",
                    set: {
                        params: ["toValue: boolean"],
                        logic: [
                            "module.setPlayerCanMove(toValue)",
                            "module.setPlayerCanUseCamera(toValue)",
                            "module.setPlayerCanJump(toValue)",
                        ]
                    }
                }
            }
        }
    }
} as {[key: string]: Data} // Add this for autocomplete
```
4. Add a shell script to the root of the project for easy iteration:
```sh
# generate.sh
pushd submodule || exit 
deno run -R -W generate.ts "../src/server/models/" "../src/client/models/" "./stores.ts"
popd
```
5. `chmod 755 generate.sh` and `./generate.sh`
6. Inside your model folders you'll have your interfaces!

## How?

I put this together inside a Roblox project with Rojo and Luau-LSP already configured. If you look inside the template code there are sections that are automatically removed during compilation, but they're included to ease development. Here's an example of what a compiled `client.models.PlayerState` looks like:
```luau
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- Types & Keys :)
export type Data = {
    playerCanMove: boolean,
    playerCanUseCamera: boolean,
    playerCanJump: boolean,
    playerUserInputType: number,
    cameraLockedCFrame: CFrame
}

export type OptionalData = {
    playerCanMove: boolean?,
    playerCanUseCamera: boolean?,
    playerCanJump: boolean?,
    playerUserInputType: number?,
    cameraLockedCFrame: CFrame?
}

export type Keys = "playerCanMove" | "playerCanUseCamera" | "playerCanJump" | "playerUserInputType" | "cameraLockedCFrame"

-- Default object
local default = {
    playerCanMove = false,
    playerCanUseCamera = false,
    playerCanJump = false,
    playerUserInputType = 0,
    cameraLockedCFrame = CFrame.new()
}

local module = {}

local HttpService = game:GetService("HttpService")
local data = default

-- lightweight, identifiable observers
local setPlayerCanMoveHandlers: {{id: string, priority: number, handler: (boolean) -> boolean?}} = {}
function module.getPlayerCanMove(): boolean
    return data.playerCanMove :: boolean
end
-- Setter that also executes the oberver handlers
function module.setPlayerCanMove(toValue: boolean)
    if data.playerCanMove == toValue then return end
    data.playerCanMove = toValue
    for i=1, #setPlayerCanMoveHandlers do
        local dontContinue = setPlayerCanMoveHandlers[i].handler(toValue)
        if dontContinue then return end
    end
end
-- Basic subscription that becomes identifiable and returns the identifier
function module.subscribeToPlayerCanMove(handler: (boolean) -> boolean?, priority: number?): string
    local id = HttpService:GenerateGUID(false)
    table.insert(setPlayerCanMoveHandlers, {id = id, priority = priority or 1, handler = handler})
    table.sort(setPlayerCanMoveHandlers, function(a,b) return a.priority > b.priority end)
    return id
end
-- Unsubscribe using subscription identity
function module.unsubscribeFromPlayerCanMove(id: string)
    for i=1, #setPlayerCanMoveHandlers do
        if setPlayerCanMoveHandlers[i].id == id then
            table.remove(setPlayerCanMoveHandlers, i)
            return
        end
    end
end

local setPlayerCanUseCameraHandlers: {{id: string, priority: number, handler: (boolean) -> boolean?}} = {}
function module.getPlayerCanUseCamera(): boolean --[[SNIP]] end
function module.setPlayerCanUseCamera(toValue: boolean) --[[SNIP]] end
function module.subscribeToPlayerCanUseCamera(handler: (boolean) -> boolean?, priority: number?): string --[[SNIP]] end
function module.unsubscribeFromPlayerCanUseCamera(id: string) --[[SNIP]] end

local setPlayerCanJumpHandlers: {{id: string, priority: number, handler: (boolean) -> boolean?}} = {}
function module.getPlayerCanJump(): boolean --[[SNIP]] end
function module.setPlayerCanJump(toValue: boolean) --[[SNIP]] end
function module.subscribeToPlayerCanJump(handler: (boolean) -> boolean?, priority: number?): string --[[SNIP]] end
function module.unsubscribeFromPlayerCanJump(id: string) --[[SNIP]] end

-- Computed Property!
function module.getPlayerInteractionEnabled(): boolean
    return module.getPlayerCanMove() or module.getPlayerCanUseCamera() or module.getPlayerCanJump()
end

function module.setPlayerInteractionEnabled(toValue: boolean)
    module.setPlayerCanMove(toValue)
    module.setPlayerCanUseCamera(toValue)
    module.setPlayerCanJump(toValue)
end

return module
```

This strikes a balance between efficiency and ergonomics. When your data is designed to be persistent or ephemeral, a single ObjectValue pointing to the RemoteEvent is created and attached to the player. Since it's part of the game's DataModel, the server is in charge of validation and persistence, anybody can see the data through the Players service. Setting the data is requested by the client, and the action is handled by the server. If your data is on either side of the client-server boundary, rather than dealing with Instances taking up extra memory and overhead, you get the lightweight interface.

```ts
// Example validator
playerUserInputType: {
    type: "number",
    default: "0",
    description: "0 = Touch, 1 = Gamepad, 2 = KBM",
    validator: [
        "if toValue < 0 or toValue > 2 then return end"
    ]
}
```
This injects a validator into the beginning of the setter. If the model is client or server only it's handled locally, but if it crosses the boundary then it gets injected into the server.

```luau
-- Example validator output
function module.setPlayerUserInputType(toValue: number)
    if toValue < 0 or toValue > 2 then return end
    if data.playerUserInputType == toValue then return end
    data.playerUserInputType = toValue
    for i=1, #setPlayerUserInputTypeHandlers do
        local dontContinue = setPlayerUserInputTypeHandlers[i].handler(toValue)
        if dontContinue then return end
    end
end
```

If you are writing computed properties or validators, it's important to use `toValue` for validators to reference the input parameter, and to use the getter for the property if you want to compute a property. Setters for computed properties are optional and if you set stored properties from a computed property you want to use their setter so it executes the observers.

## Note

For non-persistent data stores, any type may be used including tables. For persistent data stores, since it is based on Instance attributes there is a restriction that each property must be a valid attribute type.