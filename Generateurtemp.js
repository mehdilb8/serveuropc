

const opcua = require("node-opcua");
const dns = require('dns');
const { Console } = require("console");
const path = require('path');
const fs = require('fs');


const server = new opcua.OPCUAServer({
    port: 4840, 
    allowAnonymous: true,
    securityPolicies: [
        opcua.SecurityPolicy.None,
    ],
    securityModes: [
        opcua.MessageSecurityMode.None,
        
    ],
    defaultSecureTokenLifetime: 60000
});

server.serverCertificateManager.addIssuer(opcua.SecurityPolicy.None);

server.start(function () {
    console.log('Le serveur OPC UA est opérationnel.');

    server.on('post_initialize', function () {
        const addressSpace = server.engine.addressSpace; 
        
        if (!addressSpace || typeof addressSpace.addVariable !== 'function') {
            console.error('Failed to initialize addressSpace object.');
            
            return;
        }

        const objectsFolder = addressSpace.findNode("Objects");
        let simulationsFolder = addressSpace.findNode("Objects.Simulations");

        if (!simulationsFolder) {
            console.log('Simulations folder not found. Creating...');
            simulationsFolder = addressSpace.addObject({
                organizedBy: objectsFolder,
                browseName: "Simulations"
            });
        }

        const temperatureValue = generateTemperature();

        if (typeof temperatureValue !== 'number') {
            console.error('Failed to convert temperature to Int32. Returning default value.');
            console.log('Temperature value:', temperatureValue);
            temperatureValue = 0;
        }

        const temperature = new opcua.Variant({ dataType: opcua.DataType.Int32, value: parseFloat(temperatureValue) });

        console.log('Temperature value:', temperatureValue); 

        const temperatureNode = simulationsFolder.addVariable({ 
            browseName: 'Temperature',
            dataType: 'Int32',
            value: temperature,
        });

        addressSpace.addVariableNode(temperatureNode); 

        
        const variableToMonitor = {
            nodeId: temperatureNode.nodeId,
            attributeId: opcua.AttributeIds.Value
        };

        const monitoredItem = server.engine.createMonitoredItem({
            nodeId: variableToMonitor.nodeId,
            attributeId: variableToMonitor.attributeId,
            clientHandle: 1,
            samplingInterval: 1000,
            discardOldest: true,
            queueSize: 10
        });

        monitoredItem.on("changed", function (dataValue) {
            console.log("Temperature value changed:", dataValue.value.value);
            
            sendValueToProsysMonitor(dataValue.value.value);
        });

        server.engine.createSubscription({
            requestedPublishingInterval: 1000,
            requestedLifetimeCount: 100,
            requestedMaxKeepAliveCount: 10,
            maxNotificationsPerPublish: 100,
            publishingEnabled: true,
            priority: 10
        }).monitor(monitoredItem);
    });

    const endpointUrl = server.getEndpointUrl();
    dns.lookup(require('os').hostname(), function (err, address, fam) {
        console.log('The IP address of the server is', address);
    });
});



function sendValueToProsysMonitor(value) {
    console.log("Sending value to Prosys Monitor:", value);
}

function generateTemperature() {
    const minTemperature = 600;
    const maxTemperature = 1000;

    let temperatureValue = parseFloat(Math.floor(Math.random() * (maxTemperature - minTemperature + 1)) + minTemperature);
    console.log('Valeur de température brute :', temperatureValue);

    if (isNaN(temperatureValue)) {
        console.error('Échec de la conversion de la température en Int32. Retour de la valeur par défaut.');
        return new opcua.Variant({ dataType: opcua.DataType.Int32, value: 0 });
    }

    const temperature = new opcua.Variant({ dataType: opcua.DataType.Int32, value: temperatureValue });
    console.log('Valeur de température :', temperatureValue);

    return temperature;
}

function convertToDouble(Signalvalue) {
    const temperatureValueRegex = /TemperatureValue=(\d+(\.\d+)?)/;
    const match = Signalvalue.match(temperatureValueRegex);

    if (match) {
        const temperature = parseFloat(match[1]);
        if (!isNaN(temperature)) {
            console.log('Temperature value finale:', temperature);
            return temperature;
        }
        console.error('Failed to convert Signal value to Double. Returning default value.');
        Console.log('Temperature value:', convertToDouble());
        return 0;
    }
}


server.start(function () {
    console.log('Le serveur OPC UA est opérationnel.');

    server.on('post_initialize', function () {
        const temperatureNode = addressSpace.addVariable({
            browseName: 'Temperature',
            dataType: 'Int32',
            value: {
                get: function () {
                    try {
                        const temperatureValue = generateTemperature();
        
                        if (typeof temperatureValue !== 'number') {
                            console.error('Failed to convert temperature to Int32. Returning default value.');
                            console.log('Temperature value:', temperatureValue);
                            return new opcua.Variant({ dataType: opcua.DataType.Int32, value: 0 });
                        }
        
                        const temperature = new opcua.Variant({ dataType: opcua.DataType.Int32, value: parseFloat(temperatureValue) });
        
                        console.log('Temperature value:', temperatureValue);
        
                        return temperature;
                    } catch (error) {
                        console.error('Failed to convert temperature to Int32. Returning default value.', error);
                        return new opcua.Variant({ dataType: opcua.DataType.Int32, value: 0 });
                    }
                },
            },
        });

        server.engine.addressSpace.addVariableNode(temperatureNode);
    });

    const endpointUrl = server.getEndpointUrl();
    console.log('Endpoint URL:', endpointUrl);
  console.log('Les Valeurs de température sont prêtes:',generateTemperature());
    console.log('Le générateur de température est prêt.');
});

const opcuaItem1 = {
    id: "opcuaItem1",
    type: "OpcUa-Item",
    item: "ns=0;s=Temperature", 
    datatype: "Int32",
    wires: [["output1"]]
};

console.log(opcuaItem1);

const hostname = 'DESKTOP-KHAFTHT';

dns.lookup(hostname, { family: 4 }, (err, address) => {
    if (err) {
        console.error(err);
        return;
    }

    console.log(`The IP address of ${hostname} is ${address}`);
});
