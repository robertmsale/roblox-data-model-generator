--DELETE
-- included by server_persistent/server_shared
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local module = {}
local default = {}
function module.getStorageObject(forPlayer: Player) return Instance.new("Part") end
type Data = {[string]: any}
type OptionalData = {[string]: any?}
local StorageEvents = Instance.new("Folder")
local store = ""
-- included by server_persistent
module.EVENT = Instance.new("RemoteEvent")
--ETELED

--INCLUDE:./server_persistent.luau

-- module.EVENT.OnServerEvent:Connect(function(player: Player, data: OptionalData)
--     local payload = {}
--     local playerStore = module.getStorageObject(player)
    
--     for key in default do
--         if data[key] == nil then
--             payload[key] = default[key]
--             continue
--         end
--         payload[key] = data[key]
        
--         playerStore:SetAttribute(key, data[key])
--     end
-- end)
module.EVENT.Parent = StorageEvents