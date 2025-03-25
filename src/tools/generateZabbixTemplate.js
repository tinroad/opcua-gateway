#!/usr/bin/env node

/**
 * Script to generate a Zabbix template to monitor the SNMP metrics of the OPC UA Gateway
 */

const fs = require('fs');
const path = require('path');

// Process command line arguments to configure the SNMP version
function parseArguments () {
  const args = process.argv.slice(2);
  const options = {
    snmpVersion: 3,
    securityName: 'opcgwuser',
    securityLevel: 'authPriv',
    authProtocol: 'SHA256',
    privProtocol: 'AES128',
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--version':
      case '-v':
        options.snmpVersion = args[++i] || 3;
        break;
      case '--user':
      case '-u':
        options.securityName = args[++i] || 'opcgwuser';
        break;
      case '--level':
      case '-l':
        options.securityLevel = args[++i] || 'authPriv';
        break;
      case '--auth':
      case '-a':
        options.authProtocol = args[++i] || 'SHA256';
        break;
      case '--priv':
      case '-p':
        options.privProtocol = args[++i] || 'AES128';
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

// Show help
function showHelp () {
  console.log('Zabbix template generator for OPC UA Gateway');
  console.log('Usage: node generateZabbixTemplate.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  -v, --version <1|2c|3>       SNMP version (default: 3)');
  console.log('  -u, --user <name>            SNMPv3 user name (default: opcgwuser)');
  console.log('  -l, --level <level>          SNMPv3 security level: noAuthNoPriv, authNoPriv, authPriv (default: authPriv)');
  console.log('  -a, --auth <protocol>        Authentication protocol: MD5, SHA1, SHA256, etc. (default: SHA256)');
  console.log('  -p, --priv <protocol>        Privacy protocol: DES, AES128, AES256, etc. (default: AES128)');
  console.log('  -h, --help                   Show this help');
  console.log('');
  console.log('Example:');
  console.log('  node generateZabbixTemplate.js --version 3 --user zabbix --level authPriv --auth SHA256 --priv AES128');
  process.exit(0);
}

// Initialize options
const options = parseArguments();
if (options.help) {
  showHelp();
}

// Basic template information
const templateInfo = {
  name: 'OPC UA Gateway SNMP Template',
  version: '1.0',
  author: 'Diego Morales',
  description: 'Template to monitor the OPC UA Gateway via SNMP',
  // SNMP security configuration
  snmpSecurity: {
    version: options.snmpVersion, // 1, 2c o 3
    securityName: options.securityName,
    securityLevel: options.securityLevel, // noAuthNoPriv, authNoPriv, authPriv
    authProtocol: options.authProtocol, // MD5, SHA1, SHA224, SHA256, SHA384, SHA512
    authPassphrase: '', // Se debe configurar en Zabbix
    privProtocol: options.privProtocol, // DES, AES128, AES192, AES256, AES192C, AES256C
    privPassphrase: '', // Se debe configurar en Zabbix
  },
  oids: {
    // OPC UA Metrics
    '1.3.6.1.4.1.12345.1.1.1': {
      name: 'opcua.connections',
      description: 'OPC UA connections number',
      units: '',
      type: 'Numeric (unsigned)',
      application: 'OPC UA'
    },
    '1.3.6.1.4.1.12345.1.1.2': {
      name: 'opcua.errors',
      description: 'OPC UA errors number',
      units: '',
      type: 'Numeric (unsigned)',
      application: 'OPC UA'
    },
    '1.3.6.1.4.1.12345.1.1.3': {
      name: 'opcua.reconnects',
      description: 'OPC UA reconnections number',
      units: '',
      type: 'Numeric (unsigned)',
      application: 'OPC UA'
    },
    '1.3.6.1.4.1.12345.1.1.4': {
      name: 'opcua.requests',
      description: 'OPC UA requests number',
      units: '',
      type: 'Numeric (unsigned)',
      application: 'OPC UA'
    },
    '1.3.6.1.4.1.12345.1.1.5': {
      name: 'opcua.requests.errors',
      description: 'OPC UA requests errors number',
      units: '',
      type: 'Numeric (unsigned)',
      application: 'OPC UA'
    },
    '1.3.6.1.4.1.12345.1.1.6': {
      name: 'opcua.operations.read',
      description: 'OPC UA read operations number',
      units: '',
      type: 'Numeric (unsigned)',
      application: 'OPC UA'
    },
    '1.3.6.1.4.1.12345.1.1.7': {
      name: 'opcua.operations.write',
      description: 'OPC UA write operations number',
      units: '',
      type: 'Numeric (unsigned)',
      application: 'OPC UA'
    },
    '1.3.6.1.4.1.12345.1.1.8': {
      name: 'opcua.response.time.last',
      description: 'OPC UA last response time',
      units: 'ms',
      type: 'Numeric (float)',
      application: 'OPC UA'
    },
    '1.3.6.1.4.1.12345.1.1.9': {
      name: 'opcua.response.time.avg',
      description: 'OPC UA average response time',
      units: 'ms',
      type: 'Numeric (float)',
      application: 'OPC UA'
    },

    // HTTP Metrics
    '1.3.6.1.4.1.12345.1.2.1': {
      name: 'http.requests',
      description: 'HTTP requests number',
      units: '',
      type: 'Numeric (unsigned)',
      application: 'HTTP'
    },
    '1.3.6.1.4.1.12345.1.2.2': {
      name: 'http.errors',
      description: 'HTTP errors number',
      units: '',
      type: 'Numeric (unsigned)',
      application: 'HTTP'
    },
    '1.3.6.1.4.1.12345.1.2.3': {
      name: 'http.status.2xx',
      description: 'HTTP 2xx responses number',
      units: '',
      type: 'Numeric (unsigned)',
      application: 'HTTP'
    },
    '1.3.6.1.4.1.12345.1.2.4': {
      name: 'http.status.3xx',
      description: 'HTTP 3xx responses number',
      units: '',
      type: 'Numeric (unsigned)',
      application: 'HTTP'
    },
    '1.3.6.1.4.1.12345.1.2.5': {
      name: 'http.status.4xx',
      description: 'HTTP 4xx responses number',
      units: '',
      type: 'Numeric (unsigned)',
      application: 'HTTP'
    },
    '1.3.6.1.4.1.12345.1.2.6': {
      name: 'http.status.5xx',
      description: 'HTTP 5xx responses number',
      units: '',
      type: 'Numeric (unsigned)',
      application: 'HTTP'
    },
    '1.3.6.1.4.1.12345.1.2.7': {
      name: 'http.response.time.last',
      description: 'HTTP last response time',
      units: 'ms',
      type: 'Numeric (float)',
      application: 'HTTP'
    },
    '1.3.6.1.4.1.12345.1.2.8': {
      name: 'http.response.time.avg',
      description: 'HTTP average response time',
      units: 'ms',
      type: 'Numeric (float)',
      application: 'HTTP'
    },
    '1.3.6.1.4.1.12345.1.2.9': {
      name: 'http.ratelimit',
      description: 'HTTP rate limit number',
      units: '',
      type: 'Numeric (unsigned)',
      application: 'HTTP'
    },

    // System Metrics
    '1.3.6.1.4.1.12345.1.3.1': {
      name: 'system.cpu.usage',
      description: 'CPU usage',
      units: '%',
      type: 'Numeric (float)',
      application: 'System'
    },
    '1.3.6.1.4.1.12345.1.3.2': {
      name: 'system.memory.usage',
      description: 'Memory usage',
      units: '%',
      type: 'Numeric (float)',
      application: 'System'
    },
    '1.3.6.1.4.1.12345.1.3.3': {
      name: 'system.memory.total',
      description: 'Total memory',
      units: 'B',
      type: 'Numeric (unsigned)',
      application: 'System'
    },
    '1.3.6.1.4.1.12345.1.3.4': {
      name: 'system.memory.free',
      description: 'Free memory',
      units: 'B',
      type: 'Numeric (unsigned)',
      application: 'System'
    },
    '1.3.6.1.4.1.12345.1.3.5': {
      name: 'system.uptime',
      description: 'Server uptime',
      units: 's',
      type: 'Numeric (unsigned)',
      application: 'System'
    }
  }
};

// Function to generate the Zabbix XML
function generateZabbixXML () {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<zabbix_export>
  <version>5.0</version>
  <date>${new Date().toISOString()}</date>
  <templates>
    <template>
      <template>${templateInfo.name}</template>
      <name>${templateInfo.name}</name>
      <description>${templateInfo.description}</description>
      <groups>
        <group>
          <name>Templates/Applications</name>
        </group>
      </groups>
      <applications>
        <application>
          <name>OPC UA</name>
        </application>
        <application>
          <name>HTTP</name>
        </application>
        <application>
          <name>System</name>
        </application>
      </applications>
      <items>`;

  // Generate the items for each OID
  Object.entries(templateInfo.oids).forEach(([oid, item]) => {
    xml += `
        <item>
          <name>${item.description}</name>
          <type>SNMP_AGENT</type>
          <snmp_oid>${oid}</snmp_oid>
          <key>${item.name}</key>
          <delay>60s</delay>
          <history>90d</history>
          <trends>365d</trends>
          <status>ENABLED</status>
          <value_type>FLOAT</value_type>
          <units>${item.units}`;

    // If SNMPv1 or SNMPv2c, include community
    if (templateInfo.snmpSecurity.version == 1 || templateInfo.snmpSecurity.version == '2c') {
      xml += `
          <snmp_community>{$SNMP_COMMUNITY}</snmp_community>`;
    }

    xml += `
          <applications>
            <application>
              <name>${item.application}</name>
            </application>
          </applications>`;

    // Add SNMPv3 configuration if version 3 is used
    if (templateInfo.snmpSecurity.version == 3) {
      xml += `
          <snmpv3_contextname></snmpv3_contextname>
          <snmpv3_securityname>${templateInfo.snmpSecurity.securityName}</snmpv3_securityname>
          <snmpv3_securitylevel>${templateInfo.snmpSecurity.securityLevel}</snmpv3_securitylevel>
          <snmpv3_authprotocol>${templateInfo.snmpSecurity.authProtocol}</snmpv3_authprotocol>
          <snmpv3_authpassphrase>{$SNMP_AUTH_PASSPHRASE}</snmpv3_authpassphrase>
          <snmpv3_privprotocol>${templateInfo.snmpSecurity.privProtocol}</snmpv3_privprotocol>
          <snmpv3_privpassphrase>{$SNMP_PRIV_PASSPHRASE}</snmpv3_privpassphrase>`;
    }

    xml += `
        </item>`;
  });

  xml += `
      </items>
      <discovery_rules/>
      <httptests/>
      <macros>`;

  // Include macros according to the SNMP version
  if (templateInfo.snmpSecurity.version == 1 || templateInfo.snmpSecurity.version == '2c') {
    xml += `
        <macro>
          <macro>{$SNMP_COMMUNITY}</macro>
          <value>public</value>
          <description>SNMP community for SNMPv${templateInfo.snmpSecurity.version}</description>
        </macro>`;
  }

  if (templateInfo.snmpSecurity.version == 3) {
    xml += `
        <macro>
          <macro>{$SNMP_AUTH_PASSPHRASE}</macro>
          <value></value>
          <description>Authentication password for SNMPv3</description>
        </macro>
        <macro>
          <macro>{$SNMP_PRIV_PASSPHRASE}</macro>
          <value></value>
          <description>Privacy password for SNMPv3</description>
        </macro>`;
  }

  xml += `
      </macros>
      <templates/>
      <triggers>
        <trigger>
          <expression>{${templateInfo.name}:system.cpu.usage.last()}&gt;90</expression>
          <name>CPU usage is too high</name>
          <priority>WARNING</priority>
          <description>CPU usage is above 90% for more than 5 minutes</description>
        </trigger>
        <trigger>
          <expression>{${templateInfo.name}:system.memory.usage.last()}&gt;90</expression>
          <name>Memory usage is too high</name>
          <priority>WARNING</priority>
          <description>Memory usage is above 90%</description>
        </trigger>
        <trigger>
          <expression>{${templateInfo.name}:opcua.connections.last()}=0</expression>
          <name>No OPC UA connections</name>
          <priority>HIGH</priority>
          <description>No active OPC UA connections</description>
        </trigger>
        <trigger>
          <expression>{${templateInfo.name}:opcua.errors.diff()}&gt;10</expression>
          <name>High rate of OPC UA errors</name>
          <priority>AVERAGE</priority>
          <description>High rate of OPC UA errors</description>
        </trigger>
        <trigger>
          <expression>{${templateInfo.name}:http.status.5xx.diff()}&gt;10</expression>
          <name>High rate of HTTP 5xx errors</name>
          <priority>AVERAGE</priority>
          <description>High rate of HTTP 5xx errors</description>
        </trigger>
      </triggers>
    </template>
  </templates>
  <graphs>
    <graph>
      <name>OPC UA Statistics</name>
      <graph_items>
        <graph_item>
          <color>1A7C11</color>
          <item>
            <host>${templateInfo.name}</host>
            <key>opcua.requests</key>
          </item>
        </graph_item>
        <graph_item>
          <color>F63100</color>
          <item>
            <host>${templateInfo.name}</host>
            <key>opcua.errors</key>
          </item>
        </graph_item>
        <graph_item>
          <color>2774A4</color>
          <item>
            <host>${templateInfo.name}</host>
            <key>opcua.connections</key>
          </item>
        </graph_item>
      </graph_items>
    </graph>
    <graph>
      <name>HTTP Statistics</name>
      <graph_items>
        <graph_item>
          <color>1A7C11</color>
          <item>
            <host>${templateInfo.name}</host>
            <key>http.requests</key>
          </item>
        </graph_item>
        <graph_item>
          <color>F63100</color>
          <item>
            <host>${templateInfo.name}</host>
            <key>http.errors</key>
          </item>
        </graph_item>
        <graph_item>
          <color>2774A4</color>
          <item>
            <host>${templateInfo.name}</host>
            <key>http.status.2xx</key>
          </item>
        </graph_item>
      </graph_items>
    </graph>
    <graph>
      <name>System Resources</name>
      <graph_items>
        <graph_item>
          <color>1A7C11</color>
          <item>
            <host>${templateInfo.name}</host>
            <key>system.cpu.usage</key>
          </item>
        </graph_item>
        <graph_item>
          <color>F63100</color>
          <item>
            <host>${templateInfo.name}</host>
            <key>system.memory.usage</key>
          </item>
        </graph_item>
      </graph_items>
    </graph>
  </graphs>
</zabbix_export>
`;

  return xml;
}

// Create the directory if it doesn't exist
const toolsDir = path.join(__dirname, '../../tools');
if (!fs.existsSync(toolsDir)) {
  fs.mkdirSync(toolsDir, { recursive: true });
}

// Write the XML file
const outputFile = path.join(toolsDir, 'zabbix_template.xml');
fs.writeFileSync(outputFile, generateZabbixXML());

console.log(`Zabbix template generated in: ${outputFile}`);
console.log(`This template contains ${Object.keys(templateInfo.oids).length} SNMP items to monitor the OPC UA gateway.`);
console.log('Importation instructions:');
console.log('1. Access your Zabbix server');
console.log('2. Go to Configuration > Templates');
console.log('3. Click on Import');
console.log('4. Select the generated XML file');
console.log('5. Click on Import to complete the process');

// Add information about the configured SNMP security
if (templateInfo.snmpSecurity.version === 3) {
  console.log('\nSNMP security information:');
  console.log('- Version: SNMPv3');
  console.log(`- Security level: ${templateInfo.snmpSecurity.securityLevel}`);
  console.log(`- Security name: ${templateInfo.snmpSecurity.securityName}`);
  console.log(`- Authentication protocol: ${templateInfo.snmpSecurity.authProtocol}`);
  console.log(`- Privacy protocol: ${templateInfo.snmpSecurity.privProtocol}`);
  console.log('\nIMPORTANT:');
  console.log('You must configure the following macros in Zabbix after importing the template:');
  console.log('- {$SNMP_AUTH_PASSPHRASE}: Authentication password');
  console.log('- {$SNMP_PRIV_PASSPHRASE}: Privacy password');
  console.log('\nTo configure the SNMP agent on the gateway:');
  console.log('1. Install an SNMP agent that supports SNMPv3 (net-snmp, snmpd, etc.)');
  console.log('2. Configure a user with the same credentials as defined in Zabbix');
  console.log('3. Enable the corresponding authentication and privacy protocols');
  console.log('4. Ensure that the SNMP agent has access to the OPC UA gateway metrics');
} else {
  console.log('\nSNMP security information:');
  console.log(`- Version: SNMPv${templateInfo.snmpSecurity.version}`);
  console.log('- Community: {$SNMP_COMMUNITY} (default: public)');
  console.log('\nNOTE: It is recommended to use SNMPv3 in production environments for greater security');
  console.log('To change to SNMPv3, modify the "version" property in templateInfo.snmpSecurity');
}