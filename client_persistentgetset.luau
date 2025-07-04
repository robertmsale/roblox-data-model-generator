--DELETE
-- included upstream
local module = {}
module.EVENT = Instance.new("RemoteEvent")
module.STORAGE_OBJECT = Instance.new("ObjectValue")
type TYPE = any
--ETELED

function module.getUPPERKEY(): TYPE
    return module.STORAGE_OBJECT:GetAttribute("KEY") :: TYPE
end
function module.setUPPERKEY(toValue: TYPE)
    module.EVENT:FireServer({KEY = toValue})
end