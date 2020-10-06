// KERNEL //

function Kernel () {
    this.allPartsList = [];
    
    // API for build-time
    this.InstallPart = function (name, instance) {
	this.allPartsList.push(instance);
    };
    this.InstallSchematicParts = function (schematic) {
        for (let p of schematic.parts) {
	    kernel.InstallPart (p.name, p.instance);
	}
    };
    
    // API for parts
    this.Send = function (part, pin, val) {
	kernel.pushOutputEvent(part,{'inputPin' : null, 'outputPin': pin, 'data' : val});
    };

    // API for external injection of an event
    this.Inject = function (name,inputPin,val) {
	let part = this.findTopLevelPartByName(name);
	let e = {'inputPin': inputPin, 'outputPin': null, 'data' : val}; 
	this.pushInputEvent(part,e);
	this.dispatcher();
    };

    // dispatcher API
    this.dispatcher = function () {
	while(this.anyPartIsReady()) {
	    for (let part of this.allPartsList) {
		if (part.isReady()) {
		    let ev = kernel.popEventFromInputQueue(part);
		    part.reactorFunction(ev);
		    kernel.distributeOutputEvents(part);
		}
	    }
	}
    };

    this.anyPartIsReady = function () {
	for (let part of this.allPartsList) {
	    if (part.isReady()) {
		return true;
	    }
	}
	return false;
    };
    
    this.distributeOutputEvents = function (part) {
	for (let e of part.outputQueue) {
	    kernel.distributeSingleOutput(part,e);
	};
	kernel.resetOutputQueue(part);
    };
    
    this.distributeSingleOutput = function (part,e) {
	let parent = part.parent;
	if (null === parent) {
	    console.log(part.name + " outputs " + e.data.toString() + " (" + typeof(e.data) + ") " + " on pin " + e.outputPin);
	} else {
	    let wire = this.findWireBySenderPartPin ( parent.wires, part.name, e.outputPin );
	    this.distributeEvent_DRY(parent,wire,part,e);
	}
    };
    
    this.distributeSchematicInput = function(schem, e) {
 	let wire = this.findWireBySenderPartPin ( schem.wires, schem.name, e.inputPin );
	this.distributeEvent_DRY (schem, wire, schem, e)
    };

    // DRY (Don't Repeat Yourself) code abstraction
    this.distributeEvent_DRY = function (schematic, wire, part, e) {
	for (let receiver of wire.receivers) {
	    let remappedEvent = {'inputPin' : receiver.inputPin, 'outputPin' : receiver.outputPin, 'data' : e.data};
	    let name = receiver.name;
	    let receiverPart = this.findPartInContext(schematic,name);
	    if (remappedEvent.inputPin !== null) {
		this.pushInputEvent(receiverPart,remappedEvent);
	    } else if (remappedEvent.outputPin != null) {
		this.pushOutputEvent(receiverPart,remappedEvent);
	    }
	}
    };

    this.findPartInContext = function (schematic, name) {
	for (let p of schematic.parts) {
	    if (p.name === name) {
		return p.instance;
	    }
	}
    };
    
    this.popEventFromInputQueue = function (part) {
	return part.inputQueue.pop();
    };
    
    this.pushInputEvent = function (part,e) {
	part.inputQueue.push(e);
    };
    
    this.pushOutputEvent = function (part,e) {
	part.outputQueue.push(e);
    };
    
    this.findWireBySenderPartPin = function ( wires, name, pinName ) {
	for (let wire of wires) {
	    let sender = wire.sender;
	    if (sender.name === name && this.pinMatch (pinName, sender.inputPin)) {
		return wire;
	    } else if (sender.name === name && this.pinMatch (pinName, sender.outputPin)) {
		return wire;
	    }
	}
	throw "internal error in findWireBySendPartPin";
    };
    
    this.findReceiverObjectForPartInWire = function (name, wire) {
	let receiverList = wire.receivers;
	for (let receiverObject of receiverList) {
	    if (receiverObject.name && (name === receiverObject.name)) {
		return receiverObject;
	    }
	}
	console.log(wire);
	throw "internal error: receiver in findReceiverObjectForPartInWire: "  + name + " wire=" + wire.toString();
    };
    
    this.pinMatch = function (name, pinName) {
	if (pinName && (name === pinName)) {
	    return true;
	} else {
	    return false;
	}
    };

    this.findTopLevelPartByName = function (name) {
	for (let part of this.allPartsList) {
	    if (part.name && name === part.name) {
		return part;
	    }
	}
	throw "internal error: part " + name + " not found in this.allPartsList"; 
    };

    this.isEmptyInputQueue = function (part) {
	return (0 === part.inputQueue.length);
    };
    
    this.resetOutputQueue = function (part) {
	part.outputQueue = [];
    };
};
    
function _schematicInputReactor (e) {
    kernel.distributeSchematicInput(this,e);
}
