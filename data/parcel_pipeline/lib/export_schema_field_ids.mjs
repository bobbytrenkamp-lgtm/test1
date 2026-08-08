#!/usr/bin/env node
/* data/parcel_pipeline/lib/export_schema_field_ids.mjs — prints the 30
 * canonical field ids from js/parcel/schema.js as a JSON array on stdout.
 *
 * Exists so Python tooling (data/validate_parcel_catalog.py's
 * validate_shared_services()) can cross-check against the real, live
 * canonical field list without a second, hand-maintained copy of it —
 * the same "load the real file, don't duplicate the data" principle every
 * other pipeline script already follows, just crossing the Node/Python
 * boundary via a one-shot subprocess call instead of an import.
 *
 *   python3 -c "import subprocess, json; print(json.loads(subprocess.run(['node','data/parcel_pipeline/lib/export_schema_field_ids.mjs'], capture_output=True, text=True).stdout))"
 */
import { loadSchemaFieldIds } from './load_registry.mjs';

console.log(JSON.stringify(loadSchemaFieldIds()));
