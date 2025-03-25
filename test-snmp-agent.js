/**
 * Prueba del agente SNMP
 * Este script inicia el agente SNMP y luego hace una consulta SNMP para verificar que funciona
 */

const snmp = require('net-snmp');
const SNMPAgent = require('./src/utils/snmpAgent');

// Configurar un manejador para SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('Received SIGINT signal. Stopping SNMP agent...');
  SNMPAgent.stop();
  process.exit(0);
});

async function main () {
  try {
    // Iniciar el agente SNMP (escuchando en el puerto especificado)
    await SNMPAgent.start();
    console.log('SNMP agent started. Press Ctrl+C to stop.');

    // Esperar un momento para que el agente se inicie completamente
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Crear una sesión SNMP para probar la comunicación
    const session = snmp.createSession('127.0.0.1', 'public', {
      port: 8161, // Debe coincidir con el puerto configurado en el agente
      version: snmp.Version1
    });

    // Lista de OIDs a consultar
    // Para variables escalares debemos añadir '.0' al final del OID
    const oids = ['1.3.6.1.4.1.12345.1.1.1.0']; // OID de prueba con sufijo .0

    // Realizar una consulta SNMP GET
    console.log('Sending SNMP GET query...');
    session.get(oids, (error, varbinds) => {
      if (error) {
        console.error('SNMP GET error:', error);
      } else {
        // Procesar las respuestas
        varbinds.forEach((varbind) => {
          if (snmp.isVarbindError(varbind)) {
            console.error('SNMP varbind error:', snmp.varbindError(varbind));
          } else {
            console.log('OID: ' + varbind.oid + ' = ' + varbind.value);
          }
        });
      }

      // Cerrar la sesión SNMP
      session.close();
      console.log('SNMP GET query completed. The agent will continue running.');
      console.log('Press Ctrl+C to stop the SNMP agent.');
    });

  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Ejecutar el programa principal
main(); 