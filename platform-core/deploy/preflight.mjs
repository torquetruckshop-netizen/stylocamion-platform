import { inspectProductionConfig } from '../src/config.mjs';

const status = inspectProductionConfig(process.env);
if (status.ready) {
  console.log('Producción configurada: variables obligatorias presentes y formato básico válido.');
} else {
  if (status.missing.length) console.error(`Faltan variables: ${status.missing.join(', ')}`);
  if (status.invalid.length) console.error(`Variables con formato inválido: ${status.invalid.join(', ')}`);
  process.exitCode = 1;
}
