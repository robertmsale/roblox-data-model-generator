--DELETE
-- included upstream
local module = {}
module.STORAGE_OBJECT = Instance.new("ObjectValue")
module.EVENT = Instance.new("RemoteEvent")
module.STORAGE_OBJECT = Instance.new("ObjectValue")
local data = {KEY = ""}
type TYPE = any
local KEY = ""
local HttpService = game:GetService("HttpService")

-- MATCHES: "UPPERKEY" "KEY" "TYPE"
--ETELED

local setUPPERKEYHandlers: {{id: string, priority: number, handler: (TYPE) -> boolean?}} = {}
function module.getUPPERKEY(): TYPE
    return data.KEY :: TYPE
end
function module.setUPPERKEY(toValue: TYPE)
--VALIDATOR
    if data.KEY == toValue then return end
    data.KEY = toValue
    for i=1, #setUPPERKEYHandlers do
        local dontContinue = setUPPERKEYHandlers[i].handler(toValue)
        if dontContinue then return end
    end
end
function module.subscribeToUPPERKEY(handler: (TYPE) -> boolean?, priority: number?): string
    local id = HttpService:GenerateGUID(false)
    table.insert(setUPPERKEYHandlers, {id = id, priority = priority or 1, handler = handler})
    table.sort(setUPPERKEYHandlers, function(a,b) return a.priority > b.priority end)
    return id
end
function module.unsubscribeFromUPPERKEY(id: string)
    for i=1, #setUPPERKEYHandlers do
        if setUPPERKEYHandlers[i].id == id then
            table.remove(setUPPERKEYHandlers, i)
            return
        end
    end
end