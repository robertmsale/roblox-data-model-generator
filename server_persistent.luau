--DELETE
-- included by server_shared
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local module = {}
function module.getStorageObject(forPlayer: Player) return ({} :: unknown) :: ObjectValue end
local store = ""
local default = {} :: {[string]: any}
--ETELED

--INCLUDE:./server_shared.luau

-- local PDSActor = game:GetService("ServerScriptService"):WaitForChild("ParallelDataStoreActor") :: Actor

module.STORE = store

module.EVENT = Instance.new("RemoteEvent") :: RemoteEvent
module.EVENT.Name = store .. "Event"

local Players = game:GetService("Players")
local StorageEvents = ReplicatedStorage:FindFirstChild("StorageEvents") :: Folder
if StorageEvents == nil then
    StorageEvents = Instance.new("Folder")
    StorageEvents.Name = "StorageEvents"
    StorageEvents.Parent = ReplicatedStorage
end

module.EVENT.Parent = StorageEvents

Players.PlayerAdded:Connect(function(player: Player)
    if player:FindFirstChild(store .. "Storage") ~= nil then return end
    local obj = Instance.new("ObjectValue")
    obj.Name = store .. "Storage"
    obj.Parent = player
    obj.Value = module.EVENT
    local DS = game:GetService("DataStoreService"):GetDataStore(store)
    local existing = nil
    local requiresMigration = false
    while existing == nil do
        if game:GetService("DataStoreService"):GetRequestBudgetForRequestType(Enum.DataStoreRequestType.GetAsync) == 0 then
            task.wait(0.1)
            continue
        end
        local success, data = pcall(function() return DS:GetAsync(player.UserId) end)
        if not success then
            task.wait(0.1)
            continue
        end
        existing = {}
        for key in default do
            if data[key] == nil then
                requiresMigration = true
                existing[key] = default[key]
                continue
            end
            existing[key] = data[key]
        end
        if not requiresMigration then break end
        while requiresMigration do
            if game:GetService("DataStoreService"):GetRequestBudgetForRequestType(Enum.DataStoreRequestType.SetIncrementAsync) == 0 then
                task.wait(0.1)
                continue
            end
            local success, errmsg = pcall(function() DS:SetAsync(player.UserId, existing) end)
            if not success then
                task.wait(0.1)
                continue
            end
            requiresMigration = false
            break
        end
    end
    for k in existing do
        obj:SetAttribute(k, existing[k])
    end
end)

--GETSET